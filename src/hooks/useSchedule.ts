'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  MonthSchedule,
  CalendarDay,
  DJ,
  DJAvailability,
  ExtractionResult,
  Assignment,
  SidebarMode,
  DayStatus,
  EngineResult,
  OptimizationAssignment,
  OptimizationResult,
  VerificationResult,
  ResolutionState,
  ResolutionPhase,
} from '@/lib/types';
import { generateMonthDays } from '@/lib/calendar-utils';
import { apiFetch } from '@/lib/api-client';

const INITIAL_RESOLUTION_STATE: ResolutionState = {
  phase: 'optimizing',
  result: null,
  selectedScenarioId: null,
  verification: null,
  retryCount: 0,
  errorMessage: null,
};

export function useSchedule(initialMonth: number, initialYear: number) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [schedule, setSchedule] = useState<MonthSchedule>(() =>
    createEmptySchedule(initialMonth, initialYear)
  );
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('setup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolutionState, setResolutionState] = useState<ResolutionState>(INITIAL_RESOLUTION_STATE);
  const [isInteractiveEditing, setIsInteractiveEditing] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [defaultConstraints, setDefaultConstraints] = useState('');

  // Snapshot of schedule before optimization preview is applied (post-engine, pre-optimizer)
  const preOptimizationScheduleRef = useRef<MonthSchedule | null>(null);

  const loadSchedule = useCallback(async (m: number, y: number) => {
    setIsLoadingSchedule(true);
    try {
      const res = await apiFetch(`/api/schedule?month=${m}&year=${y}`);
      const saved = await res.json();

      if (saved && saved.status === 'finalized') {
        setSchedule(saved);
        setSidebarMode('resolve');
        setResolutionState(INITIAL_RESOLUTION_STATE);
        setIsInteractiveEditing(false);
      } else {
        setSchedule(createEmptySchedule(m, y));
        setSidebarMode('setup');
      }

      // Load priority DJs for constraints pre-fill
      const priorityRes = await apiFetch(`/api/schedule/priority?month=${m}&year=${y}`);
      const priorityDJs: string[] = await priorityRes.json();
      if (Array.isArray(priorityDJs) && priorityDJs.length > 0) {
        setDefaultConstraints(
          `Priority DJs (didn't play last month): ${priorityDJs.join(', ')}`
        );
      } else {
        setDefaultConstraints('');
      }
    } catch {
      setSchedule(createEmptySchedule(m, y));
      setSidebarMode('setup');
      setDefaultConstraints('');
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  // Load saved schedule on initial mount
  useEffect(() => {
    loadSchedule(initialMonth, initialYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeMonth = useCallback((newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setExtraction(null);
    preOptimizationScheduleRef.current = null;
    loadSchedule(newMonth, newYear);
  }, [loadSchedule]);

  const toggleDayStatus = useCallback((date: string, newStatus: DayStatus) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.date === date && !d.isLocked ? { ...d, status: newStatus } : d
      ),
    }));
  }, []);

  const cycleDayStatus = useCallback((date: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.date !== date || d.isLocked) return d;
        const cycle: DayStatus[] = ['closed', 'open', 'external', 'holiday'];
        const currentIdx = cycle.indexOf(d.status);
        const nextStatus = currentIdx >= 0
          ? cycle[(currentIdx + 1) % cycle.length]
          : 'open';
        return { ...d, status: nextStatus };
      }),
    }));
  }, []);

  const applyExtraction = useCallback((result: ExtractionResult) => {
    setExtraction(result);
    setSidebarMode('review');

    // Merge availabilities into calendar days so the calendar shows available DJs during review
    setSchedule((prev) => {
      const newDays = prev.days.map((d) => ({ ...d, availableDJs: [] as DJ[] }));
      const dateMap = new Map(newDays.map((d) => [d.date, d]));

      for (const avail of result.availabilities) {
        const dj: DJ = {
          id: avail.djId,
          name: avail.djName,
          isPriority: result.priorityDJs.some(
            (p) => p.toLowerCase() === avail.djName.toLowerCase()
          ),
        };
        for (const dateStr of avail.availableDates) {
          const day = dateMap.get(dateStr);
          if (day && day.status !== 'closed' && day.status !== 'external') {
            if (!day.availableDJs.some((d) => d.id === dj.id)) {
              day.availableDJs.push(dj);
            }
          }
        }
      }

      return {
        ...prev,
        days: newDays,
        parsedConstraints: result.parsedConstraints?.length ? result.parsedConstraints : prev.parsedConstraints,
      };
    });
  }, []);

  const applyEngineResult = useCallback((result: EngineResult) => {
    setSchedule(result.schedule);
    // Store snapshot for optimization preview/revert cycle
    preOptimizationScheduleRef.current = structuredClone(result.schedule);
    if (result.conflicts.length > 0) {
      setSidebarMode('resolve');
      setResolutionState(INITIAL_RESOLUTION_STATE);
    }
  }, []);

  const assignDJ = useCallback(
    (date: string, dj: DJ, method: Assignment['method']) => {
      setSchedule((prev) => {
        const newAssignment: Assignment = {
          date,
          djId: dj.id,
          djName: dj.name,
          method,
        };

        const newDays = prev.days.map((d) => {
          if (d.date !== date) return d;
          return {
            ...d,
            assignedDJ: dj,
            status: (method === 'ai' ? 'ai-assigned' : 'manual-assigned') as DayStatus,
            isLocked: true,
          };
        });

        const newConflicts = prev.conflicts.filter((c) => c.date !== date);
        const newUnassigned = prev.unassignedDJs.filter((d) => d.id !== dj.id);

        return {
          ...prev,
          days: newDays,
          assignments: [...prev.assignments, newAssignment],
          conflicts: newConflicts,
          unassignedDJs: newUnassigned,
          status: newConflicts.length > 0 ? 'resolving' : 'finalized',
        };
      });
    },
    []
  );

  const unassignDJ = useCallback((date: string) => {
    setSchedule((prev) => {
      const assignment = prev.assignments.find((a) => a.date === date);
      if (!assignment) return prev;

      const newDays = prev.days.map((d) => {
        if (d.date !== date) return d;
        return {
          ...d,
          assignedDJ: undefined,
          status: 'open' as DayStatus,
          isLocked: false,
        };
      });

      const day = prev.days.find((d) => d.date === date);
      const dj = day?.assignedDJ;
      const newUnassigned = dj
        ? [...prev.unassignedDJs, dj]
        : prev.unassignedDJs;

      return {
        ...prev,
        days: newDays,
        assignments: prev.assignments.filter((a) => a.date !== date),
        unassignedDJs: newUnassigned,
      };
    });
  }, []);

  // ─── Resolution State Helpers ───

  const setResolutionPhase = useCallback((phase: ResolutionPhase) => {
    setResolutionState((prev) => ({ ...prev, phase }));
  }, []);

  const setOptimizationResult = useCallback(
    (result: OptimizationResult, verification: VerificationResult) => {
      setResolutionState((prev) => ({
        ...prev,
        phase: 'result' as ResolutionPhase,
        result,
        verification,
        selectedScenarioId: null,
      }));
      setIsInteractiveEditing(true);
    },
    []
  );

  const selectScenario = useCallback((scenarioId: string) => {
    setResolutionState((prev) => ({
      ...prev,
      selectedScenarioId: scenarioId,
    }));
  }, []);

  const setResolutionError = useCallback((errorMessage: string) => {
    setResolutionState((prev) => ({
      ...prev,
      phase: 'error' as ResolutionPhase,
      errorMessage,
    }));
  }, []);

  /**
   * Preview optimization assignments on the calendar immediately.
   * The schedule visually updates but isn't "confirmed" yet.
   */
  const previewOptimizationAssignments = useCallback(
    (optimizationAssignments: OptimizationAssignment[]) => {
      const snapshot = preOptimizationScheduleRef.current;
      if (!snapshot) return;

      // Always start from the clean snapshot to avoid stacking previews
      const base = structuredClone(snapshot);
      const newAssignments = [...base.assignments];
      const newDays = base.days;
      const assignedDJIds = new Set(newAssignments.map((a) => a.djId));
      const assignedDJNames = new Set(newAssignments.map((a) => a.djName));

      for (const oa of optimizationAssignments) {
        // Resolve the real DJ id by matching name against unassigned DJs or day availableDJs
        let resolvedId = oa.djId;
        const matchByName = base.unassignedDJs.find((d) => d.name === oa.djName)
          ?? base.days.flatMap((d) => d.availableDJs).find((d) => d.name === oa.djName);
        if (matchByName) {
          resolvedId = matchByName.id;
        }

        newAssignments.push({
          date: oa.date,
          djId: resolvedId,
          djName: oa.djName,
          method: 'ai',
        });
        assignedDJIds.add(resolvedId);
        assignedDJNames.add(oa.djName);

        const day = newDays.find((d) => d.date === oa.date);
        if (day) {
          day.assignedDJ = { id: resolvedId, name: oa.djName, isPriority: matchByName?.isPriority ?? false };
          day.status = 'ai-assigned';
          day.isLocked = true;
        }
      }

      const newConflicts = base.conflicts.filter(
        (c) => !optimizationAssignments.some((a) => a.date === c.date)
      );
      const newUnassigned = base.unassignedDJs.filter(
        (dj) => !assignedDJIds.has(dj.id) && !assignedDJNames.has(dj.name)
      );

      setSchedule({
        ...base,
        days: newDays,
        assignments: newAssignments,
        conflicts: newConflicts,
        unassignedDJs: newUnassigned,
        status: 'resolving',
      });
    },
    []
  );

  /**
   * Revert calendar to pre-optimization snapshot.
   */
  const revertOptimizationPreview = useCallback(() => {
    const snapshot = preOptimizationScheduleRef.current;
    if (snapshot) {
      setSchedule(structuredClone(snapshot));
    }
    setIsInteractiveEditing(false);
  }, []);

  /**
   * Confirm the current preview as final — set status to finalized.
   */
  const confirmOptimization = useCallback(() => {
    setSchedule((prev) => ({
      ...prev,
      status: 'finalized',
    }));
    preOptimizationScheduleRef.current = null;
    setIsInteractiveEditing(false);
  }, []);

  /**
   * Get the pre-optimization schedule (for re-running optimizer against clean state).
   */
  const getPreOptimizationSchedule = useCallback((): MonthSchedule | null => {
    return preOptimizationScheduleRef.current
      ? structuredClone(preOptimizationScheduleRef.current)
      : null;
  }, []);

  // ─── Interactive Editing Methods (drag-and-drop) ───

  const clearSchedule = useCallback(() => {
    setSchedule(createEmptySchedule(month, year));
    setExtraction(null);
    setSidebarMode('setup');
    setResolutionState(INITIAL_RESOLUTION_STATE);
    setIsInteractiveEditing(false);
    preOptimizationScheduleRef.current = null;
  }, [month, year]);

  const toggleDayOpenClosed = useCallback((date: string) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.date !== date) return d;
        if (d.status === 'closed') return { ...d, status: 'open' as DayStatus };
        if (d.status === 'open' && !d.assignedDJ && !d.isLocked) return { ...d, status: 'closed' as DayStatus };
        return d;
      }),
    }));
  }, []);

  const addDJToPool = useCallback((name: string) => {
    const id = `manual-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const dj: DJ = { id, name, isPriority: false };
    setSchedule((prev) => ({
      ...prev,
      unassignedDJs: [...prev.unassignedDJs, dj],
    }));
  }, []);

  const removeDJFromPool = useCallback((djId: string) => {
    setSchedule((prev) => ({
      ...prev,
      unassignedDJs: prev.unassignedDJs.filter((d) => d.id !== djId),
    }));
  }, []);

  const swapDJs = useCallback((dateA: string, dateB: string) => {
    setSchedule((prev) => {
      const dayA = prev.days.find((d) => d.date === dateA);
      const dayB = prev.days.find((d) => d.date === dateB);
      if (!dayA?.assignedDJ || !dayB?.assignedDJ) return prev;

      const djA = dayA.assignedDJ;
      const djB = dayB.assignedDJ;

      const newDays = prev.days.map((d) => {
        if (d.date === dateA) {
          return { ...d, assignedDJ: djB, status: 'manual-assigned' as DayStatus, isLocked: true };
        }
        if (d.date === dateB) {
          return { ...d, assignedDJ: djA, status: 'manual-assigned' as DayStatus, isLocked: true };
        }
        return d;
      });

      const newAssignments = prev.assignments.map((a) => {
        if (a.date === dateA) return { ...a, djId: djB.id, djName: djB.name, method: 'manual' as const };
        if (a.date === dateB) return { ...a, djId: djA.id, djName: djA.name, method: 'manual' as const };
        return a;
      });

      return { ...prev, days: newDays, assignments: newAssignments };
    });
  }, []);

  const moveDJBetweenDays = useCallback((fromDate: string, toDate: string) => {
    setSchedule((prev) => {
      const fromDay = prev.days.find((d) => d.date === fromDate);
      if (!fromDay?.assignedDJ) return prev;
      const dj = fromDay.assignedDJ;

      const newDays = prev.days.map((d) => {
        if (d.date === fromDate) {
          return { ...d, assignedDJ: undefined, status: 'open' as DayStatus, isLocked: false };
        }
        if (d.date === toDate) {
          return { ...d, assignedDJ: dj, status: 'manual-assigned' as DayStatus, isLocked: true };
        }
        return d;
      });

      const newAssignments = prev.assignments
        .filter((a) => a.date !== fromDate)
        .concat({ date: toDate, djId: dj.id, djName: dj.name, method: 'manual' as const });

      return { ...prev, days: newDays, assignments: newAssignments };
    });
  }, []);

  const moveDJFromPool = useCallback((toDate: string, dj: DJ) => {
    setSchedule((prev) => {
      const newDays = prev.days.map((d) => {
        if (d.date !== toDate) return d;
        return { ...d, assignedDJ: dj, status: 'manual-assigned' as DayStatus, isLocked: true };
      });

      const newAssignments = [...prev.assignments, {
        date: toDate, djId: dj.id, djName: dj.name, method: 'manual' as const,
      }];
      const newUnassigned = prev.unassignedDJs.filter((d) => d.id !== dj.id);
      const newConflicts = prev.conflicts.filter((c) => c.date !== toDate);

      return { ...prev, days: newDays, assignments: newAssignments, unassignedDJs: newUnassigned, conflicts: newConflicts };
    });
  }, []);

  const poolToOccupiedSwap = useCallback((toDate: string, incomingDJ: DJ) => {
    setSchedule((prev) => {
      const toDay = prev.days.find((d) => d.date === toDate);
      if (!toDay?.assignedDJ) return prev;
      const displacedDJ = toDay.assignedDJ;

      const newDays = prev.days.map((d) => {
        if (d.date === toDate) {
          return { ...d, assignedDJ: incomingDJ, status: 'manual-assigned' as DayStatus, isLocked: true };
        }
        return d;
      });

      const newAssignments = prev.assignments.map((a) => {
        if (a.date === toDate) return { ...a, djId: incomingDJ.id, djName: incomingDJ.name, method: 'manual' as const };
        return a;
      });

      const newUnassigned = prev.unassignedDJs
        .filter((d) => d.id !== incomingDJ.id)
        .concat(displacedDJ);

      return { ...prev, days: newDays, assignments: newAssignments, unassignedDJs: newUnassigned };
    });
  }, []);

  return {
    month,
    year,
    schedule,
    extraction,
    sidebarMode,
    isProcessing,
    resolutionState,
    setSchedule,
    setIsProcessing,
    changeMonth,
    toggleDayStatus,
    cycleDayStatus,
    applyExtraction,
    applyEngineResult,
    assignDJ,
    unassignDJ,
    setSidebarMode,
    setResolutionPhase,
    setOptimizationResult,
    selectScenario,
    setResolutionError,
    previewOptimizationAssignments,
    revertOptimizationPreview,
    confirmOptimization,
    getPreOptimizationSchedule,
    isInteractiveEditing,
    isLoadingSchedule,
    defaultConstraints,
    clearSchedule,
    toggleDayOpenClosed,
    addDJToPool,
    removeDJFromPool,
    swapDJs,
    moveDJBetweenDays,
    moveDJFromPool,
    poolToOccupiedSwap,
  };
}

function createEmptySchedule(month: number, year: number): MonthSchedule {
  return {
    month,
    year,
    days: generateMonthDays(month, year),
    assignments: [],
    unassignedDJs: [],
    conflicts: [],
    status: 'draft',
  };
}
