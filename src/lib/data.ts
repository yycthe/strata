import { unstable_noStore as noStore } from 'next/cache';

import type { Owner, Property, StrataNotice, SyncLog } from './definitions';
import {
  getStoredLastSyncLog,
  getStoredNoticeById,
  getStoredNotices,
  getStoredNoticesCount,
  getStoredOwners,
  getStoredProperties,
  getStoredSyncLogs,
} from './server-store';

export async function getNoticeById(id: string): Promise<StrataNotice | null> {
    noStore();
    return getStoredNoticeById(id);
}

export async function getNotices(options: {
    status?: StrataNotice['status'][];
    query?: string;
} = {}): Promise<StrataNotice[]> {
    noStore();
    return getStoredNotices(options);
}


export async function getNoticesCount(status?: StrataNotice['status'][]): Promise<number> {
    noStore();
    return getStoredNoticesCount(status);
}

export async function getLastSyncStatus(): Promise<SyncLog | null> {
    noStore();
    return getStoredLastSyncLog();
}

export async function getSyncLogs(): Promise<SyncLog[]> {
    noStore();
    return getStoredSyncLogs();
}

export async function getProperties(): Promise<Property[]> {
    noStore();
    return getStoredProperties();
}

export async function getOwners(): Promise<Array<Owner & { id: string }>> {
    noStore();
    return getStoredOwners();
}

export async function getDashboardStats(): Promise<{
  pending: number;
  ready: number;
  dispatched: number;
  owners: number;
  sync: SyncLog | null;
}> {
  noStore();

  const [notices, sync, owners] = await Promise.all([
    getStoredNotices(),
    getStoredLastSyncLog(),
    getStoredOwners(),
  ]);

  const pending = notices.filter((notice) => notice.status === 'New' || notice.status === 'Review').length;
  const ready = notices.filter((notice) => notice.status === 'Ready').length;
  const dispatched = notices.filter((notice) => notice.status === 'Dispatched').length;

  return { pending, ready, dispatched, owners: owners.length, sync };
}
