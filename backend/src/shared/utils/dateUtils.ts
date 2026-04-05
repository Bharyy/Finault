export function getStartOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function parseDateRange(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : getStartOfMonth();
  const end = endDate ? new Date(endDate) : getEndOfMonth();

  if (isNaN(start.getTime())) throw new Error('Invalid start date');
  if (isNaN(end.getTime())) throw new Error('Invalid end date');
  if (start > end) throw new Error('Start date must be before end date');

  return { start, end };
}
