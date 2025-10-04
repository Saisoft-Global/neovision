import { parseISO } from 'date-fns';

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

export function isDateInFuture(dateString: string | Date): boolean {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return date > new Date();
  } catch {
    return false;
  }
}

export function isDateInPast(dateString: string | Date): boolean {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return date < new Date();
  } catch {
    return false;
  }
}