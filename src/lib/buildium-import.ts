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
    locator_code: string | null;
    owner_name: string;
    address_1: string;
    city: string;
    state: string;
    postal_code: string;
    plan_code: string | null;
    unit_number: string | null;
    source: 'buildium';
    source_id: string;
    type: string;
  };
};

export type ImportedOwnerRecord = {
  docId: string;
  data: Omit<Owner, 'id'>;
};

export type BuildiumImportStats = {
  properties: number;
  owners: number;
  propertiesWithStrataNumber: number;
  propertiesWithoutStrataNumber: number;
};

type ParsedBuildiumPropertyName = {
  locatorCode: string | null;
  addressHint: string | null;
  cityHint: string | null;
  postalCodeHint: string | null;
  planCodeHint: string | null;
};

const buildiumLocatorCodeRegex = /^(B\d{4,}|\d{2}-\d-\d{3})$/i;
const canadianPostalCodeRegex = /([A-Z]\d[A-Z])\s?(\d[A-Z]\d)/i;

function normalizeBuildiumLocatorCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return buildiumLocatorCodeRegex.test(normalized) ? normalized : null;
}

function extractCanadianPostalCode(value: string): string | null {
  const match = value.match(canadianPostalCodeRegex);

  if (!match) {
    return null;
  }

  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

function parseBuildiumPropertyName(propertyName: string): ParsedBuildiumPropertyName {
  const parts = propertyName
    .split('_')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return {
      locatorCode: null,
      addressHint: null,
      cityHint: null,
      postalCodeHint: null,
      planCodeHint: null,
    };
  }

  const locatorCode = normalizeBuildiumLocatorCode(parts[0]);
  const postalIndex = parts.findIndex((part) => extractCanadianPostalCode(part) !== null);
  const postalPart = postalIndex >= 0 ? parts[postalIndex] : null;
  const postalCodeHint = postalPart ? extractCanadianPostalCode(postalPart) : null;
  const cityHint = postalIndex > 0 ? parts[postalIndex - 1] : null;

  const planCodeFromParts = parts
    .map((part) => extractPrimaryStrataPlanCode(part))
    .find((value): value is string => typeof value === 'string' && value.length > 0);

  const addressCandidates =
    postalIndex > 1
      ? parts.slice(locatorCode ? 1 : 0, postalIndex - 1 >= (locatorCode ? 1 : 0) ? postalIndex - 1 : undefined)
      : [];
  const addressHint = addressCandidates.length > 0 ? addressCandidates[addressCandidates.length - 1] : null;

  return {
    locatorCode,
    addressHint,
    cityHint,
    postalCodeHint,
    planCodeHint: planCodeFromParts ?? extractPrimaryStrataPlanCode(propertyName),
  };
}

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
  return [property.locator_code, property.plan_code, property.unit_number, property.address_1]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' - ');
}

export function buildBuildiumImportPayload(rowsInput: unknown[]) {
  const rows = z.array(BuildiumCsvRowSchema).parse(rowsInput);
  const ownersMap = new Map<string, ImportedOwnerRecord['data']>();
  const properties: ImportedPropertyRecord[] = [];
  let propertiesWithStrataNumber = 0;
  let propertiesWithoutStrataNumber = 0;

  for (const row of rows) {
    const propertyName = row['Property name'].trim();
    const parsedPropertyName = parseBuildiumPropertyName(propertyName);
    const address1 = row['Address 1'].trim() || parsedPropertyName.addressHint || '';
    const city = row['City/Locality'].trim() || parsedPropertyName.cityHint || '';
    const state = row['State/Province'].trim();
    const postalCode = row['Postal code'].trim() || parsedPropertyName.postalCodeHint || '';
    const propertyId = row.Id.trim();
    const normalizedOwnerName = normalizeOwnerName(row['Rental owners']);
    const ownerName = normalizedOwnerName || `Unassigned owner ${propertyId}`;
    const planCode = parsedPropertyName.planCodeHint || extractPrimaryStrataPlanCode(propertyName);
    const unitNumber =
      extractUnitNumberFromAddress(address1) ||
      extractUnitNumberFromAddress(parsedPropertyName.addressHint || '');

    if (planCode) {
      propertiesWithStrataNumber += 1;
    } else {
      propertiesWithoutStrataNumber += 1;
    }

    const propertyRecord: ImportedPropertyRecord = {
      docId: `buildium-property-${propertyId}`,
      data: {
        name: propertyName,
        locator_code: parsedPropertyName.locatorCode,
        owner_name: ownerName,
        address_1: address1,
        city,
        state,
        postal_code: postalCode,
        plan_code: planCode,
        unit_number: unitNumber,
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
      existingOwner.locatorCodes = uniqueSorted([...(existingOwner.locatorCodes ?? []), parsedPropertyName.locatorCode]);
      existingOwner.unitNumbers = uniqueSorted([...(existingOwner.unitNumbers ?? []), unitNumber]);
      existingOwner.propertyIds = uniqueSorted([...(existingOwner.propertyIds ?? []), propertyRecord.docId]);
      continue;
    }

    ownersMap.set(ownerDocId, {
      name: ownerName,
      email: null,
      properties: propertyLabel ? [propertyLabel] : [],
      planCodes: uniqueSorted([planCode]),
      locatorCodes: uniqueSorted([parsedPropertyName.locatorCode]),
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
      propertiesWithStrataNumber,
      propertiesWithoutStrataNumber,
    },
  };
}
