'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { syncGmail } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { SyncResult, SyncLog } from '@/lib/definitions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const initialState: SyncResult = {
  status: 'success',
  message: 'Ready to sync.',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Syncing...' : 'Start Sync'}
    </Button>
  );
}

function SyncForm() {
  const [state, formAction] = useActionState(syncGmail, initialState);

  return (
    <Card>
      <form action={formAction}>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Sync strata notices from your Gmail account. Specify how many days back to search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="daysBack">Days to Sync</Label>
            <Input type="number" id="daysBack" name="daysBack" defaultValue="7" min="1" max="90" required />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <SubmitButton />
          {state?.message && (
            <Alert variant={state.status === 'error' ? 'destructive' : 'default'}>
              <Terminal className="h-4 w-4" />
              <AlertTitle>{state.status === 'error' ? 'Error' : 'Sync Status'}</AlertTitle>
              <AlertDescription>
                {state.message}
                {state.stats && (
                  <div className="mt-2 text-xs">
                    <p>Emails scanned: {state.stats.found}</p>
                    <p>With strata number: {state.stats.matched}</p>
                    <p>New notices added: {state.stats.inserted}</p>
                    <p>Already existed or PDF-only backfill: {state.stats.skipped}</p>
                    <p>No strata number: {state.stats.noStrata}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

export function GmailSyncClient({ logs }: { logs: SyncLog[] }) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Gmail Sync
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SyncForm />
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Logs</CardTitle>
            <CardDescription>
              `Found` means emails scanned, and `Inserted` means new notices actually added to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emails Scanned</TableHead>
                  <TableHead>New Notices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell suppressHydrationWarning>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.status}</TableCell>
                    <TableCell>{log.found}</TableCell>
                    <TableCell>{log.inserted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
