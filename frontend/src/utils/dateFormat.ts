/**
 * Format a date string or Date object to dd/mm/yyyy format for display
 */
export function formatDisplayDate(date: string | Date | number | null | undefined): string {
  if (date == null) return '';

  let dateObj: Date;

  if (typeof date === 'string') {
    // Handle ISO format (2025-12-01 or 2025-12-01T00:00:00)
    const dateStr = date.split('T')[0];
    if (!dateStr || dateStr === 'NaN' || dateStr === 'Invalid Date') return '';

    // Parse YYYY-MM-DD format
    const parts = dateStr.split('-');
    if (parts.length !== 3) return date;

    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }

  if (typeof dateObj.getTime !== 'function' || isNaN(dateObj.getTime())) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format date for API calls (YYYY-MM-DD format)
 * This should NOT be changed as the backend expects this format
 */
export function formatApiDate(date: Date | null | undefined): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
}

/**
 * Parse a date string in various formats and return Date object
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try parsing dd/mm/yyyy
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try parsing yyyy-mm-dd
  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Fallback to native parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}
