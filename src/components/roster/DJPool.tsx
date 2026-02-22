'use client';

import { useState, useRef, useEffect } from 'react';
import { useDragContext } from '@/contexts/DragContext';
import type { DJ, MonthSchedule } from '@/lib/types';
import DJCard from './DJCard';

interface DJPoolProps {
  schedule: MonthSchedule;
  roster: DJ[];
  isInteractiveEditing?: boolean;
  onReturnDJToPool?: (date: string) => void;
  onAddDJ?: (name: string) => void;
  onRemoveDJ?: (djId: string) => void;
}

export default function DJPool({ schedule, roster, isInteractiveEditing, onReturnDJToPool, onAddDJ, onRemoveDJ }: DJPoolProps) {
  const { dragPayload, setIsOverPool } = useDragContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddingDJ, setIsAddingDJ] = useState(false);
  const [newDJName, setNewDJName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingDJ && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingDJ]);

  if (roster.length === 0 && schedule.unassignedDJs.length === 0 && !isInteractiveEditing) {
    return (
      <div className="px-6 py-4">
        <p className="text-sm text-gray-400">
          DJ roster will appear here after processing availability chat.
        </p>
      </div>
    );
  }

  // Combine roster DJs with any manually added unassigned DJs not in roster
  const rosterIds = new Set(roster.map((dj) => dj.id));
  const manualDJs = schedule.unassignedDJs.filter((dj) => !rosterIds.has(dj.id));
  const allDJs = [...roster, ...manualDJs];

  const assigned = allDJs.filter((dj) =>
    schedule.assignments.some((a) => a.djId === dj.id)
  );
  const unassigned = allDJs.filter(
    (dj) => !schedule.assignments.some((a) => a.djId === dj.id)
  );

  const canDrop = isInteractiveEditing && dragPayload?.sourceType === 'calendar' && dragPayload.sourceDate;

  const handleDragOver = (e: React.DragEvent) => {
    if (!canDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    setIsOverPool(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    setIsOverPool(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsOverPool(false);
    if (canDrop && dragPayload.sourceDate && onReturnDJToPool) {
      onReturnDJToPool(dragPayload.sourceDate);
    }
  };

  const handleAddDJ = () => {
    const trimmed = newDJName.trim();
    if (trimmed && onAddDJ) {
      onAddDJ(trimmed);
      setNewDJName('');
      setIsAddingDJ(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddDJ();
    } else if (e.key === 'Escape') {
      setNewDJName('');
      setIsAddingDJ(false);
    }
  };

  return (
    <div
      className={`px-6 py-4 transition-colors ${isDragOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300 ring-dashed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            DJ Pool
            <span className="ml-2 text-xs font-normal text-gray-400">
              {assigned.length}/{allDJs.length} assigned
            </span>
          </h3>
          {isInteractiveEditing && (
            <button
              onClick={() => setIsAddingDJ(true)}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold hover:bg-blue-200 transition-colors"
              title="Add DJ"
            >
              +
            </button>
          )}
        </div>
        {isInteractiveEditing && (
          <span className="text-[10px] text-gray-400">
            Drag DJs to/from calendar
          </span>
        )}
      </div>

      {isAddingDJ && (
        <div className="mb-2 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newDJName}
            onChange={(e) => setNewDJName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="DJ name..."
            className="h-8 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={handleAddDJ}
            disabled={!newDJName.trim()}
            className="h-8 rounded-lg bg-blue-500 px-3 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setNewDJName(''); setIsAddingDJ(false); }}
            className="h-8 rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isDragOver && (
        <div className="mb-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-center text-xs text-blue-600">
          Drop here to unassign
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[...unassigned]
          .sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0))
          .map((dj) => (
            <DJCard
              key={dj.id}
              dj={dj}
              isDraggable={isInteractiveEditing}
              onRemove={isInteractiveEditing ? onRemoveDJ : undefined}
            />
          ))}
        {assigned.map((dj) => (
          <DJCard
            key={dj.id}
            dj={dj}
            assignment={schedule.assignments.find((a) => a.djId === dj.id)}
          />
        ))}
      </div>
    </div>
  );
}
