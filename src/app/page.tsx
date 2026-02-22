'use client';

import { useCallback, useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import Header from '@/components/layout/Header';
import Calendar from '@/components/calendar/Calendar';
import ActionPanel from '@/components/sidebar/ActionPanel';
import DJPool from '@/components/roster/DJPool';
import DJLoadingOverlay from '@/components/shared/DJLoadingOverlay';
import PasswordGate from '@/components/shared/PasswordGate';
import { DragProvider } from '@/contexts/DragContext';
import { useSchedule } from '@/hooks/useSchedule';
import { apiFetch, isAuthenticated as checkAuth } from '@/lib/api-client';
import type { DJ, ExtractionResult, EngineInput, MonthSchedule } from '@/lib/types';

const now = new Date();

export default function Home() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setIsAuthed(checkAuth());
    setAuthChecked(true);
  }, []);

  const {
    month,
    year,
    schedule,
    extraction,
    sidebarMode,
    isProcessing,
    resolutionState,
    isInteractiveEditing,
    isLoadingSchedule,
    defaultConstraints,
    setIsProcessing,
    setSchedule,
    changeMonth,
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
    toggleDayOpenClosed,
    addDJToPool,
    removeDJFromPool,
    swapDJs,
    moveDJBetweenDays,
    moveDJFromPool,
    poolToOccupiedSwap,
    clearSchedule,
  } = useSchedule(now.getMonth() + 1, now.getFullYear());

  const runOptimizer = useCallback(
    async (scheduleToOptimize: MonthSchedule, userAdjustment?: string) => {
      setResolutionPhase('optimizing');
      try {
        const res = await apiFetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schedule: scheduleToOptimize,
            userAdjustment,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Optimization failed');
        }

        setResolutionPhase('verifying');
        const { result, verification } = await res.json();
        setOptimizationResult(result, verification);

        // Immediately preview the recommended assignments on the calendar
        previewOptimizationAssignments(result.assignments);
      } catch (error) {
        setResolutionError(
          error instanceof Error ? error.message : 'Optimization failed'
        );
      }
    },
    [setResolutionPhase, setOptimizationResult, setResolutionError, previewOptimizationAssignments]
  );

  const handleProcess = useCallback(
    async (availabilityChat: string, userConstraints: string) => {
      setIsProcessing(true);
      try {
        const res = await apiFetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            availabilityChat,
            userConstraints: userConstraints || undefined,
            month,
            year,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Extraction failed');
        }

        const result: ExtractionResult = await res.json();
        applyExtraction(result);
      } catch (error) {

        alert(error instanceof Error ? error.message : 'Processing failed');
      } finally {
        setIsProcessing(false);
      }
    },
    [month, year, applyExtraction, setIsProcessing]
  );

  const handleConfirmExtraction = useCallback(async () => {
    if (!extraction) return;

    setIsProcessing(true);
    try {
      const engineInput: EngineInput = {
        schedule,
        availabilities: extraction.availabilities,
        priorityDJs: extraction.priorityDJs,
      };

      const res = await apiFetch('/api/schedule/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engineInput),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Engine failed');
      }

      const result = await res.json();

      // Attach parsed constraints to the schedule so they flow to optimizer/verifier
      if (extraction.parsedConstraints?.length) {
        result.schedule.parsedConstraints = extraction.parsedConstraints;
      }

      applyEngineResult(result);

      // Auto-trigger optimizer if conflicts exist
      if (result.conflicts.length > 0) {
        await runOptimizer(result.schedule);
      }
    } catch (error) {

      alert(error instanceof Error ? error.message : 'Engine failed');
    } finally {
      setIsProcessing(false);
    }
  }, [extraction, schedule, applyEngineResult, setIsProcessing, runOptimizer]);

  const handleEditAvailability = useCallback(
    (djId: string, dates: string[]) => {
      if (!extraction) return;
      const updated = {
        ...extraction,
        availabilities: extraction.availabilities.map((a) =>
          a.djId === djId ? { ...a, availableDates: dates } : a
        ),
      };
      applyExtraction(updated);
    },
    [extraction, applyExtraction]
  );

  const handleAssignDJ = useCallback(
    (date: string, dj: DJ, method: 'ai' | 'manual' = 'manual') => {
      assignDJ(date, dj, method);
    },
    [assignDJ]
  );

  const handleConfirmOptimization = useCallback(() => {
    // Calendar already shows the preview — just finalize
    confirmOptimization();
  }, [confirmOptimization]);

  const handleSelectScenario = useCallback(
    (scenarioId: string) => {
      selectScenario(scenarioId);
      // Preview this scenario's assignments on the calendar
      const scenario = resolutionState.result?.scenarios?.find((s) => s.id === scenarioId);
      if (scenario) {
        previewOptimizationAssignments(scenario.assignments);
      }
    },
    [selectScenario, resolutionState.result, previewOptimizationAssignments]
  );

  const handleMakeChanges = useCallback(
    async (adjustmentText: string) => {
      // Revert calendar to pre-optimization state, then re-optimize
      revertOptimizationPreview();
      const cleanSchedule = getPreOptimizationSchedule();
      if (cleanSchedule) {
        await runOptimizer(cleanSchedule, adjustmentText);
      }
    },
    [revertOptimizationPreview, getPreOptimizationSchedule, runOptimizer]
  );

  const handleRetryOptimization = useCallback(async () => {
    revertOptimizationPreview();
    const cleanSchedule = getPreOptimizationSchedule();
    if (cleanSchedule) {
      await runOptimizer(cleanSchedule);
    }
  }, [revertOptimizationPreview, getPreOptimizationSchedule, runOptimizer]);

  const handleFinalize = useCallback(async () => {
    try {
      await apiFetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, status: 'finalized' }),
      });

      // Save unassigned DJs as priority for next month
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const priorityNames = schedule.unassignedDJs.map((dj) => dj.name);
      if (priorityNames.length > 0) {
        await apiFetch('/api/schedule/priority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month: nextMonth, year: nextYear, djNames: priorityNames }),
        });
      }

      setSchedule((prev) => ({ ...prev, status: 'finalized' }));
    } catch (error) {

    }
  }, [schedule, month, year, setSchedule]);

  const handleClearSchedule = useCallback(async () => {
    try {
      await apiFetch('/api/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
    } catch (error) {

    }
    clearSchedule();
  }, [month, year, clearSchedule]);

  const roster = extraction?.roster ?? [];

  if (!authChecked || isLoadingSchedule) return null;

  if (!isAuthed) {
    return (
      <PasswordGate
        onSuccess={() => {
          setIsAuthed(true);
        }}
      />
    );
  }

  return (
    <DragProvider>
      <AppShell
        header={
          <Header month={month} year={year} onChangeMonth={changeMonth} />
        }
        calendar={
          <Calendar
            schedule={schedule}
            onCycleStatus={cycleDayStatus}
            onAssignDJ={handleAssignDJ}
            onUnassign={unassignDJ}
            isSetupMode={sidebarMode === 'setup'}
            isInteractiveEditing={isInteractiveEditing}
            onToggleDayOpenClosed={toggleDayOpenClosed}
            onSwapDJs={swapDJs}
            onMoveDJBetweenDays={moveDJBetweenDays}
            onMoveDJFromPool={moveDJFromPool}
            onPoolToOccupiedSwap={poolToOccupiedSwap}
          />
        }
        sidebar={
          <ActionPanel
            mode={sidebarMode}
            schedule={schedule}
            extraction={extraction}
            isProcessing={isProcessing}
            resolutionState={resolutionState}
            defaultConstraints={defaultConstraints}
            onProcess={handleProcess}
            onConfirmExtraction={handleConfirmExtraction}
            onEditAvailability={handleEditAvailability}
            onConfirmOptimization={handleConfirmOptimization}
            onMakeChanges={handleMakeChanges}
            onSelectScenario={handleSelectScenario}
            onFinalize={handleFinalize}
            onRetryOptimization={handleRetryOptimization}
            onClearSchedule={handleClearSchedule}
          />
        }
        roster={
          <DJPool
            schedule={schedule}
            roster={roster}
            isInteractiveEditing={isInteractiveEditing}
            onReturnDJToPool={unassignDJ}
            onAddDJ={addDJToPool}
            onRemoveDJ={removeDJFromPool}
          />
        }
      />
      <DJLoadingOverlay phase={sidebarMode === 'resolve' ? resolutionState.phase : 'result'} />
    </DragProvider>
  );
}
