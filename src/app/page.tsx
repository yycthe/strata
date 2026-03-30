import { getDashboardStats } from '@/lib/data';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { isDemoModeEnabled } from '@/lib/demo-session';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const initialStats = await getDashboardStats();
  const demoMode = await isDemoModeEnabled();

  return <DashboardClient initialStats={initialStats} demoMode={demoMode} />;
}
