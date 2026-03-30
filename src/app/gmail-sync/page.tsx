import { getSyncLogs } from '@/lib/data';
import { GmailSyncClient } from '@/components/gmail-sync/gmail-sync-client';
import { isDemoModeEnabled } from '@/lib/demo-session';
import { requireAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function GmailSyncPage() {
  const demoMode = await isDemoModeEnabled();
  if (!demoMode) {
    await requireAdminSession();
  }
  const logs = await getSyncLogs();

  return <GmailSyncClient logs={logs} demoMode={demoMode} />;
}
