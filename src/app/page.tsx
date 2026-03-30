import { getDashboardStats } from '@/lib/data';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { isDemoModeEnabled } from '@/lib/demo-session';
import { requireAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  await requireAdminSession();
  const initialStats = await getDashboardStats();
  const demoMode = await isDemoModeEnabled();

  return <DashboardClient initialStats={initialStats} demoMode={demoMode} />;
}
