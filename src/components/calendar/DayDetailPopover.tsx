'use client';

import { useEffect, useRef } from 'react';
import type { CalendarDay, DJ } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import { getDayName } from '@/lib/calendar-utils';

interface DayDetailPopoverProps {
  day: CalendarDay;
  onClose: () => void;
  onAssign: (dj: DJ) => void;
  onUnassign: () => void;
  isInteractiveEditing?: boolean;
}

export default function DayDetailPopover({
  day,
  onClose,
  onAssign,
  onUnassign,
  isInteractiveEditing,
}: DayDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">
            {getDayName(day.date)}, {day.dayOfMonth}
          </p>
          <p className="text-xs text-gray-500">{STATUS_LABELS[day.status]}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {day.assignedDJ && (
        <div className="mb-3">
          <p className="text-xs text-gray-500">Assigned</p>
          <div className="flex items-center justify-between">
            <span className="font-medium text-green-700">{day.assignedDJ.name}</span>
            {(!day.isLocked || isInteractiveEditing) && (
              <button
                onClick={onUnassign}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {day.availableDJs.length > 0 && !day.assignedDJ && (
        <div>
          <p className="mb-1 text-xs text-gray-500">Available DJs</p>
          <div className="space-y-1">
            {day.availableDJs.map((dj) => (
              <button
                key={dj.id}
                onClick={() => onAssign(dj)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-blue-50"
              >
                <span>
                  {dj.name}
                  {dj.isPriority && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700">
                      Priority
                    </span>
                  )}
                </span>
                <span className="text-xs text-blue-600">Assign</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {day.availableDJs.length === 0 && !day.assignedDJ && (
        <p className="text-sm text-gray-400">No DJs available</p>
      )}
    </div>
  );
}
