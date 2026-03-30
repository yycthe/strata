import type { Owner, StrataNotice } from '@/lib/definitions';
import { extractStrataPlanCodes, normalizeComparableToken } from '@/lib/strata-identifiers';

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getNoticePlanCodes(notice: StrataNotice): string[] {
  return unique([notice.planCode ?? '', ...notice.allPlanCodes].filter(Boolean).map((value) => value.toUpperCase()));
}

function getOwnerPlanCodes(owner: Owner): string[] {
  if (owner.planCodes && owner.planCodes.length > 0) {
    return unique(owner.planCodes.map((value) => value.toUpperCase()));
  }

  return unique(owner.properties.flatMap((property) => extractStrataPlanCodes(property)));
}

function getOwnerUnitTokens(owner: Owner): string[] {
  if (owner.unitNumbers && owner.unitNumbers.length > 0) {
    return unique(owner.unitNumbers.map(normalizeComparableToken));
  }

  const legacyUnits = owner.properties
    .map((property) => property.split(' - ').map((part) => part.trim()))
    .map((parts) => (parts.length > 1 ? parts[1] : ''))
    .filter(Boolean)
    .map(normalizeComparableToken);

  return unique(legacyUnits);
}

function collectTargetTokens(notice: StrataNotice): string[] {
  if (!notice.audience) {
    return [];
  }

  return unique(
    [
      ...notice.audience.target_hints.units,
      ...notice.audience.target_hints.strata_lots,
      ...notice.audience.target_hints.parking,
      ...notice.audience.target_hints.locker,
    ]
      .filter(Boolean)
      .map(normalizeComparableToken)
  );
}

export function hasOwnerEmail(owner: Owner): owner is Owner & { email: string } {
  return typeof owner.email === 'string' && owner.email.trim().length > 0;
}

export function getRelevantOwnerProperties(owner: Owner, notice: StrataNotice): string[] {
  const planCodes = new Set(getNoticePlanCodes(notice));

  if (planCodes.size === 0) {
    return owner.properties;
  }

  const matchingProperties = owner.properties.filter((property) =>
    extractStrataPlanCodes(property).some((planCode) => planCodes.has(planCode))
  );

  return matchingProperties.length > 0 ? matchingProperties : owner.properties;
}

export function findOwnersForNotice<T extends Owner>(notice: StrataNotice, allOwners: T[] | null): T[] {
  if (!allOwners || allOwners.length === 0) {
    return [];
  }

  const noticePlanCodes = getNoticePlanCodes(notice);

  if (noticePlanCodes.length === 0) {
    return [];
  }

  const planScopedOwners = allOwners.filter((owner) =>
    getOwnerPlanCodes(owner).some((planCode) => noticePlanCodes.includes(planCode))
  );

  if (planScopedOwners.length === 0) {
    return [];
  }

  if (!notice.audience || notice.audience.decision !== 'TARGETED') {
    return planScopedOwners;
  }

  const targetTokens = collectTargetTokens(notice);

  if (targetTokens.length === 0) {
    return planScopedOwners;
  }

  const targetedOwners = planScopedOwners.filter((owner) => {
    const ownerUnits = getOwnerUnitTokens(owner);
    if (ownerUnits.some((unit) => targetTokens.includes(unit))) {
      return true;
    }

    return owner.properties.some((property) => {
      const normalizedProperty = normalizeComparableToken(property);
      return targetTokens.some((token) => normalizedProperty.includes(token));
    });
  });

  return targetedOwners.length > 0 ? targetedOwners : planScopedOwners;
}
