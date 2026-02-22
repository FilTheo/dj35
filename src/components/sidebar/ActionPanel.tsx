'use client';

import { useState } from 'react';
import type { SidebarMode, MonthSchedule, ExtractionResult, DJ, DJAvailability, ResolutionState, ParsedConstraint } from '@/lib/types';
import TranscriptInput from './TranscriptInput';
import ResolutionPanel from './ResolutionPanel';
import ExportButton from '../shared/ExportButton';

interface ActionPanelProps {
  mode: SidebarMode;
  schedule: MonthSchedule;
  extraction: ExtractionResult | null;
  isProcessing: boolean;
  resolutionState: ResolutionState;
  defaultConstraints?: string;
  onProcess: (availabilityChat: string, previousMonthConfirmation: string) => void;
  onConfirmExtraction: () => void;
  onEditAvailability: (djId: string, dates: string[]) => void;
  onConfirmOptimization: () => void;
  onMakeChanges: (adjustmentText: string) => void;
  onSelectScenario: (scenarioId: string) => void;
  onFinalize: () => void;
  onRetryOptimization: () => void;
  onClearSchedule: () => void;
}

export default function ActionPanel({
  mode,
  schedule,
  extraction,
  isProcessing,
  resolutionState,
  defaultConstraints,
  onProcess,
  onConfirmExtraction,
  onEditAvailability,
  onConfirmOptimization,
  onMakeChanges,
  onSelectScenario,
  onFinalize,
  onRetryOptimization,
  onClearSchedule,
}: ActionPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Mode header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <StepIndicator step={1} active={mode === 'setup'} done={mode !== 'setup'} label="Setup" />
          <div className="h-px flex-1 bg-gray-200" />
          <StepIndicator step={2} active={mode === 'review'} done={mode === 'resolve' || schedule.status === 'finalized'} label="Review" />
          <div className="h-px flex-1 bg-gray-200" />
          <StepIndicator step={3} active={mode === 'resolve'} done={schedule.status === 'finalized'} label="Resolve" />
        </div>
      </div>

      {/* Content by mode */}
      <div className="flex-1 overflow-auto">
        {mode === 'setup' && (
          <TranscriptInput onProcess={onProcess} isProcessing={isProcessing} defaultConstraints={defaultConstraints} />
        )}

        {mode === 'review' && extraction && (
          <ReviewPanel
            extraction={extraction}
            onConfirm={onConfirmExtraction}
            onEditAvailability={onEditAvailability}
          />
        )}

        {mode === 'resolve' && (
          <ResolutionPanel
            schedule={schedule}
            resolutionState={resolutionState}
            onConfirm={onConfirmOptimization}
            onMakeChanges={onMakeChanges}
            onSelectScenario={onSelectScenario}
            onFinalize={onFinalize}
            onRetry={onRetryOptimization}
            onClearSchedule={onClearSchedule}
          />
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  active,
  done,
  label,
}: {
  step: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? 'bg-green-100 text-green-700'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {done ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          step
        )}
      </div>
      <span className={`text-[10px] ${active ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function ReviewPanel({
  extraction,
  onConfirm,
  onEditAvailability,
}: {
  extraction: ExtractionResult;
  onConfirm: () => void;
  onEditAvailability: (djId: string, dates: string[]) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Review Extracted Data</h3>

      {extraction.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-medium text-amber-800 mb-1">Warnings</p>
          {extraction.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">{w}</p>
          ))}
        </div>
      )}

      {extraction.parsedConstraints.length > 0 && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
          <p className="text-xs font-medium text-teal-800 mb-2">Your Constraints</p>
          <div className="space-y-1.5">
            {extraction.parsedConstraints.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                  c.isHard ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div>
                  <p className="text-xs text-teal-700">{c.description}</p>
                  <p className="text-[10px] text-teal-500">
                    {c.type}{c.djName ? ` — ${c.djName}` : ''}{c.isHard ? ' (required)' : ' (preferred)'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {extraction.priorityDJs.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs font-medium text-blue-800 mb-1">Priority DJs</p>
          <div className="flex flex-wrap gap-1.5">
            {extraction.priorityDJs.map((name) => (
              <span key={name} className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {extraction.availabilities.map((avail) => (
          <AvailabilityCard key={avail.djId} availability={avail} />
        ))}
      </div>

      <button
        onClick={onConfirm}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Confirm & Run Engine
      </button>
    </div>
  );
}

function AvailabilityCard({ availability }: { availability: DJAvailability }) {
  const [expanded, setExpanded] = useState(false);
  const confidenceColor =
    availability.confidence >= 0.8
      ? 'text-green-600'
      : availability.confidence >= 0.5
      ? 'text-amber-600'
      : 'text-red-600';

  return (
    <div
      className={`rounded-lg border p-3 ${
        availability.needsReview ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1 gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 font-medium text-sm text-gray-900 cursor-pointer hover:text-blue-600 text-left min-w-0"
          aria-expanded={expanded}
        >
          <span className="truncate">{availability.djName}</span>
          <span className="shrink-0 text-gray-400" aria-hidden>
            {expanded ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </span>
        </button>
        <span className={`text-[10px] font-medium shrink-0 ${confidenceColor}`}>
          {Math.round(availability.confidence * 100)}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-1">
        {availability.isExclusion ? 'Available except: ' : 'Available on: '}
        {availability.availableDates.map((d) => d.split('-')[2]).join(', ')}
      </p>
      {availability.needsReview && availability.reviewNote && (
        <p className="text-[10px] text-amber-700 italic">{availability.reviewNote}</p>
      )}
      <p
        className={`text-[10px] text-gray-400 mt-1 ${expanded ? 'whitespace-normal' : 'truncate'}`}
      >
        &ldquo;{availability.rawText}&rdquo;
      </p>
    </div>
  );
}
