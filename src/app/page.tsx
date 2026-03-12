import { getLastSyncStatus, getNoticesCount } from '@/lib/data';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function OverviewPage() {
  const [pending, ready, dispatched, sync] = await Promise.all([
    getNoticesCount(['New', 'Review']),
    getNoticesCount(['Ready']),
    getNoticesCount(['Dispatched']),
    getLastSyncStatus(),
  ]);

  const initialStats = { pending, ready, dispatched, sync };

  return <DashboardClient initialStats={initialStats} />;
}
