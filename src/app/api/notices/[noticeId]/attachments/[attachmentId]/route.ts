import { NextRequest, NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { attachmentHasStoredContent, isPdfAttachment } from '@/lib/definitions';
import { readStoredAttachmentContent } from '@/lib/notice-attachments';
import { getStoredNoticeById } from '@/lib/server-store';

export const dynamic = 'force-dynamic';

function sanitizeFilename(filename: string): string {
  return filename.replace(/["\r\n]+/g, '_');
}

export async function GET(
  request: NextRequest,
  context: {
    params:
      | Promise<{ noticeId: string; attachmentId: string }>
      | { noticeId: string; attachmentId: string };
  }
) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const { noticeId, attachmentId } = await Promise.resolve(context.params);
  const notice = await getStoredNoticeById(noticeId);

  if (!notice) {
    return NextResponse.json({ error: 'Notice not found.' }, { status: 404 });
  }

  const attachment = notice.attachments.find((item) => item.id === attachmentId);

  if (!attachment || !isPdfAttachment(attachment)) {
    return NextResponse.json({ error: 'PDF attachment not found.' }, { status: 404 });
  }

  if (!attachmentHasStoredContent(attachment)) {
    return NextResponse.json(
      { error: 'PDF content is unavailable for this notice. Re-sync the email to fetch the file.' },
      { status: 409 }
    );
  }

  const content = await readStoredAttachmentContent(attachment);

  if (!content) {
    return NextResponse.json({ error: 'Failed to load PDF content.' }, { status: 500 });
  }

  const download = request.nextUrl.searchParams.get('download') === '1';

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': attachment.contentType || 'application/pdf',
      'Content-Length': String(content.byteLength),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${sanitizeFilename(attachment.filename)}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
