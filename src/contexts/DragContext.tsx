'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { DJ } from '@/lib/types';

export interface DragPayload {
  dj: DJ;
  sourceDate: string | null; // null = from unassigned pool
  sourceType: 'calendar' | 'pool';
}

interface DragContextValue {
  dragPayload: DragPayload | null;
  setDragPayload: (payload: DragPayload | null) => void;
  dropTargetDate: string | null;
  setDropTargetDate: (date: string | null) => void;
  isOverPool: boolean;
  setIsOverPool: (v: boolean) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  const [isOverPool, setIsOverPool] = useState(false);

  return (
    <DragContext.Provider
      value={{
        dragPayload,
        setDragPayload,
        dropTargetDate,
        setDropTargetDate,
        isOverPool,
        setIsOverPool,
      }}
    >
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error('useDragContext must be used within DragProvider');
  return ctx;
}
