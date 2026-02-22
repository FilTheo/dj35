import type {
  MonthSchedule,
  VerificationResult,
  ConstraintViolation,
} from '../types';
import { MAX_GIGS_PER_DJ } from '../constants';

/**
 * Deterministic constraint verifier.
 * NOT AI — pure code. Checks all scheduling constraints.
 */
export function verifySchedule(schedule: MonthSchedule): VerificationResult {
  const violations: ConstraintViolation[] = [];

  checkDoubleBookingDJ(schedule, violations);
  checkDoubleBookingDate(schedule, violations);
  checkPriorityDJs(schedule, violations);
  checkUnfilledDates(schedule, violations);
  checkUserConstraints(schedule, violations);

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Check: No DJ assigned more than MAX_GIGS_PER_DJ times.
 */
function checkDoubleBookingDJ(
  schedule: MonthSchedule,
  violations: ConstraintViolation[]
): void {
  const djCounts = new Map<string, string[]>();

  for (const assignment of schedule.assignments) {
    const dates = djCounts.get(assignment.djId) ?? [];
    dates.push(assignment.date);
    djCounts.set(assignment.djId, dates);
  }

  for (const [djId, dates] of djCounts) {
    if (dates.length > MAX_GIGS_PER_DJ) {
      const djName =
        schedule.assignments.find((a) => a.djId === djId)?.djName ?? djId;
      violations.push({
        type: 'double-booking-dj',
        message: `${djName} is assigned ${dates.length} gigs (max ${MAX_GIGS_PER_DJ}): ${dates.join(', ')}`,
        affectedDJs: [djName],
        affectedDates: dates,
      });
    }
  }
}

/**
 * Check: No date has more than one DJ assigned.
 */
function checkDoubleBookingDate(
  schedule: MonthSchedule,
  violations: ConstraintViolation[]
): void {
  const dateDJs = new Map<string, string[]>();

  for (const assignment of schedule.assignments) {
    const djs = dateDJs.get(assignment.date) ?? [];
    djs.push(assignment.djName);
    dateDJs.set(assignment.date, djs);
  }

  for (const [date, djs] of dateDJs) {
    if (djs.length > 1) {
      violations.push({
        type: 'double-booking-date',
        message: `${date} has ${djs.length} DJs assigned: ${djs.join(', ')}`,
        affectedDJs: djs,
        affectedDates: [date],
      });
    }
  }
}

/**
 * Check: Priority DJs should be assigned (warn if not).
 */
function checkPriorityDJs(
  schedule: MonthSchedule,
  violations: ConstraintViolation[]
): void {
  const assignedDJIds = new Set(schedule.assignments.map((a) => a.djId));

  for (const day of schedule.days) {
    for (const dj of day.availableDJs) {
      if (dj.isPriority && !assignedDJIds.has(dj.id)) {
        violations.push({
          type: 'priority-unassigned',
          message: `Priority DJ ${dj.name} is not assigned to any date`,
          affectedDJs: [dj.name],
          affectedDates: [],
        });
        // Only warn once per DJ
        assignedDJIds.add(dj.id); // prevent duplicate warnings
      }
    }
  }
}

/**
 * Check: All open/holiday dates should be filled.
 */
function checkUnfilledDates(
  schedule: MonthSchedule,
  violations: ConstraintViolation[]
): void {
  const assignedDates = new Set(schedule.assignments.map((a) => a.date));

  for (const day of schedule.days) {
    if (
      (day.status === 'open' || day.status === 'holiday' || day.status === 'conflict') &&
      !assignedDates.has(day.date) &&
      !day.assignedDJ
    ) {
      violations.push({
        type: 'unfilled-date',
        message: `${day.date} is open but has no DJ assigned`,
        affectedDJs: [],
        affectedDates: [day.date],
      });
    }
  }
}

/**
 * Check: Hard user constraints should be satisfied.
 */
function checkUserConstraints(
  schedule: MonthSchedule,
  violations: ConstraintViolation[]
): void {
  const constraints = schedule.parsedConstraints;
  if (!constraints || constraints.length === 0) return;

  const assignmentsByDJLower = new Map<string, string[]>();
  for (const a of schedule.assignments) {
    const key = a.djName.toLowerCase();
    const dates = assignmentsByDJLower.get(key) ?? [];
    dates.push(a.date);
    assignmentsByDJLower.set(key, dates);
  }

  for (const constraint of constraints) {
    if (!constraint.isHard) continue;

    switch (constraint.type) {
      case 'must-play-date': {
        if (!constraint.djName || !constraint.date) break;
        const djDates = assignmentsByDJLower.get(constraint.djName.toLowerCase());
        if (!djDates || !djDates.includes(constraint.date)) {
          violations.push({
            type: 'user-constraint-violated',
            message: `Constraint violated: ${constraint.description}`,
            affectedDJs: [constraint.djName],
            affectedDates: constraint.date ? [constraint.date] : [],
          });
        }
        break;
      }
      case 'priority': {
        if (!constraint.djName) break;
        const djDates = assignmentsByDJLower.get(constraint.djName.toLowerCase());
        if (!djDates || djDates.length === 0) {
          violations.push({
            type: 'user-constraint-violated',
            message: `Constraint violated: ${constraint.description}`,
            affectedDJs: [constraint.djName],
            affectedDates: [],
          });
        }
        break;
      }
      case 'exclude-dj': {
        if (!constraint.djName) break;
        const djDates = assignmentsByDJLower.get(constraint.djName.toLowerCase());
        if (djDates && djDates.length > 0) {
          violations.push({
            type: 'user-constraint-violated',
            message: `Constraint violated: ${constraint.description} (but they were assigned on ${djDates.join(', ')})`,
            affectedDJs: [constraint.djName],
            affectedDates: djDates,
          });
        }
        break;
      }
      case 'extra-dj': {
        if (!constraint.djName) break;
        const djDates = assignmentsByDJLower.get(constraint.djName.toLowerCase());
        if (!djDates || djDates.length === 0) {
          violations.push({
            type: 'user-constraint-violated',
            message: `Constraint violated: ${constraint.description} (extra DJ not assigned)`,
            affectedDJs: [constraint.djName],
            affectedDates: [],
          });
        }
        break;
      }
    }
  }
}
