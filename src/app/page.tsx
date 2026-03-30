import { getDashboardStats } from '@/lib/data';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const initialStats = await getDashboardStats();

  return <DashboardClient initialStats={initialStats} />;
}
