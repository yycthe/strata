import 'server-only';

import { type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { getAdminFirestore, hasFirebaseAdminConfig } from '@/lib/firebase-admin';
import { deleteStoredAttachmentContents } from '@/lib/notice-attachments';
import { type Attachment, type Property, type StrataNotice, type SyncLog, isPdfAttachment } from '@/lib/definitions';

type NoticeListOptions = {
  status?: StrataNotice['status'][];
  query?: string;
};

type NoticeWriteInput = Omit<StrataNotice, 'id'>;
type SyncLogWriteInput = Omit<SyncLog, 'id'>;

function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON from SQLite fallback store:', error);
    return defaultValue;
  }
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1';
}

function getStoreMode(): 'firestore' | 'sqlite' {
  if (hasFirebaseAdminConfig()) {
    return 'firestore';
  }

  if (isVercelRuntime()) {
    throw new Error(
      'Vercel deployment requires Firestore server credentials. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to keep notices and sync logs persistent.'
    );
  }

  return 'sqlite';
}

async function withSqlite<T>(handler: (database: any) => T | Promise<T>): Promise<T> {
  const module = await import('./db');
  return handler(module.default as any);
}

function normalizeNoticeStatus(status: unknown): StrataNotice['status'] {
  switch (status) {
    case 'Ready':
    case 'Review':
    case 'Dispatched':
    case 'Ignored':
      return status;
    case 'New':
    default:
      return 'New';
  }
}

function normalizeSyncStatus(status: unknown): SyncLog['status'] {
  return status === 'fail' ? 'fail' : 'success';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeAttachment(value: unknown): Attachment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const attachment = value as Record<string, unknown>;
  const filename = typeof attachment.filename === 'string' ? attachment.filename : 'untitled';
  const contentType = typeof attachment.contentType === 'string' ? attachment.contentType : 'application/octet-stream';

  return {
    id: typeof attachment.id === 'string' ? attachment.id : filename,
    filename,
    contentType,
    size: typeof attachment.size === 'number' ? attachment.size : Number(attachment.size ?? 0),
    isPdf: isPdfAttachment({
      filename,
      contentType,
      isPdf: attachment.isPdf === true,
    }),
    storagePath: typeof attachment.storagePath === 'string' ? attachment.storagePath : null,
    localPath: typeof attachment.localPath === 'string' ? attachment.localPath : null,
  };
}

function normalizeAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeAttachment)
    .filter((attachment): attachment is Attachment => attachment !== null);
}

function mapFirestoreNotice(doc: QueryDocumentSnapshot<DocumentData>): StrataNotice {
  const data = doc.data();

  return {
    id: doc.id,
    subject: typeof data.subject === 'string' ? data.subject : 'No Subject',
    sender: typeof data.sender === 'string' ? data.sender : 'Unknown Sender',
    receivedAt: typeof data.receivedAt === 'string' ? data.receivedAt : new Date().toISOString(),
    content: typeof data.content === 'string' ? data.content : '',
    status: normalizeNoticeStatus(data.status),
    planCode: typeof data.planCode === 'string' ? data.planCode : null,
    allPlanCodes: asStringArray(data.allPlanCodes),
    aiSummary: (data.aiSummary ?? null) as StrataNotice['aiSummary'],
    audience: (data.audience ?? null) as StrataNotice['audience'],
    attachments: normalizeAttachments(data.attachments),
    assignedOwnerId: typeof data.assignedOwnerId === 'string' ? data.assignedOwnerId : null,
    assignedOwnerIds: Array.isArray(data.assignedOwnerIds) ? asStringArray(data.assignedOwnerIds) : null,
    ownerMessage: typeof data.ownerMessage === 'string' ? data.ownerMessage : null,
  };
}

function mapFirestoreSyncLog(doc: QueryDocumentSnapshot<DocumentData>): SyncLog {
  const data = doc.data();

  return {
    id: doc.id,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
    window: typeof data.window === 'number' ? data.window : Number(data.window ?? 0),
    status: normalizeSyncStatus(data.status),
    found: typeof data.found === 'number' ? data.found : Number(data.found ?? 0),
    inserted: typeof data.inserted === 'number' ? data.inserted : Number(data.inserted ?? 0),
    skipped: typeof data.skipped === 'number' ? data.skipped : Number(data.skipped ?? 0),
    matched: typeof data.matched === 'number' ? data.matched : Number(data.matched ?? 0),
    error: typeof data.error === 'string' ? data.error : null,
  };
}

function mapFirestoreProperty(doc: QueryDocumentSnapshot<DocumentData>): Property {
  const data = doc.data();

  return {
    id: doc.id,
    name: typeof data.name === 'string' ? data.name : '',
    address_1: typeof data.address_1 === 'string' ? data.address_1 : '',
    city: typeof data.city === 'string' ? data.city : '',
    state: typeof data.state === 'string' ? data.state : '',
    postal_code: typeof data.postal_code === 'string' ? data.postal_code : '',
    plan_code: typeof data.plan_code === 'string' ? data.plan_code : null,
    unit_number: typeof data.unit_number === 'string' ? data.unit_number : null,
  };
}

function mapSqliteNotice(row: any): StrataNotice {
  return {
    id: String(row.id),
    subject: row.subject,
    sender: row.sender,
    receivedAt: row.receivedAt,
    content: row.content,
    status: normalizeNoticeStatus(row.status),
    planCode: row.planCode,
    allPlanCodes: safeJsonParse<string[]>(row.allPlanCodes, []),
    aiSummary: safeJsonParse<StrataNotice['aiSummary']>(row.aiSummary, null),
    audience: safeJsonParse<StrataNotice['audience']>(row.audience, null),
    attachments: normalizeAttachments(safeJsonParse<StrataNotice['attachments']>(row.attachments, [])),
    assignedOwnerId: row.assignedOwnerId ?? null,
    assignedOwnerIds: safeJsonParse<StrataNotice['assignedOwnerIds']>(row.assignedOwnerIds, null),
    ownerMessage: row.ownerMessage ?? null,
  };
}

function normalizeNoticeWritePayload(notice: NoticeWriteInput): Record<string, unknown> {
  return {
    subject: notice.subject,
    sender: notice.sender,
    receivedAt: notice.receivedAt,
    content: notice.content,
    status: notice.status,
    planCode: notice.planCode,
    allPlanCodes: notice.allPlanCodes,
    aiSummary: notice.aiSummary ?? null,
    audience: notice.audience ?? null,
    attachments: notice.attachments,
    assignedOwnerId: notice.assignedOwnerId ?? null,
    assignedOwnerIds: notice.assignedOwnerIds ?? null,
    ownerMessage: notice.ownerMessage ?? null,
  };
}

function normalizeNoticeUpdatePayload(updates: Partial<NoticeWriteInput>): Record<string, unknown> {
  const payload = stripUndefined({
    subject: updates.subject,
    sender: updates.sender,
    receivedAt: updates.receivedAt,
    content: updates.content,
    status: updates.status,
    planCode: updates.planCode,
    allPlanCodes: updates.allPlanCodes,
    aiSummary: updates.aiSummary,
    audience: updates.audience,
    attachments: updates.attachments,
    assignedOwnerId: updates.assignedOwnerId,
    assignedOwnerIds: updates.assignedOwnerIds,
    ownerMessage: updates.ownerMessage,
  });

  return payload;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return Object.fromEntries(entries) as T;
}

function serializeSqliteValue(field: keyof NoticeWriteInput, value: NoticeWriteInput[keyof NoticeWriteInput]): unknown {
  switch (field) {
    case 'allPlanCodes':
    case 'aiSummary':
    case 'audience':
    case 'attachments':
    case 'assignedOwnerIds':
      return value === undefined ? null : JSON.stringify(value);
    default:
      return value ?? null;
  }
}

function noticeMatchesOptions(notice: StrataNotice, options: NoticeListOptions): boolean {
  const matchesStatus = !options.status || options.status.length === 0 || options.status.includes(notice.status);

  if (!matchesStatus) {
    return false;
  }

  if (!options.query) {
    return true;
  }

  const normalizedQuery = options.query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    notice.subject,
    notice.sender,
    notice.planCode ?? '',
    notice.content,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

async function getFirestoreNotices(options: NoticeListOptions = {}): Promise<StrataNotice[]> {
  const snapshot = await getAdminFirestore().collection('strataNotices').get();
  return snapshot.docs
    .map(mapFirestoreNotice)
    .filter((notice) => noticeMatchesOptions(notice, options))
    .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

async function getSqliteNotices(options: NoticeListOptions = {}): Promise<StrataNotice[]> {
  return withSqlite((database) => {
    let query = 'SELECT * FROM notices';
    const params: string[] = [];
    const conditions: string[] = [];

    if (options.status && options.status.length > 0) {
      conditions.push(`status IN (${options.status.map(() => '?').join(',')})`);
      params.push(...options.status);
    }

    if (options.query) {
      const wildcardQuery = `%${options.query}%`;
      conditions.push('(subject LIKE ? OR sender LIKE ? OR planCode LIKE ? OR content LIKE ?)');
      params.push(wildcardQuery, wildcardQuery, wildcardQuery, wildcardQuery);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY receivedAt DESC';

    const rows = database.prepare(query).all(...params);
    return rows.map(mapSqliteNotice);
  });
}

export async function getStoredNoticeById(id: string): Promise<StrataNotice | null> {
  if (getStoreMode() === 'firestore') {
    const snapshot = await getAdminFirestore().collection('strataNotices').doc(id).get();
    return snapshot.exists ? mapFirestoreNotice(snapshot as QueryDocumentSnapshot<DocumentData>) : null;
  }

  return withSqlite((database) => {
    const row = database.prepare('SELECT * FROM notices WHERE id = ?').get(id);
    return row ? mapSqliteNotice(row) : null;
  });
}

export async function getStoredNotices(options: NoticeListOptions = {}): Promise<StrataNotice[]> {
  return getStoreMode() === 'firestore' ? getFirestoreNotices(options) : getSqliteNotices(options);
}

export async function getStoredNoticesCount(status?: StrataNotice['status'][]): Promise<number> {
  const notices = await getStoredNotices({ status });
  return notices.length;
}

export async function getStoredLastSyncLog(): Promise<SyncLog | null> {
  const logs = await getStoredSyncLogs();
  return logs[0] ?? null;
}

export async function getStoredSyncLogs(): Promise<SyncLog[]> {
  if (getStoreMode() === 'firestore') {
    const snapshot = await getAdminFirestore().collection('syncLogs').get();
    return snapshot.docs
      .map(mapFirestoreSyncLog)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 50);
  }

  return withSqlite((database) => {
    const rows = database.prepare('SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 50').all();
    return rows.map((row: any) => ({
      id: String(row.id),
      timestamp: row.timestamp,
      window: row.window,
      status: normalizeSyncStatus(row.status),
      found: row.found,
      inserted: row.inserted,
      skipped: row.skipped,
      matched: row.matched,
      error: row.error ?? null,
    })) as SyncLog[];
  });
}

export async function getStoredProperties(): Promise<Property[]> {
  if (getStoreMode() === 'firestore') {
    const snapshot = await getAdminFirestore().collection('properties').get();
    return snapshot.docs
      .map(mapFirestoreProperty)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  return withSqlite((database) => {
    const rows = database.prepare('SELECT * FROM properties ORDER BY name ASC').all();
    return rows.map((row: any) => ({
      id: String(row.id),
      name: row.name,
      address_1: row.address_1,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      plan_code: row.plan_code ?? null,
      unit_number: row.unit_number ?? null,
    })) as Property[];
  });
}

export async function createStoredNotice(id: string, notice: NoticeWriteInput): Promise<void> {
  if (getStoreMode() === 'firestore') {
    await getAdminFirestore().collection('strataNotices').doc(id).set(normalizeNoticeWritePayload(notice));
    return;
  }

  await withSqlite((database) => {
    database.prepare(
      `INSERT INTO notices (id, subject, sender, receivedAt, content, status, planCode, allPlanCodes, aiSummary, audience, attachments, assignedOwnerId, assignedOwnerIds, ownerMessage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      notice.subject,
      notice.sender,
      notice.receivedAt,
      notice.content,
      notice.status,
      notice.planCode,
      JSON.stringify(notice.allPlanCodes),
      JSON.stringify(notice.aiSummary),
      JSON.stringify(notice.audience),
      JSON.stringify(notice.attachments),
      notice.assignedOwnerId,
      JSON.stringify(notice.assignedOwnerIds),
      notice.ownerMessage
    );
  });
}

export async function createStoredSyncLog(log: SyncLogWriteInput): Promise<void> {
  if (getStoreMode() === 'firestore') {
    await getAdminFirestore().collection('syncLogs').add({
      timestamp: log.timestamp,
      window: log.window,
      status: log.status,
      found: log.found,
      inserted: log.inserted,
      skipped: log.skipped,
      matched: log.matched,
      error: log.error ?? null,
    });
    return;
  }

  await withSqlite((database) => {
    database.prepare(
      'INSERT INTO sync_logs (timestamp, window, status, found, inserted, skipped, matched, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      log.timestamp,
      log.window,
      log.status,
      log.found,
      log.inserted,
      log.skipped,
      log.matched,
      log.error ?? null
    );
  });
}

export async function updateStoredNotice(id: string, updates: Partial<NoticeWriteInput>): Promise<void> {
  if (getStoreMode() === 'firestore') {
    const payload = normalizeNoticeUpdatePayload(updates);
    if (Object.keys(payload).length === 0) {
      return;
    }

    await getAdminFirestore().collection('strataNotices').doc(id).set(payload, { merge: true });
    return;
  }

  await withSqlite((database) => {
    const entries = Object.entries(stripUndefined(updates)) as [keyof NoticeWriteInput, NoticeWriteInput[keyof NoticeWriteInput]][];
    if (entries.length === 0) {
      return;
    }

    const setClause = entries.map(([field]) => `${field} = ?`).join(', ');
    const values = entries.map(([field, value]) => serializeSqliteValue(field, value));
    database.prepare(`UPDATE notices SET ${setClause} WHERE id = ?`).run(...values, id);
  });
}

export async function deleteStoredNotice(id: string): Promise<void> {
  const notice = await getStoredNoticeById(id);

  if (getStoreMode() === 'firestore') {
    await getAdminFirestore().collection('strataNotices').doc(id).delete();
    if (notice) {
      await deleteStoredAttachmentContents(notice.attachments);
    }
    return;
  }

  await withSqlite((database) => {
    database.prepare('DELETE FROM notices WHERE id = ?').run(id);
  });

  if (notice) {
    await deleteStoredAttachmentContents(notice.attachments);
  }
}

export async function deleteStoredNotices(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const notices = await Promise.all(ids.map((id) => getStoredNoticeById(id)));
  const attachments = notices.flatMap((notice) => notice?.attachments ?? []);

  if (getStoreMode() === 'firestore') {
    const database = getAdminFirestore();
    const batch = database.batch();

    ids.forEach((id) => {
      batch.delete(database.collection('strataNotices').doc(id));
    });

    await batch.commit();
    await deleteStoredAttachmentContents(attachments);
    return;
  }

  await withSqlite((database) => {
    const stmt = database.prepare('DELETE FROM notices WHERE id = ?');
    const transaction = database.transaction((idList: string[]) => {
      idList.forEach((id) => stmt.run(id));
    });

    transaction(ids);
  });

  await deleteStoredAttachmentContents(attachments);
}
