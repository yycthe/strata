'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { summarizeAndCategorizeNotice } from '@/ai/flows/summarize-and-categorize-notice-flow';
import { generateOwnerMessage } from '@/ai/flows/generate-owner-message-flow';
import { attachmentHasStoredContent, isPdfAttachment, type SyncResult } from './definitions';
import { persistParsedAttachment } from './notice-attachments';
import { extractStrataPlanCodes } from './strata-identifiers';
import {
  createStoredNotice,
  createStoredSyncLog,
  deleteStoredNotice,
  deleteStoredNotices,
  getStoredNoticeById,
  updateStoredNotice,
} from './server-store';
import { sendDispatchEmail } from './dispatch-email';

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

// --- GMAIL SYNC ACTION ---

const syncGmailSchema = z.object({
  daysBack: z.number().min(1).max(90),
});

const dispatchRecipientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
});

const dispatchRecipientsSchema = z.array(dispatchRecipientSchema).min(1);

export async function syncGmail(
  prevState: SyncResult | undefined,
  formData: FormData
): Promise<SyncResult> {

  // Validate environment variables first
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return {
      status: 'error',
      message: 'Gmail credentials are not configured in the environment variables. Please add GMAIL_USER and GMAIL_APP_PASSWORD.',
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
        
        const noticeId = String(message.uid);
        const existingNotice = await getStoredNoticeById(noticeId);
        const needsPdfBackfill = Boolean(
          existingNotice?.attachments.some(
            (attachment) => isPdfAttachment(attachment) && !attachmentHasStoredContent(attachment)
          )
        );

        if (existingNotice && !needsPdfBackfill) {
          stats.skipped++;
          continue;
        }

        const parsed = await simpleParser(message.source);
        const cleanedContent = cleanText(parsed.text || '');
        const searchText = `${parsed.subject || ''}\n${parsed.from?.text || ''}\n${cleanedContent}`;
        
        const planCodes = extractStrataPlanCodes(searchText);

        if (planCodes.length > 0) {
          stats.matched++;
          
          const attachments = await Promise.all(
            parsed.attachments.map((attachment) =>
              persistParsedAttachment(noticeId, {
                cid: attachment.cid,
                checksum: attachment.checksum,
                filename: attachment.filename,
                contentType: attachment.contentType,
                size: attachment.size,
                content: attachment.content,
              })
            )
          );

          if (existingNotice) {
            await updateStoredNotice(noticeId, { attachments });
            stats.skipped++;
            continue;
          }

          await createStoredNotice(noticeId, {
            subject: parsed.subject || 'No Subject',
            sender: parsed.from?.text || 'Unknown Sender',
            receivedAt: (parsed.date || new Date()).toISOString(),
            content: parsed.text || '',
            status: 'New',
            planCode: planCodes[0] ?? null,
            allPlanCodes: planCodes,
            aiSummary: null,
            audience: null,
            attachments,
            assignedOwnerId: null,
            assignedOwnerIds: null,
            ownerMessage: null,
          });
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
    try {
      await client.logout();
    } catch (logoutError) {
      console.warn('Gmail logout failed:', logoutError);
    }

    await createStoredSyncLog({
      timestamp: logInfo.timestamp,
      window: logInfo.window,
      status: logInfo.status,
      found: stats.found,
      inserted: stats.inserted,
      skipped: stats.skipped,
      matched: stats.matched,
      error: logInfo.error,
    });
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
    throw new Error('Gemini API key is not configured in the environment variables.');
  }

  try {
    const { summary, audience } = await summarizeAndCategorizeNotice({ content });

    // Also generate the owner message from the summary
    const ownerMessage = await generateOwnerMessage(summary);

    await updateStoredNotice(noticeId, {
      aiSummary: summary,
      audience,
      ownerMessage,
      status: 'Ready',
    });

    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    return { success: true, message: 'AI Triage completed successfully.' };
  } catch (err: any) {
    console.error('AI Triage failed:', err);
    // Optionally update status to 'Review' on failure
    await updateStoredNotice(noticeId, { status: 'Review' });
    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    throw new Error(`AI Triage failed: ${err.message}`);
  }
}


// --- NOTICE ACTIONS ---

export async function deleteNotices(ids: string[]) {
  if (ids.length === 0) return;
  await deleteStoredNotices(ids);
  revalidatePath('/inbox');
  revalidatePath('/history');
}

export async function deleteSingleNotice(id: string) {
  await deleteStoredNotice(id);
  revalidatePath('/inbox');
  revalidatePath('/history');
  redirect('/inbox');
}

export async function markNoticeAsIgnored(id: string) {
  await updateStoredNotice(id, { status: 'Ignored' });
  revalidatePath('/inbox');
  revalidatePath(`/inbox/${id}`);
}

export async function dispatchNotice(
  noticeId: string,
  recipient: { id: string; name: string; email: string }
) {
    return dispatchGroupNotice(noticeId, [recipient]);
}

export async function dispatchGroupNotice(
  noticeId: string,
  recipientsInput: Array<{ id: string; name: string; email: string }>
) {
    const recipients = dispatchRecipientsSchema.parse(recipientsInput);
    const notice = await getStoredNoticeById(noticeId);

    if (!notice) {
      throw new Error('Notice not found.');
    }

    await sendDispatchEmail(notice, recipients);

    const ownerIds = recipients.map((recipient) => recipient.id);
    await updateStoredNotice(noticeId, {
      status: 'Dispatched',
      assignedOwnerId: ownerIds.length === 1 ? ownerIds[0] : null,
      assignedOwnerIds: ownerIds.length === 1 ? null : ownerIds,
    });
    revalidatePath('/inbox');
    revalidatePath(`/inbox/${noticeId}`);
    revalidatePath('/history');

    return {
      success: true,
      recipients: recipients.length,
      pdfAttachments: notice.attachments.filter((attachment) => attachment.isPdf).length,
    };
}
