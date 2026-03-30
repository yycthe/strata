import { getSyncLogs } from '@/lib/data';
import { GmailSyncClient } from '@/components/gmail-sync/gmail-sync-client';
import { isDemoModeEnabled } from '@/lib/demo-session';

export const dynamic = 'force-dynamic';

export default async function GmailSyncPage() {
  const logs = await getSyncLogs();
  const demoMode = await isDemoModeEnabled();

  return <GmailSyncClient logs={logs} demoMode={demoMode} />;
}
