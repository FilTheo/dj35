import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  parse,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from 'date-fns';
import type { CalendarDay, DayStatus } from './types';
import { DEFAULT_OPEN_DAYS } from './constants';

/**
 * Generate calendar days for a given month.
 * Fri/Sat/Sun default to 'open', all others to 'closed'.
 */
export function generateMonthDays(month: number, year: number): CalendarDay[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });

  return days.map((date) => {
    const dayOfWeek = getDay(date);
    const isOpenByDefault = DEFAULT_OPEN_DAYS.has(dayOfWeek);

    return {
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek,
      dayOfMonth: date.getDate(),
      status: isOpenByDefault ? 'open' : ('closed' as DayStatus),
      availableDJs: [],
      isLocked: false,
    };
  });
}

/**
 * Generate a full calendar grid (with padding days from prev/next months).
 * Used for the 7-column calendar display.
 */
export function generateCalendarGrid(month: number, year: number): (CalendarDay | null)[] {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return allDays.map((date) => {
    if (!isSameMonth(date, monthStart)) {
      return null; // padding day
    }
    const dayOfWeek = getDay(date);
    const isOpenByDefault = DEFAULT_OPEN_DAYS.has(dayOfWeek);
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek,
      dayOfMonth: date.getDate(),
      status: isOpenByDefault ? 'open' : ('closed' as DayStatus),
      availableDJs: [],
      isLocked: false,
    };
  });
}

/**
 * Get all open dates (not closed, not external) from a schedule.
 */
export function getOpenDates(days: CalendarDay[]): CalendarDay[] {
  return days.filter(
    (d) => d.status !== 'closed' && d.status !== 'external'
  );
}

/**
 * Convert a day-of-month number to ISO date string for a given month/year.
 */
export function dayOfMonthToISO(dayOfMonth: number, month: number, year: number): string {
  return format(new Date(year, month - 1, dayOfMonth), 'yyyy-MM-dd');
}

/**
 * Parse ISO date string to Date.
 */
export function parseISO(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Get day-of-week name for a date string.
 */
export function getDayName(dateStr: string): string {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, 'EEEE');
}

/**
 * Build a table of date → day-of-week for the extractor prompt.
 */
export function buildDateTable(month: number, year: number): string {
  const days = generateMonthDays(month, year);
  const openDays = days.filter((d) => d.status !== 'closed');
  return openDays
    .map((d) => `${d.dayOfMonth} → ${format(parse(d.date, 'yyyy-MM-dd', new Date()), 'EEEE')} (${d.date})`)
    .join('\n');
}

/**
 * Get all dates for a specific day of week in a month.
 */
export function getDatesForDayOfWeek(dayOfWeek: number, month: number, year: number): string[] {
  const days = generateMonthDays(month, year);
  return days.filter((d) => d.dayOfWeek === dayOfWeek).map((d) => d.date);
}

/**
 * Get month name for display.
 */
export function getMonthName(month: number, year: number): string {
  return format(new Date(year, month - 1), 'MMMM yyyy');
}
