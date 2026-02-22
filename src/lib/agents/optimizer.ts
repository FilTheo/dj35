import type { MonthSchedule, Conflict, ClassifiedConflict, ParsedConstraint } from '../types';
import { getMonthName, getDayName } from '../calendar-utils';

/**
 * Agent 2: The Optimizer
 * Builds system prompts for the streaming chat that resolves conflicts.
 */
export function buildOptimizerSystemPrompt(schedule: MonthSchedule): string {
  const monthName = getMonthName(schedule.month, schedule.year);

  // Build context sections
  const assignedSlots = schedule.assignments
    .map((a) => `  ${a.date} (${getDayName(a.date)}): ${a.djName} [${a.method}]`)
    .join('\n');

  const conflictSummary = schedule.conflicts
    .map((c) => {
      const dayName = getDayName(c.date);
      const djNames = c.competingDJs.map((d) => d.name).join(', ');
      return `  ${c.date} (${dayName}): ${djNames} — ${c.reason}`;
    })
    .join('\n');

  const unassignedDJs = schedule.unassignedDJs
    .map((dj) => {
      const availDates = schedule.days
        .filter((d) => d.availableDJs.some((a) => a.id === dj.id))
        .map((d) => `${d.date} (${getDayName(d.date)})`)
        .join(', ');
      return `  ${dj.name}${dj.isPriority ? ' [PRIORITY]' : ''}: available on ${availDates || 'no dates'}`;
    })
    .join('\n');

  return `You are an AI scheduling assistant for a bar's monthly DJ schedule.
You help the bar manager (Makis) resolve scheduling conflicts for ${monthName}.

CURRENT SCHEDULE STATE:
======================
Assigned slots:
${assignedSlots || '  (none yet)'}

Conflicts to resolve:
${conflictSummary || '  (none)'}

Unassigned DJs:
${unassignedDJs || '  (all assigned)'}

RULES:
1. Each DJ can play MAXIMUM 1 gig per month.
2. Priority DJs (marked [PRIORITY]) must be assigned first — they missed last month.
3. Every open date needs exactly 1 DJ.
4. Consider DJ preferences and fairness.

YOUR BEHAVIOR:
- Present 2-3 clear scenarios for each conflict.
- Explain tradeoffs briefly (e.g., "If Alex gets the 14th, George can take the 21st").
- After the user decides, use the assign_dj tool to make the assignment.
- After each assignment, use the verify_schedule tool to check constraints.
- Communicate clearly and concisely. The manager is busy.
- If a DJ must be moved, suggest the text to send them in the group chat.
- Speak in English but understand that DJ names and some context may be in Greek.`;
}

/**
 * Build a structured prompt for the optimizer that returns JSON via generateObject.
 */
export function buildOptimizerStructuredPrompt(
  schedule: MonthSchedule,
  classifiedConflicts: ClassifiedConflict[],
  userAdjustment?: string
): string {
  const monthName = getMonthName(schedule.month, schedule.year);

  const assignedSlots = schedule.assignments
    .map((a) => `  ${a.date} (${getDayName(a.date)}): ${a.djName} [${a.method}]`)
    .join('\n');

  const conflictDetails = classifiedConflicts
    .map((c) => {
      const dayName = getDayName(c.date);
      const djNames = c.competingDJs
        .map((d) => `${d.name} (id: ${d.id})${d.isPriority ? ' [PRIORITY]' : ''}`)
        .join(', ');
      return `  ${c.date} (${dayName}) [${c.severity.toUpperCase()}]: ${djNames || 'NO DJs'} — ${c.classificationReason}`;
    })
    .join('\n');

  const unassignedDJs = schedule.unassignedDJs
    .map((dj) => {
      const availDates = schedule.days
        .filter((d) => d.availableDJs.some((a) => a.id === dj.id) && !d.assignedDJ)
        .map((d) => `${d.date} (${getDayName(d.date)})`)
        .join(', ');
      return `  ${dj.name} (id: ${dj.id})${dj.isPriority ? ' [PRIORITY]' : ''}: available on ${availDates || 'no remaining dates'}`;
    })
    .join('\n');

  const hasMajor = classifiedConflicts.some((c) => c.severity === 'major');

  // Build constraints section from schedule
  const constraints = schedule.parsedConstraints ?? [];
  const constraintSection = constraints.length > 0
    ? `\nUSER CONSTRAINTS (from the bar manager):
${constraints.map((c, i) =>
  `  ${i + 1}. [${c.type}${c.isHard ? ' HARD' : ' SOFT'}] ${c.description}${c.djName ? ` (DJ: ${c.djName})` : ''}${c.date ? ` (Date: ${c.date})` : ''}`
).join('\n')}

Hard constraints MUST be satisfied — the verifier will flag violations.
Soft constraints should be satisfied if possible without violating hard rules.
In your "explanation", mention which user constraints were applied and how.\n`
    : '';

  return `You are an AI scheduling optimizer for a bar's monthly DJ schedule.
Your job is to SOLVE all scheduling conflicts for ${monthName} and return structured assignments.

CURRENT STATE:
==============
Already assigned:
${assignedSlots || '  (none)'}

Conflicts to resolve:
${conflictDetails || '  (none)'}

Unassigned DJs seeking a slot:
${unassignedDJs || '  (all assigned)'}

HARD RULES (violations will fail verification):
1. Each DJ gets MAXIMUM 1 gig per month.
2. Each date gets EXACTLY 1 DJ.
3. Priority DJs [PRIORITY] MUST be assigned before non-priority DJs.
4. Only assign DJs to dates where they appear in the available list.

OPTIMIZATION GOALS (soft preferences):
- Maximize total DJs who get to play.
- Prefer assigning DJs who have fewer available dates first (most constrained first).
- Fairness: spread gigs across DJs rather than leaving some out unnecessarily.
${constraintSection}
${hasMajor ? `MAJOR CONFLICTS DETECTED:
Some conflicts involve priority DJs or DJs with no alternative dates.
You MUST provide 2-3 alternative scenarios in the "scenarios" array.
Each scenario must be a COMPLETE set of assignments for ALL conflict dates.
The main "assignments" array should contain your RECOMMENDED scenario.
Set hasMajorConflicts to true.` : `All conflicts are minor (DJs have alternatives).
Provide your single best solution in the "assignments" array.
Set hasMajorConflicts to false. Do NOT provide scenarios.`}

${userAdjustment ? `USER ADJUSTMENT REQUEST:
The user wants the following change applied:
"${userAdjustment}"
Incorporate this request into your solution while still respecting the hard rules.` : ''}

IMPORTANT:
- Use the EXACT djId and djName values from the schedule data above.
- Provide a clear "reason" for each assignment explaining why that DJ gets that date.
- The "explanation" should summarize your overall strategy in 2-4 sentences.
- For dates with 0 available DJs, add them to the "unresolvable" array.`;
}

/**
 * Build a concise state update for the chat body (sent with each message).
 */
export function buildScheduleContext(schedule: MonthSchedule): string {
  const remaining = schedule.conflicts.length;
  const filled = schedule.assignments.length;
  const total = schedule.days.filter(
    (d) => d.status !== 'closed' && d.status !== 'external'
  ).length;

  return JSON.stringify({
    filled,
    total,
    remainingConflicts: remaining,
    assignments: schedule.assignments.map((a) => ({
      date: a.date,
      dj: a.djName,
      method: a.method,
    })),
    conflicts: schedule.conflicts.map((c) => ({
      date: c.date,
      djs: c.competingDJs.map((d) => d.name),
    })),
    unassignedDJs: schedule.unassignedDJs.map((d) => ({
      name: d.name,
      priority: d.isPriority,
    })),
  });
}
