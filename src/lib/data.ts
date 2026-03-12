import db from './db';
import type { StrataNotice, Owner, Property, SyncLog } from './definitions';

// A helper to safely parse JSON from the database.
function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return defaultValue;
  }
}

function mapToNotice(row: any): StrataNotice {
    return {
        id: row.id,
        subject: row.subject,
        sender: row.sender,
        receivedAt: row.receivedAt,
        content: row.content,
        status: row.status,
        planCode: row.planCode,
        allPlanCodes: safeJsonParse<string[]>(row.allPlanCodes, []),
        aiSummary: safeJsonParse(row.aiSummary, null),
        audience: safeJsonParse(row.audience, null),
        attachments: safeJsonParse(row.attachments, []),
        assignedOwnerId: row.assignedOwnerId,
        assignedOwnerIds: safeJsonParse<string[]>(row.assignedOwnerIds, []),
        ownerMessage: row.ownerMessage || null,
    };
}

export async function getNoticeById(id: string): Promise<StrataNotice | null> {
    const stmt = db.prepare('SELECT * FROM notices WHERE id = ?');
    const row = stmt.get(id);
    return row ? mapToNotice(row) : null;
}

export async function getNotices(options: {
    status?: StrataNotice['status'][];
    query?: string;
} = {}): Promise<StrataNotice[]> {
    let query = 'SELECT * FROM notices';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (options.status && options.status.length > 0) {
        const placeholders = options.status.map(() => '?').join(',');
        conditions.push(`status IN (${placeholders})`);
        params.push(...options.status);
    }
    
    if (options.query) {
        const queryCondition = `(subject LIKE ? OR sender LIKE ? OR planCode LIKE ? OR content LIKE ?)`;
        conditions.push(queryCondition);
        const wildCardQuery = `%${options.query}%`;
        params.push(wildCardQuery, wildCardQuery, wildCardQuery, wildCardQuery);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY receivedAt DESC';

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(mapToNotice);
}


export async function getNoticesCount(status?: StrataNotice['status'][]): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM notices';
    const params: string[] = [];
    if(status && status.length > 0) {
        query += ` WHERE status IN (${status.map(() => '?').join(',')})`;
        params.push(...status);
    }
    const stmt = db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
}

export async function getLastSyncStatus(): Promise<SyncLog | null> {
    const stmt = db.prepare('SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 1');
    const row = stmt.get();
    return row ? (row as SyncLog) : null;
}

export async function getSyncLogs(): Promise<SyncLog[]> {
    const stmt = db.prepare('SELECT * FROM sync_logs ORDER BY timestamp DESC LIMIT 50');
    const rows = stmt.all();
    return rows as SyncLog[];
}

export async function getProperties(): Promise<Property[]> {
    const stmt = db.prepare('SELECT * FROM properties ORDER BY name ASC');
    const rows = stmt.all();
    return rows as Property[];
}
