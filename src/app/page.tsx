import { getDashboardStats } from '@/lib/data';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { isDemoModeEnabled } from '@/lib/demo-session';
import { requireAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const demoMode = await isDemoModeEnabled();
  if (!demoMode) {
    await requireAdminSession();
  }
  const initialStats = await getDashboardStats();

  return <DashboardClient initialStats={initialStats} demoMode={demoMode} />;
}
