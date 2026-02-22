'use client';

import { useState } from 'react';
import type {
  MonthSchedule,
  ResolutionState,
  OptimizationScenario,
} from '@/lib/types';
import ExportButton from '../shared/ExportButton';

interface ResolutionPanelProps {
  schedule: MonthSchedule;
  resolutionState: ResolutionState;
  onConfirm: () => void;
  onMakeChanges: (adjustmentText: string) => void;
  onSelectScenario: (scenarioId: string) => void;
  onFinalize: () => void;
  onRetry: () => void;
  onClearSchedule: () => void;
}

export default function ResolutionPanel({
  schedule,
  resolutionState,
  onConfirm,
  onMakeChanges,
  onSelectScenario,
  onFinalize,
  onRetry,
  onClearSchedule,
}: ResolutionPanelProps) {
  const { phase, result, selectedScenarioId, verification } = resolutionState;
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Loading states
  if (phase === 'optimizing' || phase === 'reoptimizing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Spinner className="text-blue-600 mb-4" />
        <p className="text-sm font-medium text-gray-700">Optimizing schedule...</p>
        <p className="text-xs text-gray-400 mt-1">AI is solving all conflicts at once</p>
      </div>
    );
  }

  if (phase === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Spinner className="text-green-600 mb-4" />
        <p className="text-sm font-medium text-gray-700">Verifying solution...</p>
        <p className="text-xs text-gray-400 mt-1">Checking all constraints</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-red-600 mb-2">Optimization Failed</p>
        <p className="text-xs text-gray-500 mb-4">{resolutionState.errorMessage}</p>
        <button
          onClick={onRetry}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Adjustment text input (escape hatch)
  if (phase === 'adjusting' || showAdjustInput) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Describe what changes you want. The optimizer will re-run with your instructions.
          </p>
          <textarea
            value={adjustmentText}
            onChange={(e) => setAdjustmentText(e.target.value)}
            placeholder="e.g. Move Alex to the 21st instead, and give George the 14th..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
          />
        </div>
        <div className="border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={() => {
              setShowAdjustInput(false);
              setAdjustmentText('');
            }}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowAdjustInput(false);
              onMakeChanges(adjustmentText);
              setAdjustmentText('');
            }}
            disabled={!adjustmentText.trim()}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Re-optimize
          </button>
        </div>
      </div>
    );
  }

  // Finalized state
  if (schedule.status === 'finalized') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
            <p className="text-sm font-medium text-green-700">Schedule finalized!</p>
          </div>
          {result && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs font-medium text-blue-800 mb-1">Summary</p>
              <p className="text-sm text-blue-700">{result.explanation}</p>
            </div>
          )}
          {schedule.parsedConstraints && schedule.parsedConstraints.length > 0 && (
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
              <p className="text-xs font-medium text-teal-800 mb-1">Applied Constraints</p>
              {schedule.parsedConstraints.map((c, i) => (
                <p key={i} className="text-xs text-teal-700">
                  {c.isHard ? '(required)' : '(preferred)'} {c.description}
                </p>
              ))}
            </div>
          )}

          {schedule.unassignedDJs.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-xs font-medium text-amber-800">Not scheduled this month</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {schedule.unassignedDJs.map((dj) => (
                  <span
                    key={dj.id}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      dj.isPriority
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {dj.name}
                    {dj.isPriority && (
                      <svg className="h-3 w-3 ml-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 p-4 space-y-3">
          <ExportButton schedule={schedule} />

          {showClearConfirm ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-xs text-red-700 font-medium">
                Are you sure? This will clear the entire schedule for this month.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowClearConfirm(false);
                    onClearSchedule();
                  }}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Yes, Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Clear Schedule
            </button>
          )}
        </div>
      </div>
    );
  }

  // Result phase
  if (phase === 'result' && result) {
    // Major conflicts — show scenario options (calendar previews selected scenario)
    if (result.hasMajorConflicts && result.scenarios && result.scenarios.length > 0) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Decisions Needed</p>
              <p className="text-sm text-amber-700">{result.explanation}</p>
            </div>

            {result.unresolvable.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-xs font-medium text-red-800 mb-1">Could not fill</p>
                {result.unresolvable.map((u) => (
                  <p key={u.date} className="text-xs text-red-700">{u.date}: {u.reason}</p>
                ))}
              </div>
            )}

            {schedule.unassignedDJs.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <p className="text-xs font-medium text-amber-800">Not scheduled this month</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {schedule.unassignedDJs.map((dj) => (
                    <span
                      key={dj.id}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        dj.isPriority
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {dj.name}
                      {dj.isPriority && (
                        <svg className="h-3 w-3 ml-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-700">
                You can also drag DJs on the calendar to rearrange assignments, or click gray days to open new slots.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Choose a scenario
              </h4>
              <p className="text-xs text-gray-500">
                Click a scenario to preview it on the calendar.
              </p>
              {result.scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={selectedScenarioId === scenario.id}
                  onSelect={() => onSelectScenario(scenario.id)}
                />
              ))}

              <button
                onClick={() => setShowAdjustInput(true)}
                className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                Other: describe what you want...
              </button>
            </div>

            {verification && !verification.isValid && (
              <VerificationWarnings violations={verification.violations} />
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={onConfirm}
              disabled={!selectedScenarioId}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Confirm Selected Scenario
            </button>
          </div>
        </div>
      );
    }

    // Minor conflicts — calendar already shows the solution, sidebar has explanation + buttons only
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-xs font-medium text-green-800">All conflicts resolved</p>
            </div>
            <p className="text-sm text-green-700">{result.explanation}</p>
          </div>

          {schedule.unassignedDJs.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-xs font-medium text-amber-800">Not scheduled this month</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {schedule.unassignedDJs.map((dj) => (
                  <span
                    key={dj.id}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      dj.isPriority
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {dj.name}
                    {dj.isPriority && (
                      <svg className="h-3 w-3 ml-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-700">
              You can drag DJs on the calendar to rearrange assignments, click gray days to open new slots, or drag DJs from the pool below.
            </p>
          </div>

          {result.unresolvable.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">Could not fill</p>
              {result.unresolvable.map((u) => (
                <p key={u.date} className="text-xs text-amber-700">{u.date}: {u.reason}</p>
              ))}
            </div>
          )}

          {verification && !verification.isValid && (
            <VerificationWarnings violations={verification.violations} />
          )}
        </div>

        <div className="border-t border-gray-200 p-4 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowAdjustInput(true)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Make Changes
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Sub-components ───

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`h-8 w-8 animate-spin ${className ?? ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ScenarioCard({
  scenario,
  isSelected,
  onSelect,
}: {
  scenario: OptimizationScenario;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <p className="text-sm font-medium text-gray-900 mb-1">{scenario.label}</p>
      <p className="text-xs text-gray-500 mb-2">{scenario.description}</p>
      <div className="space-y-1">
        {scenario.assignments.map((a) => (
          <p key={a.date} className="text-[10px] text-gray-400">
            {a.date.split('-')[2]}: {a.djName}
          </p>
        ))}
      </div>
    </button>
  );
}

function VerificationWarnings({ violations }: { violations: { message: string }[] }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
      <p className="text-xs font-medium text-red-800 mb-1">Verification Warnings</p>
      {violations.map((v, i) => (
        <p key={i} className="text-xs text-red-700">{v.message}</p>
      ))}
    </div>
  );
}
