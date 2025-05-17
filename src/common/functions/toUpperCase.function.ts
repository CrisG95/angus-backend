function toUppercaseStrings<T extends Record<string, any>>(obj: T): T {
  const transformed = { ...obj };

  for (const key in transformed) {
    if (
      typeof transformed[key] === 'string' &&
      transformed[key].trim() !== ''
    ) {
      transformed[key] = transformed[key].toUpperCase();
    }
  }

  return transformed;
}

export { toUppercaseStrings };
