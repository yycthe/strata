import { getNoticeById } from '@/lib/data';
import { NoticeDetailClient } from '@/components/inbox/notice-detail-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function NoticeDetailPage({ params }: { params: { noticeId: string } }) {
  const notice = await getNoticeById(params.noticeId);

  if (!notice) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/inbox">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Link>
        </Button>
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Notice Details
        </h1>
      </div>
      <NoticeDetailClient notice={notice} />
    </div>
  );
}