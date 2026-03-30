import { getSyncLogs } from '@/lib/data';
import { GmailSyncClient } from '@/components/gmail-sync/gmail-sync-client';
import { isDemoModeEnabled } from '@/lib/demo-session';
import { requireAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function GmailSyncPage() {
  await requireAdminSession();
  const logs = await getSyncLogs();
  const demoMode = await isDemoModeEnabled();

  return <GmailSyncClient logs={logs} demoMode={demoMode} />;
}
