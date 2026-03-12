export type StrataNotice = {
  id: string; // message.uid
  subject: string;
  sender: string;
  receivedAt: string; // ISO Date string
  content: string;
  status: 'New' | 'Ready' | 'Review' | 'Dispatched' | 'Ignored';
  planCode: string | null;
  allPlanCodes: string[];
  aiSummary: AISummary | null;
  audience: Audience | null;
  attachments: Attachment[];
  assignedOwnerId: string | null;
  assignedOwnerIds: string[] | null;
};

export type Owner = {
  name: string;
  email: string;
  properties: string[]; // e.g., ["BCS-1234 - 101", "EPS-5678 - 202"]
};

export type Property = {
    id: number;
    name: string;
    address_1: string;
    city: string;
    state: string;
    postal_code: string;
    plan_code: string | null;
    unit_number: string | null;
};

export type Attachment = {
  id: string; // Not real, just for keying
  filename: string;
  contentType: string;
  size: number;
};

export type AISummary = {
  what: string;
  when: string;
  impact: string;
  action: string;
};

export type Audience = {
  decision: 'BROADCAST' | 'DIRECT' | 'TARGETED' | 'REVIEW';
  confidence: number;
  evidence: string[];
  target_hints: {
    units: string[];
    strata_lots: string[];
    parking: string[];
    locker: string[];
  };
};

export type SyncLog = {
    id: number;
    timestamp: string;
    window: number;
    status: 'success' | 'fail';
    found: number;
    inserted: number;
    skipped: number;
    matched: number;
    error: string | null;
};

export type SyncResult = {
  status: 'success' | 'error';
  message: string;
  stats?: {
    found: number;
    matched: number;
    inserted: number;
    skipped: number;
  };
};
