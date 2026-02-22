'use client';

import type { CalendarDay as CalendarDayType, DJ } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/constants';
import { useState } from 'react';
import { useDragContext } from '@/contexts/DragContext';
import DayDetailPopover from './DayDetailPopover';

interface CalendarDayProps {
  day: CalendarDayType;
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

const DROPPABLE_STATUSES = new Set(['open', 'auto-assigned', 'ai-assigned', 'manual-assigned', 'conflict']);

export default function CalendarDayCell({
  day,
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
}: CalendarDayProps) {
  const [showPopover, setShowPopover] = useState(false);
  const colors = STATUS_COLORS[day.status];
  const { dragPayload, setDragPayload, dropTargetDate, setDropTargetDate } = useDragContext();

  const isDragging = dragPayload?.sourceDate === day.date;
  const isDropTarget = dropTargetDate === day.date;
  const canDrag = isInteractiveEditing && !!day.assignedDJ;
  const isValidDropTarget = isInteractiveEditing && DROPPABLE_STATUSES.has(day.status) && !isDragging;

  const handleClick = () => {
    if (isSetupMode && !day.isLocked) {
      onCycleStatus(day.date);
    } else if (isInteractiveEditing && (day.status === 'closed' || (day.status === 'open' && !day.assignedDJ && !day.isLocked)) && onToggleDayOpenClosed) {
      onToggleDayOpenClosed(day.date);
    } else {
      setShowPopover(true);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag || !day.assignedDJ) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', day.assignedDJ.name);
    setDragPayload({ dj: day.assignedDJ, sourceDate: day.date, sourceType: 'calendar' });
  };

  const handleDragEnd = () => {
    setDragPayload(null);
    setDropTargetDate(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isValidDropTarget || !dragPayload) return;
    // Don't allow dropping on self
    if (dragPayload.sourceDate === day.date) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetDate(day.date);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dropTargetDate === day.date) {
      setDropTargetDate(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetDate(null);
    if (!dragPayload || !isInteractiveEditing) return;

    const { dj, sourceDate, sourceType } = dragPayload;

    if (sourceType === 'calendar' && sourceDate) {
      if (day.assignedDJ) {
        // Swap two assigned days
        onSwapDJs?.(sourceDate, day.date);
      } else {
        // Move from one day to empty day
        onMoveDJBetweenDays?.(sourceDate, day.date);
      }
    } else if (sourceType === 'pool') {
      if (day.assignedDJ) {
        // Pool DJ replaces calendar DJ (displaced goes to pool)
        onPoolToOccupiedSwap?.(day.date, dj);
      } else {
        // Pool DJ to empty day
        onMoveDJFromPool?.(day.date, dj);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex h-24 w-full flex-col items-start overflow-hidden rounded-lg border p-2 text-left
          transition-all hover:shadow-md
          ${colors.bg} ${colors.border} ${colors.text}
          ${day.isLocked ? 'ring-2 ring-green-400' : ''}
          ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
          ${isDragging ? 'opacity-40 border-dashed' : ''}
          ${isDropTarget ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}
          ${isInteractiveEditing && (day.status === 'closed' || (day.status === 'open' && !day.assignedDJ && !day.isLocked)) ? 'hover:ring-1 hover:ring-gray-400 cursor-pointer' : ''}
        `}
      >
        <span className="text-sm font-bold">{day.dayOfMonth}</span>
        {day.assignedDJ && (
          <div className="mt-1 flex w-full flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-semibold">
              {day.assignedDJ.name}
            </span>
            {day.availableDJs.length > 1 && (
              <>
                <div className="mt-0.5 w-full border-t border-gray-300/50" />
                <span className="truncate text-[9px] leading-tight text-gray-400">
                  {day.availableDJs
                    .filter((dj) => dj.id !== day.assignedDJ?.id)
                    .map((dj) => dj.name)
                    .join(', ')}
                </span>
              </>
            )}
          </div>
        )}
        {!day.assignedDJ && day.availableDJs.length > 0 && (
          <div className="mt-0.5 flex flex-col gap-0 overflow-hidden">
            {day.availableDJs.slice(0, 3).map((dj) => (
              <span key={dj.id} className={`truncate text-[10px] leading-tight ${dj.isPriority ? 'font-semibold' : 'opacity-70'}`}>
                {dj.name}
              </span>
            ))}
            {day.availableDJs.length > 3 && (
              <span className="text-[9px] opacity-50">
                +{day.availableDJs.length - 3} more
              </span>
            )}
          </div>
        )}
        {day.note && (
          <span className="mt-auto truncate text-[10px] italic opacity-60">
            {day.note}
          </span>
        )}
      </button>

      {showPopover && (
        <DayDetailPopover
          day={day}
          onClose={() => setShowPopover(false)}
          onAssign={(dj) => {
            onAssignDJ(day.date, dj);
            setShowPopover(false);
          }}
          onUnassign={() => {
            onUnassign(day.date);
            setShowPopover(false);
          }}
          isInteractiveEditing={isInteractiveEditing}
        />
      )}
    </div>
  );
}
