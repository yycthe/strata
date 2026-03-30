import 'server-only';

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { getAdminStorageBucket, hasFirebaseAdminConfig } from '@/lib/firebase-admin';
import { type Attachment, isPdfAttachment } from '@/lib/definitions';

type ParsedNoticeAttachment = {
  cid?: string | null;
  checksum?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  content?: Buffer | null;
};

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function buildAttachmentFilename(parsedAttachment: ParsedNoticeAttachment, isPdf: boolean): string {
  const fallback = isPdf ? 'attachment.pdf' : 'attachment.bin';
  const filename = parsedAttachment.filename?.trim();
  return filename ? filename : fallback;
}

function buildAttachmentId(parsedAttachment: ParsedNoticeAttachment): string {
  return parsedAttachment.cid || parsedAttachment.checksum || randomUUID();
}

async function persistAttachmentToFirebaseStorage(
  noticeId: string,
  attachmentId: string,
  filename: string,
  contentType: string,
  content: Buffer
): Promise<string> {
  const objectPath = `notice-attachments/${sanitizePathSegment(noticeId)}/${sanitizePathSegment(attachmentId)}-${sanitizePathSegment(filename)}`;

  await getAdminStorageBucket().file(objectPath).save(content, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: 'private, max-age=31536000, immutable',
      contentDisposition: `inline; filename="${filename}"`,
    },
  });

  return objectPath;
}

async function persistAttachmentLocally(
  noticeId: string,
  attachmentId: string,
  filename: string,
  content: Buffer
): Promise<string> {
  const relativePath = path.join(
    '.attachment-cache',
    'notices',
    sanitizePathSegment(noticeId),
    `${sanitizePathSegment(attachmentId)}-${sanitizePathSegment(filename)}`
  );
  const absolutePath = path.join(process.cwd(), relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content);

  return relativePath;
}

export async function persistParsedAttachment(
  noticeId: string,
  parsedAttachment: ParsedNoticeAttachment
): Promise<Attachment> {
  const contentType = parsedAttachment.contentType || 'application/octet-stream';
  const attachmentId = buildAttachmentId(parsedAttachment);
  const filename = buildAttachmentFilename(parsedAttachment, contentType === 'application/pdf');
  const attachment: Attachment = {
    id: attachmentId,
    filename,
    contentType,
    size: parsedAttachment.size ?? parsedAttachment.content?.byteLength ?? 0,
    isPdf: isPdfAttachment({
      filename,
      contentType,
      isPdf: contentType === 'application/pdf',
    }),
    storagePath: null,
    localPath: null,
  };

  if (!attachment.isPdf || !parsedAttachment.content) {
    return attachment;
  }

  if (hasFirebaseAdminConfig()) {
    attachment.storagePath = await persistAttachmentToFirebaseStorage(
      noticeId,
      attachmentId,
      filename,
      contentType,
      parsedAttachment.content
    );
    return attachment;
  }

  attachment.localPath = await persistAttachmentLocally(
    noticeId,
    attachmentId,
    filename,
    parsedAttachment.content
  );

  return attachment;
}

export async function readStoredAttachmentContent(attachment: Attachment): Promise<Buffer | null> {
  if (attachment.storagePath) {
    const [content] = await getAdminStorageBucket().file(attachment.storagePath).download();
    return content;
  }

  if (attachment.localPath) {
    const absolutePath = path.isAbsolute(attachment.localPath)
      ? attachment.localPath
      : path.join(process.cwd(), attachment.localPath);
    return fs.readFile(absolutePath);
  }

  return null;
}

export async function deleteStoredAttachmentContent(attachment: Attachment): Promise<void> {
  if (attachment.storagePath) {
    await getAdminStorageBucket().file(attachment.storagePath).delete({ ignoreNotFound: true });
    return;
  }

  if (attachment.localPath) {
    const absolutePath = path.isAbsolute(attachment.localPath)
      ? attachment.localPath
      : path.join(process.cwd(), attachment.localPath);
    await fs.rm(absolutePath, { force: true });
  }
}

export async function deleteStoredAttachmentContents(attachments: Attachment[]): Promise<void> {
  await Promise.all(attachments.map(deleteStoredAttachmentContent));
}
