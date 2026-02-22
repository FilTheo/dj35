'use client';

import { useState } from 'react';
import { useDragContext } from '@/contexts/DragContext';
import type { DJ, Assignment } from '@/lib/types';

interface DJCardProps {
  dj: DJ;
  assignment?: Assignment;
  isDraggable?: boolean;
  onRemove?: (djId: string) => void;
}

export default function DJCard({ dj, assignment, isDraggable, onRemove }: DJCardProps) {
  const isAssigned = !!assignment;
  const { setDragPayload } = useDragContext();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dj.name);
    setDragPayload({ dj, sourceDate: null, sourceType: 'pool' });
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDragPayload(null);
    setIsDragging(false);
  };

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        isAssigned
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-white text-gray-700'
      } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <span className={`font-medium ${isAssigned ? 'line-through opacity-60' : ''}`}>
        {dj.name}
      </span>
      {dj.isPriority && (
        <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">
          P
        </span>
      )}
      {assignment && (
        <span className="ml-auto text-[10px] text-green-600">
          {assignment.date.split('-')[2]}
        </span>
      )}
      {onRemove && !isAssigned && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(dj.id);
          }}
          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500 text-xs hover:bg-red-200 group-hover:flex"
          title="Remove DJ"
        >
          &times;
        </button>
      )}
    </div>
  );
}
