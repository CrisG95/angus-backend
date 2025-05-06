export function generateChangeHistory<T extends Record<string, any>>(
  existingDocument: T,
  updateDto: Partial<T>,
  user: string,
  ignoredFields: string[] = ['id'],
) {
  const changes = [];

  for (const key of Object.keys(updateDto)) {
    if (
      !ignoredFields.includes(key) &&
      updateDto[key] !== undefined &&
      updateDto[key] !== existingDocument[key]
    ) {
      changes.push({
        field: key,
        before: existingDocument[key],
        after: updateDto[key],
      });
    }
  }

  return changes.length > 0 ? { date: new Date(), user, changes } : null;
}
