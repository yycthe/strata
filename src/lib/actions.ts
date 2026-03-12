'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import db from './db';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { summarizeAndCategorizeNotice } from '@/ai/flows/summarize-and-categorize-notice-flow';
import { generateOwnerMessage } from '@/ai/flows/generate-owner-message-flow';
import type { SyncResult } from './definitions';

// A helper to safely parse JSON from the database.
function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return defaultValue;
  }
}

// --- Text Cleaning and Matching ---

function cleanText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  // Decode entities
  cleaned = cleaned.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Remove long base64-like strings
  cleaned = cleaned.replace(/[a-zA-Z0-9\/\+]{50,}=*/g, '');
  // Remove %XX encoded parts
  cleaned = cleaned.replace(/%[0-9A-F]{2}/g, '');
  // Remove non-ASCII characters
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, ' ');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

const strataPlanRegex = /(EPS|BCS|LMS|VR|VAS)\s*-?\s*(\d{2,6})/gi;

function matchStrataPlans(text: string): string[] {
  const matches = text.matchAll(strataPlanRegex);
  const codes = new Set<string>();
  for (const match of matches) {
    codes.add(`${match[1].toUpperCase()}${match[2]}`);
  }
  return Array.from(codes);
}


// --- GMAIL SYNC ACTION ---

const syncGmailSchema = z.object({
  daysBack: z.number().min(1).max(90),
});

export async function syncGmail(
  prevState: SyncResult | undefined,
  formData: FormData
): Promise<SyncResult> {

  // Validate environment variables first
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return {
      status: 'error',
      message: 'Gmail credentials are not configured in the .env file. Please add GMAIL_USER and GMAIL_APP_PASSWORD.',
    };
  }

  const validatedFields = syncGmailSchema.safeParse({
    daysBack: Number(formData.get('daysBack')),
  });

  if (!validatedFields.success) {
    return {
      status: 'error',
      message: 'Invalid input. Days back must be between 1 and 90.',
    };
  }

  const { daysBack } = validatedFields.data;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false, // Set to true for detailed IMAP logs
  });

  const stats = { found: 0, matched: 0, inserted: 0, skipped: 0 };
  const logInfo = {
    timestamp: new Date().toISOString(),
    window: daysBack,
    status: 'success' as 'success' | 'fail',
    error: null as string | null,
  };

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');

    try {
      const messages = client.fetch({ since }, { envelope: true, source: true, uid: true });
      for await (let message of messages) {
        stats.found++;
        
        const existingNotice = db.prepare('SELECT id FROM notices WHERE id = ?').get(message.uid);
        if (existingNotice) {
          stats.skipped++;
          continue;
        }

        const parsed = await simpleParser(message.source);
        const cleanedContent = cleanText(parsed.text || '');
        const searchText = `${parsed.subject || ''}\n${parsed.from?.text || ''}\n${cleanedContent}`;
        
        const planCodes = matchStrataPlans(searchText);

        if (planCodes.length > 0) {
          stats.matched++;
          
          const attachments = parsed.attachments.map(att => ({
            id: att.cid || att.checksum,
            filename: att.filename || 'untitled',
            contentType: att.contentType,
            size: att.size,
          }));

          db.prepare(
            `INSERT INTO notices (id, subject, sender, receivedAt, content, allPlanCodes, planCode, attachments, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New')`
          ).run(
            message.uid,
            parsed.subject || 'No Subject',
            parsed.from?.text || 'Unknown Sender',
            (parsed.date || new Date()).toISOString(),
            parsed.text, // Store original text for viewing
            JSON.stringify(planCodes),
            planCodes[0],
            JSON.stringify(attachments)
          );
          stats.inserted++;
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('Gmail sync failed:', err);
    logInfo.status = 'fail';
    logInfo.error = err.message;
    return {
      status: 'error',
      message: `Sync failed: ${err.message}`,
    };
  } finally {
    await client.logout();
    db.prepare(
        'INSERT INTO sync_logs (timestamp, window, status, found, inserted, skipped, matched, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(logInfo.timestamp, logInfo.window, logInfo.status, stats.found, stats.inserted, stats.skipped, stats.matched, logInfo.error);
    revalidatePath('/gmail-sync');
    revalidatePath('/');
  }

  revalidatePath('/inbox');
  return {
    status: 'success',
    message: `Sync complete. Found: ${stats.found}, Matched: ${stats.matched}, Inserted: ${stats.inserted}.`,
    stats,
  };
}


// --- AI ACTIONS ---

export async function runAiTriage(noticeId: string, content: string) {
  if (!content) {
    throw new Error('Notice content is empty, cannot run AI triage.');
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured in the .env file.');
  }

  try {
    const result = await summarizeAndCategorizeNotice({ content });
    
    db.prepare(
      `UPDATE notices SET aiSummary = ?, audience = ?, status = 'Ready' WHERE id = ?`
    ).run(JSON.stringify(result.summary), JSON.stringify(result.audience), noticeId);

    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    return { success: true, message: 'AI Triage completed successfully.' };
  } catch (err: any) {
    console.error('AI Triage failed:', err);
    // Optionally update status to 'Review' on failure
    db.prepare(`UPDATE notices SET status = 'Review' WHERE id = ?`).run(noticeId);
    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    throw new Error(`AI Triage failed: ${err.message}`);
  }
}

export async function generateAndSaveOwnerMessage(noticeId: string) {
  const notice = db.prepare('SELECT id, aiSummary FROM notices WHERE id = ?').get(noticeId) as { id: string, aiSummary: string };

  if (!notice) {
    throw new Error('Notice not found.');
  }

  const summary = safeJsonParse(notice.aiSummary, null);

  if (!summary) {
    throw new Error('AI Summary is not available for this notice. Cannot generate message.');
  }
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured in the .env file.');
  }

  try {
    const message = await generateOwnerMessage(summary);

    db.prepare('UPDATE notices SET ownerMessage = ? WHERE id = ?').run(message, noticeId);

    revalidatePath(`/inbox/${noticeId}`);
    return { success: true, message };

  } catch (err: any) {
    console.error('Owner message generation failed:', err);
    throw new Error(`Failed to generate owner message: ${err.message}`);
  }
}


// --- NOTICE ACTIONS ---

export async function deleteNotices(ids: string[]) {
  if (ids.length === 0) return;
  const stmt = db.prepare('DELETE FROM notices WHERE id = ?');
  const transact = db.transaction((idList) => {
    for (const id of idList) stmt.run(id);
  });
  transact(ids);
  revalidatePath('/inbox');
  revalidatePath('/history');
}

export async function deleteSingleNotice(id: string) {
  db.prepare('DELETE FROM notices WHERE id = ?').run(id);
  revalidatePath('/inbox');
  revalidatePath('/history');
  redirect('/inbox');
}

export async function markNoticeAsIgnored(id: string) {
  db.prepare(`UPDATE notices SET status = 'Ignored' WHERE id = ?`).run(id);
  revalidatePath('/inbox');
  revalidatePath(`/inbox/${id}`);
}

export async function dispatchNotice(noticeId: string, ownerId: string) {
    db.prepare(`UPDATE notices SET status = 'Dispatched', assignedOwnerId = ? WHERE id = ?`).run(ownerId, noticeId);
    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    revalidatePath('/history');
}

export async function dispatchGroupNotice(noticeId: string, ownerIds: string[]) {
    db.prepare(`UPDATE notices SET status = 'Dispatched', assignedOwnerIds = ? WHERE id = ?`).run(JSON.stringify(ownerIds), noticeId);
    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    revalidatePath('/history');
}
