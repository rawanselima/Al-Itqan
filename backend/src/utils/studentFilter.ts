/**
 * Escapes regex metacharacters and normalizes common Arabic character forms
 * so searches like "امل" match "أمل" and "ساره" match "سارة".
 */
export function buildArabicSearchPattern(term: string): string {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped
    .replace(/[أإآا]/g, '[أإآا]')
    .replace(/[ةه]/g, '[ةه]')
    .replace(/[ىي]/g, '[ىي]');
}

export interface StudentFilterParams {
  circleId?: string;
  search?: string;
  isActive?: boolean;
}

/**
 * Builds the MongoDB filter for listing/searching students without clobbering
 * soft-delete `$or` conditions with search `$or` conditions.
 */
export function buildStudentFilter({
  circleId,
  search,
  isActive,
}: StudentFilterParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [
    {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    },
  ];

  if (circleId) {
    filter.circleId = circleId;
  }
  if (isActive !== undefined) {
    filter.isActive = Boolean(isActive);
  }

  const trimmedSearch = typeof search === 'string' ? search.trim() : '';
  if (trimmedSearch) {
    const pattern = buildArabicSearchPattern(trimmedSearch);
    andConditions.push({
      $or: [
        { name: { $regex: pattern, $options: 'i' } },
        { phone: { $regex: pattern, $options: 'i' } },
      ],
    });
  }

  filter.$and = andConditions;
  return filter;
}
