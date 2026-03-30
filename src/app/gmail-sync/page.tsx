import { getSyncLogs } from '@/lib/data';
import { GmailSyncClient } from '@/components/gmail-sync/gmail-sync-client';

export const dynamic = 'force-dynamic';

export default async function GmailSyncPage() {
  const logs = await getSyncLogs();
  return <GmailSyncClient logs={logs} />;
}
