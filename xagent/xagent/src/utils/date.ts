import { parseISO, format as formatDate } from 'date-fns';

export function formatDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDate(date, 'PPp');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

export function isValidDate(dateString: string | Date): boolean {
  try {
    if (typeof dateString === 'string') {
      parseISO(dateString);
    } else {
      dateString.getTime();
    }
    return true;
  } catch {
    return false;
  }
}