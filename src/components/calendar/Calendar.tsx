'use client';

import type { MonthSchedule, DJ, DayStatus } from '@/lib/types';
import { useCalendar } from '@/hooks/useCalendar';
import CalendarDayCell from './CalendarDay';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';

interface CalendarProps {
  schedule: MonthSchedule;
  onCycleStatus: (date: string) => void;
  onAssignDJ: (date: string, dj: DJ) => void;
  onUnassign: (date: string) => void;
  isSetupMode: boolean;
  isInteractiveEditing?: boolean;
  onToggleDayOpenClosed?: (date: string) => void;
  onSwapDJs?: (dateA: string, dateB: string) => void;
  onMoveDJBetweenDays?: (fromDate: string, toDate: string) => void;
  onMoveDJFromPool?: (toDate: string, dj: DJ) => void;
  onPoolToOccupiedSwap?: (toDate: string, dj: DJ) => void;
}

const WEEK_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SETUP_STATUSES: DayStatus[] = ['closed', 'open', 'external', 'holiday'];

function getStatusFromDay(day: { status: DayStatus } | null): DayStatus | null {
  if (!day) return null;
  if (SETUP_STATUSES.includes(day.status)) return day.status;
  return null;
}

export default function Calendar({
  schedule,
  onCycleStatus,
  onAssignDJ,
  onUnassign,
  isSetupMode,
  isInteractiveEditing,
  onToggleDayOpenClosed,
  onSwapDJs,
  onMoveDJBetweenDays,
  onMoveDJFromPool,
  onPoolToOccupiedSwap,
}: CalendarProps) {
  const { calendarGrid, stats } = useCalendar(schedule);

  const handleStatusClick = (targetStatus: DayStatus) => {
    calendarGrid.forEach((day) => {
      if (day && getStatusFromDay(day) === targetStatus) {
        onCycleStatus(day.date);
      }
    });
  };

  const handleBulkCycle = () => {
    calendarGrid.forEach((day) => {
      if (day && SETUP_STATUSES.includes(day.status)) {
        onCycleStatus(day.date);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>
          Slots: <strong>{stats.assigned}</strong>/{stats.total} filled
        </span>

        {isSetupMode && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">|</span>
            <span className="text-xs text-gray-500">Click on a day to cycle:</span>
            {SETUP_STATUSES.map((status) => {
              const count = calendarGrid.filter(
                (d) => d && getStatusFromDay(d) === status
              ).length;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80 ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} ${STATUS_COLORS[status].border} border`}
                >
                  {STATUS_LABELS[status]}
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
            <button
              onClick={handleBulkCycle}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
            >
              Cycle All
            </button>
          </div>
        )}

        {isInteractiveEditing && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">|</span>
            <span className="text-xs text-blue-600">
              Drag DJs between days to rearrange. Click open/closed days to toggle availability.
            </span>
          </div>
        )}

        {stats.conflicts > 0 && (
          <span className="text-red-600">
            <strong>{stats.conflicts}</strong> conflict{stats.conflicts !== 1 ? 's' : ''}
          </span>
        )}
        {stats.remaining === 0 && stats.conflicts === 0 && (
          <span className="font-medium text-green-600">All slots filled!</span>
        )}
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* Week day headers */}
        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEK_HEADERS.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarGrid.map((day, idx) =>
            day ? (
              <CalendarDayCell
                key={day.date}
                day={day}
                onCycleStatus={onCycleStatus}
                onAssignDJ={(date, dj) => onAssignDJ(date, dj)}
                onUnassign={onUnassign}
                isSetupMode={isSetupMode}
                isInteractiveEditing={isInteractiveEditing}
                onToggleDayOpenClosed={onToggleDayOpenClosed}
                onSwapDJs={onSwapDJs}
                onMoveDJBetweenDays={onMoveDJBetweenDays}
                onMoveDJFromPool={onMoveDJFromPool}
                onPoolToOccupiedSwap={onPoolToOccupiedSwap}
              />
            ) : (
              <div key={`empty-${idx}`} className="h-24" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
