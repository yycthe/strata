import { getNoticesCount, getOwnersCount, getLastSyncStatus } from '@/lib/data';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default async function OverviewPage() {
  const [
    pendingNotices,
    readyNotices,
    dispatchedNotices,
    ownersCount,
    lastSync,
  ] = await Promise.all([
    getNoticesCount(['New', 'Review']),
    getNoticesCount(['Ready']),
    getNoticesCount(['Dispatched']),
    getOwnersCount(),
    getLastSyncStatus(),
  ]);

  const syncStatus = lastSync?.status === 'success' ? 'Successful' : lastSync?.status === 'fail' ? 'Failed' : 'Never';
  const syncTime = lastSync?.timestamp ? new Date(lastSync.timestamp).toLocaleString() : 'N/A';

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Overview
        </h1>
      </div>
      <StatsCards
        pendingNotices={pendingNotices}
        ownersCount={ownersCount}
        syncStatus={syncStatus}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Notice Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Review</span>
                <span className="font-medium">{pendingNotices}</span>
             </div>
             <Separator />
             <div className="flex justify-between">
                <span className="text-muted-foreground">Ready for Dispatch</span>
                <span className="font-medium">{readyNotices}</span>
             </div>
             <Separator />
             <div className="flex justify-between">
                <span className="text-muted-foreground">Dispatched</span>
                <span className="font-medium">{dispatchedNotices}</span>
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Last Sync Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{syncTime}</span>
             </div>
             <Separator />
             <div className="flex justify-between">
                <span className="text-muted-foreground">Window</span>
                <span className="font-medium">{lastSync?.window ? `${lastSync.window} days` : 'N/A'}</span>
             </div>
             <Separator />
             <div className="flex justify-between">
                <span className="text-muted-foreground">Notices Found</span>
                <span className="font-medium">{lastSync?.found ?? 'N/A'}</span>
             </div>
             <Separator />
             <div className="flex justify-between">
                <span className="text-muted-foreground">New Notices Inserted</span>
                <span className="font-medium">{lastSync?.inserted ?? 'N/A'}</span>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
