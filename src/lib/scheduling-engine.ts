import type {
  CalendarDay,
  DJ,
  DJAvailability,
  Assignment,
  Conflict,
  ClassifiedConflict,
  ConflictSeverity,
  MonthSchedule,
  EngineInput,
  EngineResult,
  EngineStats,
} from './types';
import { MAX_GIGS_PER_DJ } from './constants';

/**
 * Core deterministic scheduling engine.
 * No AI — pure rule-based logic.
 */
export function runEngine(input: EngineInput): EngineResult {
  const { schedule, availabilities, priorityDJs } = input;

  // Deep clone schedule to avoid mutations
  const days = structuredClone(schedule.days);
  const assignments: Assignment[] = [...schedule.assignments];
  const assignedDJIds = new Set(assignments.map((a) => a.djId));

  // Build DJ roster from availabilities
  const roster: DJ[] = buildRoster(availabilities, priorityDJs);

  // Step 1: Merge availabilities into calendar days
  mergeAvailabilities(days, availabilities, schedule.month, schedule.year);

  // Step 2: Priority assignment (priority DJs with fewest options first)
  const priorityAssignments = assignPriorityDJs(days, roster, assignedDJIds);
  assignments.push(...priorityAssignments);

  // Step 3: Bottleneck loop (dates with only 1 available DJ)
  const bottleneckAssignments = assignBottlenecks(days, assignedDJIds);
  assignments.push(...bottleneckAssignments);

  // Step 4: Identify conflicts
  const conflicts = identifyConflicts(days, assignedDJIds);

  // Step 5: Build unassigned DJs list
  const unassignedDJs = roster.filter((dj) => !assignedDJIds.has(dj.id));

  // Compute stats
  const stats = computeStats(days, assignments, priorityAssignments, bottleneckAssignments, conflicts, unassignedDJs);

  const updatedSchedule: MonthSchedule = {
    ...schedule,
    days,
    assignments,
    unassignedDJs,
    conflicts,
    status: conflicts.length > 0 ? 'resolving' : 'finalized',
  };

  return {
    schedule: updatedSchedule,
    autoAssignments: [...priorityAssignments, ...bottleneckAssignments],
    conflicts,
    stats,
  };
}

function buildRoster(availabilities: DJAvailability[], priorityDJNames: string[]): DJ[] {
  const prioritySet = new Set(priorityDJNames.map((n) => n.toLowerCase()));
  const seen = new Set<string>();

  return availabilities
    .filter((a) => {
      if (seen.has(a.djId)) return false;
      seen.add(a.djId);
      return true;
    })
    .map((a) => ({
      id: a.djId,
      name: a.djName,
      isPriority: prioritySet.has(a.djName.toLowerCase()),
    }));
}

function mergeAvailabilities(
  days: CalendarDay[],
  availabilities: DJAvailability[],
  _month: number,
  _year: number
): void {
  const dateMap = new Map(days.map((d) => [d.date, d]));

  for (const avail of availabilities) {
    const dj: DJ = {
      id: avail.djId,
      name: avail.djName,
      isPriority: false, // Will be set by roster
    };

    for (const dateStr of avail.availableDates) {
      const day = dateMap.get(dateStr);
      if (day && day.status !== 'closed' && day.status !== 'external') {
        // Avoid duplicates
        if (!day.availableDJs.some((d) => d.id === dj.id)) {
          day.availableDJs.push(dj);
        }
      }
    }
  }
}

function assignPriorityDJs(
  days: CalendarDay[],
  roster: DJ[],
  assignedDJIds: Set<string>
): Assignment[] {
  const assignments: Assignment[] = [];
  const priorityDJs = roster.filter((dj) => dj.isPriority && !assignedDJIds.has(dj.id));

  // Sort by number of available open dates (fewest first = most constrained)
  const priorityWithOptions = priorityDJs.map((dj) => ({
    dj,
    openDates: getOpenDatesForDJ(days, dj.id, assignedDJIds),
  }));
  priorityWithOptions.sort((a, b) => a.openDates.length - b.openDates.length);

  for (const { dj, openDates } of priorityWithOptions) {
    if (assignedDJIds.has(dj.id)) continue;
    if (openDates.length === 0) continue;

    // If exactly 1 option, auto-assign
    if (openDates.length === 1) {
      const day = openDates[0];
      doAssign(day, dj, 'priority', days, assignments, assignedDJIds);
    }
    // If multiple options, still assign if only one date doesn't have other priority DJs competing
    // (Leave for conflict resolution if truly ambiguous)
  }

  return assignments;
}

function assignBottlenecks(
  days: CalendarDay[],
  assignedDJIds: Set<string>
): Assignment[] {
  const assignments: Assignment[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    for (const day of days) {
      if (isAssigned(day) || day.status === 'closed' || day.status === 'external') continue;
      if (day.status !== 'open' && day.status !== 'holiday') continue;

      // Filter to only DJs who haven't been assigned yet
      const availableUnassigned = day.availableDJs.filter(
        (dj) => !assignedDJIds.has(dj.id)
      );

      if (availableUnassigned.length === 1) {
        const dj = availableUnassigned[0];
        doAssign(day, dj, 'bottleneck', days, assignments, assignedDJIds);
        changed = true;
      }
    }
  }

  return assignments;
}

function identifyConflicts(
  days: CalendarDay[],
  assignedDJIds: Set<string>
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const day of days) {
    if (isAssigned(day) || day.status === 'closed' || day.status === 'external') continue;
    if (day.status !== 'open' && day.status !== 'holiday') continue;

    const availableUnassigned = day.availableDJs.filter(
      (dj) => !assignedDJIds.has(dj.id)
    );

    if (availableUnassigned.length === 0) {
      // No one available — still a problem
      conflicts.push({
        date: day.date,
        competingDJs: [],
        reason: 'No available DJs for this date',
      });
      day.status = 'conflict';
    } else if (availableUnassigned.length >= 2) {
      conflicts.push({
        date: day.date,
        competingDJs: availableUnassigned,
        reason: `${availableUnassigned.length} DJs competing: ${availableUnassigned.map((d) => d.name).join(', ')}`,
      });
      day.status = 'conflict';
    }
  }

  return conflicts;
}

function doAssign(
  day: CalendarDay,
  dj: DJ,
  method: 'priority' | 'bottleneck',
  days: CalendarDay[],
  assignments: Assignment[],
  assignedDJIds: Set<string>
): void {
  day.assignedDJ = dj;
  day.status = 'auto-assigned';
  day.isLocked = true;
  assignedDJIds.add(dj.id);
  assignments.push({
    date: day.date,
    djId: dj.id,
    djName: dj.name,
    method,
  });
}

function getOpenDatesForDJ(
  days: CalendarDay[],
  djId: string,
  assignedDJIds: Set<string>
): CalendarDay[] {
  return days.filter(
    (d) =>
      !isAssigned(d) &&
      d.status !== 'closed' &&
      d.status !== 'external' &&
      d.availableDJs.some((dj) => dj.id === djId) &&
      !assignedDJIds.has(djId)
  );
}

function isAssigned(day: CalendarDay): boolean {
  return (
    day.status === 'auto-assigned' ||
    day.status === 'ai-assigned' ||
    day.status === 'manual-assigned'
  );
}

function computeStats(
  days: CalendarDay[],
  _allAssignments: Assignment[],
  priorityAssignments: Assignment[],
  bottleneckAssignments: Assignment[],
  conflicts: Conflict[],
  unassignedDJs: DJ[]
): EngineStats {
  const totalSlots = days.filter(
    (d) => d.status !== 'closed' && d.status !== 'external'
  ).length;

  return {
    totalSlots,
    autoAssigned: priorityAssignments.length + bottleneckAssignments.length,
    priorityAssigned: priorityAssignments.length,
    bottleneckAssigned: bottleneckAssignments.length,
    conflictsRemaining: conflicts.length,
    djsUnassigned: unassignedDJs.length,
  };
}

/**
 * Classify each conflict as major or minor.
 * Major: 0 DJs available, priority DJ involved, or a competing DJ has no alternative dates.
 * Minor: all competing DJs have other available dates.
 */
export function classifyConflicts(
  conflicts: Conflict[],
  days: CalendarDay[],
  assignedDJIds: Set<string>
): ClassifiedConflict[] {
  return conflicts.map((conflict) => {
    if (conflict.competingDJs.length === 0) {
      return {
        ...conflict,
        severity: 'major' as ConflictSeverity,
        classificationReason: 'No DJs available for this date',
      };
    }

    const hasPriority = conflict.competingDJs.some((dj) => dj.isPriority);

    const djHasNoAlternative = conflict.competingDJs.some((dj) => {
      const otherOpenDates = days.filter(
        (d) =>
          d.date !== conflict.date &&
          d.availableDJs.some((a) => a.id === dj.id) &&
          !isAssigned(d) &&
          d.status !== 'closed' &&
          d.status !== 'external'
      );
      return otherOpenDates.length === 0;
    });

    if (hasPriority || djHasNoAlternative) {
      return {
        ...conflict,
        severity: 'major' as ConflictSeverity,
        classificationReason: hasPriority
          ? 'Priority DJ involved in this conflict'
          : 'A competing DJ has no alternative dates',
      };
    }

    return {
      ...conflict,
      severity: 'minor' as ConflictSeverity,
      classificationReason: 'All competing DJs have alternative dates available',
    };
  });
}
