'use client';

import { useMemo } from 'react';
import type { CalendarDay, MonthSchedule } from '@/lib/types';
import { generateCalendarGrid } from '@/lib/calendar-utils';

export function useCalendar(schedule: MonthSchedule) {
  const grid = useMemo(
    () => generateCalendarGrid(schedule.month, schedule.year),
    [schedule.month, schedule.year]
  );

  // Merge schedule data into grid
  const calendarGrid = useMemo(() => {
    const dayMap = new Map(schedule.days.map((d) => [d.date, d]));
    return grid.map((cell) => {
      if (!cell) return null;
      return dayMap.get(cell.date) ?? cell;
    });
  }, [grid, schedule.days]);

  const stats = useMemo(() => {
    const openDays = schedule.days.filter(
      (d) => d.status !== 'closed' && d.status !== 'external'
    );
    const assigned = schedule.assignments.length;
    const conflicts = schedule.conflicts.length;
    const total = openDays.length;

    return { total, assigned, conflicts, remaining: total - assigned };
  }, [schedule]);

  return { calendarGrid, stats };
}
