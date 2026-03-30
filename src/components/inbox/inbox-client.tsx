'use client';

import { useState, useTransition } from 'react';
import { StrataNotice } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from 'next/link';
import { MoreHorizontal, Trash2, Zap } from 'lucide-react';
import { deleteNotices, runAiTriage } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

function StatusBadge({ status }: { status: StrataNotice['status'] }) {
  const variant = {
    New: 'secondary',
    Ready: 'default',
    Review: 'destructive',
    Dispatched: 'default', // should not appear here, but for completeness
    Ignored: 'outline',
  }[status] as 'default' | 'secondary' | 'destructive' | 'outline';
  
  const colorClass = status === 'Ready' ? 'bg-green-500 hover:bg-green-600' : '';

  return <Badge variant={variant} className={colorClass}>{status}</Badge>;
}


export function InboxClient({ notices }: { notices: StrataNotice[] }) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRows(notices.map((n) => n.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
    }
  };

  const isAllSelected = selectedRows.length > 0 && selectedRows.length === notices.length;
  const isSomeSelected = selectedRows.length > 0 && selectedRows.length < notices.length;
  
  const handleDelete = () => {
    startTransition(async () => {
      await deleteNotices(selectedRows);
      toast({
        title: 'Notices Deleted',
        description: `${selectedRows.length} notice(s) have been deleted.`,
      });
      setSelectedRows([]);
    });
  };

  const handleAiTriage = (noticeId: string, content: string) => {
    startTransition(async () => {
      try {
        await runAiTriage(noticeId, content);
        toast({
          title: 'AI Triage Complete',
          description: `Notice ${noticeId} has been processed.`,
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'AI Triage Failed',
          description: error.message,
        });
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedRows.length === 0 || isPending}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedRows.length})
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the selected notices.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(notice.id)}
                      onCheckedChange={(checked) => handleSelectRow(notice.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell><StatusBadge status={notice.status} /></TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/inbox/${notice.id}`} className="hover:underline">
                      {notice.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{notice.sender}</TableCell>
                  <TableCell suppressHydrationWarning>{new Date(notice.receivedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem disabled={isPending || !['New', 'Review'].includes(notice.status)} onClick={() => handleAiTriage(notice.id, notice.content)}>
                          <Zap className="mr-2 h-4 w-4" />
                          Run AI Triage
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this notice.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => {
                                    startTransition(async () => {
                                        await deleteNotices([notice.id]);
                                        toast({ title: 'Notice Deleted' });
                                    });
                                }}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
