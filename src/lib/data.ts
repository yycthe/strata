import { unstable_noStore as noStore } from 'next/cache';

import type { Owner, Property, StrataNotice, SyncLog } from './definitions';
import {
  demoNotices,
  demoOwners,
  demoProperties,
  demoSyncLogs,
} from './demo-data';
import { isDemoModeEnabled } from './demo-session';
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

  if (await isDemoModeEnabled()) {
    return demoNotices.find((notice) => notice.id === id) ?? null;
  }

  return getStoredNoticeById(id);
}

export async function getNotices(options: {
    status?: StrataNotice['status'][];
    query?: string;
} = {}): Promise<StrataNotice[]> {
  noStore();

  if (await isDemoModeEnabled()) {
    return demoNotices.filter((notice) => {
      const matchesStatus =
        !options.status ||
        options.status.length === 0 ||
        options.status.includes(notice.status);

      if (!matchesStatus) {
        return false;
      }

      const normalizedQuery = options.query?.trim().toLowerCase();
      if (!normalizedQuery) {
        return true;
      }

      return [notice.subject, notice.sender, notice.planCode ?? '', notice.content].some(
        (value) => value.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  return getStoredNotices(options);
}


export async function getNoticesCount(status?: StrataNotice['status'][]): Promise<number> {
  noStore();

  if (await isDemoModeEnabled()) {
    return demoNotices.filter((notice) => !status || status.includes(notice.status)).length;
  }

  return getStoredNoticesCount(status);
}

export async function getLastSyncStatus(): Promise<SyncLog | null> {
  noStore();

  if (await isDemoModeEnabled()) {
    return demoSyncLogs[0] ?? null;
  }

  return getStoredLastSyncLog();
}

export async function getSyncLogs(): Promise<SyncLog[]> {
  noStore();

  if (await isDemoModeEnabled()) {
    return demoSyncLogs;
  }

  return getStoredSyncLogs();
}

export async function getProperties(): Promise<Property[]> {
  noStore();

  if (await isDemoModeEnabled()) {
    return demoProperties;
  }

  return getStoredProperties();
}

export async function getOwners(): Promise<Array<Owner & { id: string }>> {
  noStore();

  if (await isDemoModeEnabled()) {
    return demoOwners;
  }

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

  if (await isDemoModeEnabled()) {
    const pending = demoNotices.filter((notice) => notice.status === 'New' || notice.status === 'Review').length;
    const ready = demoNotices.filter((notice) => notice.status === 'Ready').length;
    const dispatched = demoNotices.filter((notice) => notice.status === 'Dispatched').length;

    return {
      pending,
      ready,
      dispatched,
      owners: demoOwners.length,
      sync: demoSyncLogs[0] ?? null,
    };
  }

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
