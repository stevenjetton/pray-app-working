// utils/dateHelpers.ts

export type AnyDate = string | Date | undefined;

/**
 * Converts a date (string ISO or Date object) to a sortable ISO string.
 * Returns empty string '' if invalid or undefined.
 */
export function dateToSortableString(date: AnyDate): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? '' : date.toISOString();
  }
  return '';
}

/**
 * Formats a date (string or Date) for display in "MMM dd, yyyy" format.
 * Returns empty string if invalid or undefined.
 */
export function formatDateForDisplay(date: AnyDate): string {
  const isoStr = dateToSortableString(date);
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

/**
 * Converts a date (string ISO or Date) to milliseconds from epoch.
 * Returns 0 if invalid or undefined.
 */
export function getDateValue(date: AnyDate): number {
  if (!date) return 0;
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
  return 0;
}
