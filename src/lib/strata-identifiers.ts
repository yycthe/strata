const strataPlanRegex = /(EPS|BCS|LMS|VR|VAS)\s*-?\s*(\d{2,6})/gi;

export function extractStrataPlanCodes(text: string): string[] {
  const matches = text.matchAll(strataPlanRegex);
  const codes = new Set<string>();

  for (const match of matches) {
    codes.add(`${match[1].toUpperCase()}${match[2]}`);
  }

  return Array.from(codes);
}

export function extractPrimaryStrataPlanCode(text: string): string | null {
  return extractStrataPlanCodes(text)[0] ?? null;
}

export function normalizeComparableToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function extractUnitNumberFromAddress(address: string): string | null {
  const normalized = address.trim().replace(/\s+/g, ' ');
  const match = normalized.match(/^(?:#\s*)?([A-Za-z]*\d+[A-Za-z-]*|TH\d+|\d+[A-Za-z-]*)\s*-\s*(.+)$/i);

  if (!match) {
    return null;
  }

  return match[1].trim().toUpperCase();
}

export function normalizeOwnerName(value: string): string {
  return value.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

export function normalizeOwnerLookupKey(value: string): string {
  return normalizeOwnerName(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
