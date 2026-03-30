import { getNotices } from '@/lib/data';
import { InboxClient } from '@/components/inbox/inbox-client';
import { isDemoModeEnabled } from '@/lib/demo-session';
import { requireAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const demoMode = await isDemoModeEnabled();
  if (!demoMode) {
    await requireAdminSession();
  }
  // Fetch notices for the inbox queue
  const notices = await getNotices({ status: ['New', 'Ready', 'Review'] });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Inbox Queue
        </h1>
      </div>
      <InboxClient notices={notices} demoMode={demoMode} />
    </div>
  );
}
