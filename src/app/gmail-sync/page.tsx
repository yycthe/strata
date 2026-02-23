import { getSyncLogs } from '@/lib/data';
import { GmailSyncClient } from '@/components/gmail-sync/gmail-sync-client';

export default async function GmailSyncPage() {
  const logs = await getSyncLogs();
  return <GmailSyncClient logs={logs} />;
}
