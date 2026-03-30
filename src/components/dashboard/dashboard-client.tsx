'use client';

import { StatsCards } from '@/components/dashboard/stats-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { SyncLog } from '@/lib/definitions';

interface DashboardClientProps {
  initialStats: {
    pending: number;
    ready: number;
    dispatched: number;
    owners: number;
    sync: SyncLog | null;
  };
}

export function DashboardClient({ initialStats }: DashboardClientProps) {
  const { pending, ready, dispatched, owners, sync } = initialStats;

  const syncStatus =
    sync?.status === 'success'
      ? 'Successful'
      : sync?.status === 'fail'
      ? 'Failed'
      : 'Never';
  const syncTime = sync?.timestamp
    ? new Date(sync.timestamp).toLocaleString()
    : 'N/A';

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold tracking-tight md:text-2xl">
          Overview
        </h1>
      </div>
      <StatsCards
        pendingNotices={pending}
        ownersCount={owners}
        syncStatus={syncStatus}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/70 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="font-headline">Notice Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Review</span>
              <span className="font-medium">{pending}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ready for Dispatch</span>
              <span className="font-medium">{ready}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispatched</span>
              <span className="font-medium">{dispatched}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="font-headline">Last Sync Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium" suppressHydrationWarning>{syncTime}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Window</span>
              <span className="font-medium">
                {sync?.window ? `${sync.window} days` : 'N/A'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notices Found</span>
              <span className="font-medium">{sync?.found ?? 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Notices Inserted</span>
              <span className="font-medium">{sync?.inserted ?? 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
