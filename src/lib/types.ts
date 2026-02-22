// ─── Core Domain Types ───

export interface DJ {
  id: string;
  name: string;
  isPriority: boolean;
}

export type DayStatus =
  | 'closed'
  | 'open'
  | 'external'
  | 'holiday'
  | 'auto-assigned'
  | 'ai-assigned'
  | 'manual-assigned'
  | 'conflict';

export interface CalendarDay {
  date: string; // ISO date string YYYY-MM-DD
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth: number;
  status: DayStatus;
  assignedDJ?: DJ;
  availableDJs: DJ[];
  isLocked: boolean;
  note?: string;
}

export interface DJAvailability {
  djId: string;
  djName: string;
  availableDates: string[]; // ISO date strings
  rawText: string;
  isExclusion: boolean; // true = "available all except X", false = "available only on X"
  confidence: number; // 0-1
  needsReview: boolean;
  reviewNote?: string;
}

export type AssignmentMethod = 'priority' | 'bottleneck' | 'ai' | 'manual';

export interface Assignment {
  date: string; // ISO date string
  djId: string;
  djName: string;
  method: AssignmentMethod;
}

export interface Conflict {
  date: string;
  competingDJs: DJ[];
  reason: string;
}

export type ScheduleStatus = 'draft' | 'processing' | 'review' | 'resolving' | 'finalized';

export interface MonthSchedule {
  month: number; // 1-12
  year: number;
  days: CalendarDay[];
  assignments: Assignment[];
  unassignedDJs: DJ[];
  conflicts: Conflict[];
  status: ScheduleStatus;
  parsedConstraints?: ParsedConstraint[];
}

// ─── User Constraints ───

export type UserConstraintType =
  | 'priority'          // "Alex is priority this month"
  | 'must-play-date'    // "Kosmas must play on the 21st"
  | 'extra-dj'          // "Extra DJ Fil available on Fridays"
  | 'exclude-dj'        // "Don't schedule Maria this month"
  | 'prefer-date'       // "Try to give Alex a Saturday" (soft)
  | 'custom';           // Anything else

export interface ParsedConstraint {
  type: UserConstraintType;
  description: string;
  rawText: string;
  djName?: string;
  date?: string;          // ISO date string if applicable
  dates?: string[];       // Multiple ISO dates
  isHard: boolean;        // true = verifier flags if violated
}

// ─── Extraction Types ───

export interface ExtractionInput {
  availabilityChat: string;
  userConstraints?: string;
  month: number;
  year: number;
}

export interface ExtractionResult {
  roster: DJ[];
  availabilities: DJAvailability[];
  priorityDJs: string[];
  parsedConstraints: ParsedConstraint[];
  warnings: string[];
  unmatchedNames: string[];
}

// ─── Engine Types ───

export interface EngineInput {
  schedule: MonthSchedule;
  availabilities: DJAvailability[];
  priorityDJs: string[];
}

export interface EngineResult {
  schedule: MonthSchedule;
  autoAssignments: Assignment[];
  conflicts: Conflict[];
  stats: EngineStats;
}

export interface EngineStats {
  totalSlots: number;
  autoAssigned: number;
  priorityAssigned: number;
  bottleneckAssigned: number;
  conflictsRemaining: number;
  djsUnassigned: number;
}

// ─── Verification Types ───

export interface VerificationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
}

export type ViolationType =
  | 'double-booking-dj'
  | 'double-booking-date'
  | 'priority-unassigned'
  | 'unfilled-date'
  | 'invalid-assignment'
  | 'user-constraint-violated';

export interface ConstraintViolation {
  type: ViolationType;
  message: string;
  affectedDJs: string[];
  affectedDates: string[];
}

// ─── UI State Types ───

export type SidebarMode = 'setup' | 'review' | 'resolve';

export interface AppState {
  month: number;
  year: number;
  schedule: MonthSchedule | null;
  extraction: ExtractionResult | null;
  sidebarMode: SidebarMode;
  isProcessing: boolean;
}

// ─── Conflict Classification ───

export type ConflictSeverity = 'minor' | 'major';

export interface ClassifiedConflict extends Conflict {
  severity: ConflictSeverity;
  classificationReason: string;
}

// ─── Optimizer Output Types ───

export interface OptimizationAssignment {
  date: string;
  djId: string;
  djName: string;
  reason: string;
}

export interface OptimizationScenario {
  id: string;
  label: string;
  description: string;
  assignments: OptimizationAssignment[];
}

export interface OptimizationResult {
  assignments: OptimizationAssignment[];
  explanation: string;
  hasMajorConflicts: boolean;
  scenarios?: OptimizationScenario[];
  unresolvable: { date: string; reason: string }[];
}

// ─── Resolution Panel State ───

export type ResolutionPhase =
  | 'optimizing'
  | 'verifying'
  | 'result'
  | 'adjusting'
  | 'reoptimizing'
  | 'error';

export interface ResolutionState {
  phase: ResolutionPhase;
  result: OptimizationResult | null;
  selectedScenarioId: string | null;
  verification: VerificationResult | null;
  retryCount: number;
  errorMessage: string | null;
}
