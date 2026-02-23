import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileClock, Wifi } from 'lucide-react';

interface StatsCardsProps {
  pendingNotices: number;
  ownersCount: number;
  syncStatus: string;
}

export function StatsCards({
  pendingNotices,
  ownersCount,
  syncStatus,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Notices</CardTitle>
          <FileClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingNotices}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting review or dispatch
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Owners Loaded</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ownersCount}</div>
          <p className="text-xs text-muted-foreground">
            Available for notice dispatch
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Sync Status</CardTitle>
          <Wifi className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{syncStatus}</div>
          <p className="text-xs text-muted-foreground">
            Status of the last Gmail sync
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
