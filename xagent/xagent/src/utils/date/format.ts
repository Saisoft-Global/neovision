import { parseISO, format } from 'date-fns';

export function formatDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'PPp');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

export function formatDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'PP');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

export function formatTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'p');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid time';
  }
}