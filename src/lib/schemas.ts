import { z } from 'zod';

// Schema for a single DJ availability extracted by Agent 1
export const djAvailabilitySchema = z.object({
  djName: z.string().describe('The DJ name as it appears in the chat'),
  availableDates: z.array(z.number()).describe('Array of day-of-month integers the DJ is available'),
  rawText: z.string().describe('The original message text from this DJ'),
  isExclusion: z.boolean().describe('True if DJ stated excluded dates (available all EXCEPT these), false if stated included dates (available ONLY on these)'),
  confidence: z.number().min(0).max(1).describe('Confidence in parsing accuracy, 0-1'),
  needsReview: z.boolean().describe('True if input was vague or ambiguous'),
  reviewNote: z.string().optional().describe('Explanation of what needs review, if any'),
});

// Schema for parsed user constraints
export const parsedConstraintSchema = z.object({
  type: z.enum(['priority', 'must-play-date', 'extra-dj', 'exclude-dj', 'prefer-date', 'custom']),
  description: z.string().describe('Human-readable summary of the constraint'),
  rawText: z.string().describe('The original user text that produced this constraint'),
  djName: z.string().optional().describe('DJ name if applicable'),
  date: z.number().optional().describe('Day-of-month integer if a specific date is referenced'),
  dates: z.array(z.number()).optional().describe('Multiple day-of-month integers if applicable'),
  isHard: z.boolean().describe('True if this is a hard constraint that must be satisfied, false if soft preference'),
});

// Full extraction result schema for Agent 1
export const extractionResultSchema = z.object({
  availabilities: z.array(djAvailabilitySchema),
  priorityDJs: z.array(z.string()).describe('DJ names who should have priority this month'),
  parsedConstraints: z.array(parsedConstraintSchema).describe('Structured interpretation of user-provided scheduling constraints. Empty array if no constraints provided.'),
  warnings: z.array(z.string()).describe('Any parsing warnings or ambiguities'),
  unmatchedNames: z.array(z.string()).describe('Names that could not be confidently parsed'),
});

// Schema for AI optimizer tool calls (legacy, used by /api/chat)
export const assignDJSchema = z.object({
  date: z.string().describe('ISO date string (YYYY-MM-DD) of the slot'),
  djId: z.string().describe('ID of the DJ to assign'),
  djName: z.string().describe('Name of the DJ to assign'),
  reason: z.string().describe('Brief explanation for this assignment'),
});

// ─── Structured Optimizer Output Schema ───

const optimizationAssignmentSchema = z.object({
  date: z.string().describe('ISO date string YYYY-MM-DD'),
  djId: z.string().describe('The DJ ID from the schedule'),
  djName: z.string().describe('The DJ display name'),
  reason: z.string().describe('1-2 sentence explanation for why this DJ gets this date'),
});

const optimizationScenarioSchema = z.object({
  id: z.string().describe('Unique scenario identifier like scenario-a'),
  label: z.string().describe('Short label like "Prioritize Alex"'),
  description: z.string().describe('1-2 sentence trade-off explanation'),
  assignments: z.array(optimizationAssignmentSchema),
});

export const optimizationResultSchema = z.object({
  assignments: z.array(optimizationAssignmentSchema)
    .describe('Complete list of AI assignments for ALL conflicting dates. If hasMajorConflicts is true, this should be the recommended scenario.'),
  explanation: z.string()
    .describe('Overall 2-4 sentence summary of the optimization strategy and key decisions'),
  hasMajorConflicts: z.boolean()
    .describe('True if there are priority DJ clashes, DJs who would lose their only slot, or dates with 0 available DJs'),
  scenarios: z.array(optimizationScenarioSchema).optional()
    .describe('2-3 alternative complete assignment sets. Only provide when hasMajorConflicts is true.'),
  unresolvable: z.array(z.object({
    date: z.string().describe('ISO date string'),
    reason: z.string().describe('Why no DJ can be assigned here'),
  })).describe('Dates where no DJ is available at all'),
});
