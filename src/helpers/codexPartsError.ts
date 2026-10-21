export function codexPartsError(part: unknown, totalParts: unknown): string | null {
  if (part === undefined && totalParts === undefined) {
    return null;
  }

  if (part === undefined || totalParts === undefined) {
    return 'Enter both Part and Total parts, or leave both empty.';
  }

  if (
    typeof part !== 'number' ||
    !Number.isSafeInteger(part) ||
    part < 1 ||
    typeof totalParts !== 'number' ||
    !Number.isSafeInteger(totalParts) ||
    totalParts < 1
  ) {
    return 'Part and Total parts must be positive integers.';
  }

  if (part > totalParts) {
    return 'Part cannot exceed Total parts.';
  }

  return null;
}
