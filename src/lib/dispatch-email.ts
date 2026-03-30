import 'server-only';

import { attachmentHasStoredContent, isPdfAttachment, type Attachment, type StrataNotice } from '@/lib/definitions';
import { readStoredAttachmentContent } from '@/lib/notice-attachments';

type DispatchRecipient = {
  id: string;
  name: string;
  email: string;
};

type DispatchEmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

function getDispatchCredentials() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      'Gmail dispatch is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD before dispatching notices.'
    );
  }

  return { user, pass };
}

function dedupeRecipients(recipients: DispatchRecipient[]): DispatchRecipient[] {
  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const normalizedEmail = recipient.email.trim().toLowerCase();
    if (!normalizedEmail || seen.has(normalizedEmail)) {
      return false;
    }

    seen.add(normalizedEmail);
    return true;
  });
}

async function buildPdfAttachments(attachments: Attachment[]): Promise<DispatchEmailAttachment[]> {
  const pdfAttachments = attachments.filter(isPdfAttachment);
  const missingPdfNames = pdfAttachments
    .filter((attachment) => !attachmentHasStoredContent(attachment))
    .map((attachment) => attachment.filename);

  if (missingPdfNames.length > 0) {
    throw new Error(
      `PDF attachments were detected but their file content is missing: ${missingPdfNames.join(', ')}. Re-sync the notice so the PDFs can be fetched before dispatch.`
    );
  }

  return Promise.all(
    pdfAttachments.map(async (attachment) => {
      const content = await readStoredAttachmentContent(attachment);

      if (!content) {
        throw new Error(`Failed to load PDF attachment "${attachment.filename}" for dispatch.`);
      }

      return {
        filename: attachment.filename,
        content,
        contentType: attachment.contentType || 'application/pdf',
      };
    })
  );
}

export async function sendDispatchEmail(notice: StrataNotice, recipients: DispatchRecipient[]): Promise<number> {
  const normalizedRecipients = dedupeRecipients(recipients);

  if (normalizedRecipients.length === 0) {
    throw new Error('No valid recipient email addresses were provided for dispatch.');
  }

  if (!notice.ownerMessage?.trim()) {
    throw new Error('Cannot dispatch a notice without an owner message. Run AI triage first.');
  }

  const { user, pass } = getDispatchCredentials();
  const attachments = await buildPdfAttachments(notice.attachments);
  const nodemailerModule = await import('nodemailer');
  const nodemailer = ('default' in nodemailerModule ? nodemailerModule.default : nodemailerModule) as {
    createTransport: (config: Record<string, unknown>) => {
      sendMail: (mail: Record<string, unknown>) => Promise<unknown>;
    };
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: user,
    to: user,
    bcc: normalizedRecipients.map((recipient) => recipient.email),
    subject: notice.subject || 'Strata Notice',
    text: notice.ownerMessage,
    attachments,
  });

  return normalizedRecipients.length;
}
