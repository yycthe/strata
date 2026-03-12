import { getNotices } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StrataNotice } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';

export default async function HistoryPage() {
  const notices: StrataNotice[] = await getNotices({ status: ['Dispatched'] });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Sent History
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dispatched Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Recipient(s)</TableHead>
                <TableHead>Dispatched At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell>{notice.subject}</TableCell>
                  <TableCell>
                    {notice.assignedOwnerId ? `Owner ID: ${notice.assignedOwnerId}` : ''}
                    {notice.assignedOwnerIds && notice.assignedOwnerIds.length > 0 ? `Owner IDs: ${notice.assignedOwnerIds.join(', ')}` : ''}
                  </TableCell>
                  <TableCell suppressHydrationWarning>
                    {/* The DB doesn't have a dispatchedAt field, we use receivedAt as a proxy */}
                    {new Date(notice.receivedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
