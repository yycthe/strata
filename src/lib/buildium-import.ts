import { z } from 'zod';

import type { Owner } from '@/lib/definitions';
import {
  extractPrimaryStrataPlanCode,
  extractUnitNumberFromAddress,
  normalizeOwnerLookupKey,
  normalizeOwnerName,
} from '@/lib/strata-identifiers';

export const BuildiumCsvRowSchema = z.object({
  'Property name': z.string(),
  'Address 1': z.string(),
  'City/Locality': z.string(),
  'State/Province': z.string(),
  'Postal code': z.string(),
  'Rental owners': z.string(),
  Id: z.string(),
  Type: z.string().optional().default(''),
});

export type BuildiumCsvRow = z.infer<typeof BuildiumCsvRowSchema>;

export type ImportedPropertyRecord = {
  docId: string;
  data: {
    name: string;
    address_1: string;
    city: string;
    state: string;
    postal_code: string;
    plan_code: string | null;
    unit_number: string | null;
    owner_name: string;
    source: 'buildium';
    source_id: string;
    type: string;
  };
};

export type ImportedOwnerRecord = {
  docId: string;
  data: Omit<Owner, 'id'>;
};

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
    )
  ).sort((left, right) => left.localeCompare(right));
}

function buildPropertyLabel(property: ImportedPropertyRecord['data']): string {
  return [property.plan_code, property.unit_number, property.address_1]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' - ');
}

export function buildBuildiumImportPayload(rowsInput: unknown[]) {
  const rows = z.array(BuildiumCsvRowSchema).parse(rowsInput);
  const ownersMap = new Map<string, ImportedOwnerRecord['data']>();
  const properties: ImportedPropertyRecord[] = [];
  let unresolvedPlanCodes = 0;

  for (const row of rows) {
    const propertyName = row['Property name'].trim();
    const address1 = row['Address 1'].trim();
    const city = row['City/Locality'].trim();
    const state = row['State/Province'].trim();
    const postalCode = row['Postal code'].trim();
    const propertyId = row.Id.trim();
    const normalizedOwnerName = normalizeOwnerName(row['Rental owners']);
    const ownerName = normalizedOwnerName || `Unassigned owner ${propertyId}`;
    const planCode = extractPrimaryStrataPlanCode(propertyName);
    const unitNumber = extractUnitNumberFromAddress(address1);

    if (!planCode) {
      unresolvedPlanCodes += 1;
    }

    const propertyRecord: ImportedPropertyRecord = {
      docId: `buildium-property-${propertyId}`,
      data: {
        name: propertyName,
        address_1: address1,
        city,
        state,
        postal_code: postalCode,
        plan_code: planCode,
        unit_number: unitNumber,
        owner_name: ownerName,
        source: 'buildium',
        source_id: propertyId,
        type: row.Type?.trim() || '',
      },
    };

    properties.push(propertyRecord);

    const ownerKey = normalizeOwnerLookupKey(ownerName) || `property-${propertyId}`;
    const ownerDocId = `buildium-owner-${ownerKey}`;
    const existingOwner = ownersMap.get(ownerDocId);
    const propertyLabel = buildPropertyLabel(propertyRecord.data);

    if (existingOwner) {
      existingOwner.properties = uniqueSorted([...existingOwner.properties, propertyLabel]);
      existingOwner.planCodes = uniqueSorted([...(existingOwner.planCodes ?? []), planCode]);
      existingOwner.unitNumbers = uniqueSorted([...(existingOwner.unitNumbers ?? []), unitNumber]);
      existingOwner.propertyIds = uniqueSorted([...(existingOwner.propertyIds ?? []), propertyRecord.docId]);
      continue;
    }

    ownersMap.set(ownerDocId, {
      name: ownerName,
      email: null,
      properties: propertyLabel ? [propertyLabel] : [],
      planCodes: uniqueSorted([planCode]),
      unitNumbers: uniqueSorted([unitNumber]),
      propertyIds: [propertyRecord.docId],
      source: 'buildium',
    });
  }

  return {
    owners: Array.from(ownersMap.entries()).map(([docId, data]) => ({ docId, data })),
    properties,
    stats: {
      properties: properties.length,
      owners: ownersMap.size,
      unresolvedPlanCodes,
    },
  };
}
