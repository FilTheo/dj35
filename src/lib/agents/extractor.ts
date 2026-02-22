import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { extractionResultSchema } from '../schemas';
import { MODELS } from '../constants';
import { buildDateTable, generateMonthDays } from '../calendar-utils';
import type { ExtractionInput, ExtractionResult, DJ, DJAvailability, ParsedConstraint } from '../types';
import { format, parse } from 'date-fns';

/**
 * Agent 1: The Extractor
 * Parses unstructured Greek chat messages into structured DJ availability data.
 */
export async function extractAvailabilities(
  input: ExtractionInput
): Promise<ExtractionResult> {
  const { availabilityChat, userConstraints, month, year } = input;

  const dateTable = buildDateTable(month, year);
  const monthDays = generateMonthDays(month, year);
  const openDates = monthDays
    .filter((d) => d.status === 'open')
    .map((d) => d.dayOfMonth);

  const monthName = format(new Date(year, month - 1), 'MMMM yyyy');


  const systemPrompt = `You are a data extraction agent for a DJ scheduling system at a bar in Greece.
Your task is to parse unstructured Greek-language Messenger group chat messages and extract DJ availability data.

TARGET MONTH: ${monthName}
OPEN DATES (Fri/Sat/Sun by default):
${dateTable}

ALL OPEN DAY-OF-MONTH NUMBERS: [${openDates.join(', ')}]

CRITICAL PARSING RULES:
1. CHRONOLOGICAL OVERRIDES: If the same DJ posts multiple messages, the LAST message is their final availability. Earlier messages are superseded.
2. EXCLUSION vs INCLUSION:
   - EXCLUSION (isExclusion=true): "Εκτός 21-23" or "εκτος 7, 13-15, 21" means available ALL open dates EXCEPT the listed ones.
   - INCLUSION (isExclusion=false): "13 20 και 27 μπορω" means available ONLY on those specific dates.
3. DAY NAME REFERENCES WITHflexible AVAILABILITY:
    - "Όποια Κυριακή" = all Sundays in the target month
    - "Παρασκευή" = all Fridays in the target month that are open
    - "Σάββατο" = all Saturdays in the target month that are open
    - "Παρασκευή ή Σάββατο όποτε βολεύει" = ALL open Fridays AND Saturdays (high confidence!)
    - "Παρασκευή και Σάββατο" = all open Fridays and Saturdays
    - "Σάββατο 21 ή Σάββατο 28" = Saturday the 21st or Saturday the 28th
    - GREEK DAY VARIATIONS: Accept common variations and typos:
      - Friday: "Παρασκευή", "Παρασσκευή", "Παρασκευήν", "Παρασκευής"
      - Saturday: "Σάββατο", "Σαββατο", "Σαββάτο"
      - Sunday: "Κυριακή", "Κυριακήν", "Κυριακής"
      - Thursday: "Πέμπτη", "Πεμπτη"
 4. GREEK ABBREVIATIONS:
    - "ΠΣΚ" = Παρασκευή-Σάββατο-Κυριακή (Friday-Saturday-Sunday, i.e., a weekend)
    - "τα γνωστά" ALONE is vague (needsReview=true), BUT if combined with day names like "Παρασκευή ή Σάββατο όποτε βολεύει" then extract ALL open dates for those days - this is NOT vague!
5. RELATIVE REFERENCES:
   - "το δεύτερο σαββατοκύριακο" = the 2nd weekend (Fri-Sat-Sun) of the month
   - "το πρώτο Παρασκευή ή Σάββατο" = the 1st Friday or Saturday
6. DATE RANGES: "21-23" means 21, 22, 23 (expand the range)
7. REPLIES/EDITS: Messages marked "Τροποποιημένα" or "απάντησε στον εαυτό του" are EDITS that override previous messages from the same DJ.

OUTPUT:
- availableDates: Array of DAY-OF-MONTH integers (NOT full dates) that map to OPEN dates only. If a DJ says a date that is not in the open dates list, ignore it.
- For EXCLUSION DJs: compute allOpenDates minus excludedDates
- For INCLUSION DJs: only the dates they explicitly mention (that are also open)
- confidence: 1.0 for clear messages including "Παρασκευή ή Σάββατο όποτε βολεύει", day names with "όποτε βολεύει", specific dates, or explicit exclusions. Lower (0.5-0.7) only for truly vague messages with NO day or date info.
- needsReview: true ONLY for truly vague inputs like just "τα γνωστά" with no day/date context. Messages with day names + "όποτε βολεύει" are CLEAR - set needsReview=false and confidence=1.0

${userConstraints ? `
USER SCHEDULING CONSTRAINTS:
The user has provided free-form scheduling constraints. Parse EACH constraint into a structured format in the "parsedConstraints" array.

CONSTRAINT TYPES:
- "priority": DJ should have priority this month (e.g., "Alex didn't play last month, he's priority"). Set isHard=true. Also add the DJ name to priorityDJs.
- "must-play-date": DJ MUST play on a specific date (e.g., "Kosmas must play on the 21st"). Set isHard=true. Set date to the day-of-month integer.
- "extra-dj": An additional DJ not in the chat (e.g., "Extra DJ Fil available on Fridays"). Set isHard=true. Set dates to the matching open day-of-month integers. Also add them to the availabilities array with those dates.
- "exclude-dj": DJ should NOT be scheduled (e.g., "Don't book Maria"). Set isHard=true.
- "prefer-date": Soft preference for a DJ on a date/day-type (e.g., "Try to give Alex a Saturday"). Set isHard=false.
- "custom": Anything that doesn't fit above categories. Set isHard=false.

IMPORTANT:
- If an extra DJ from constraints also appears in the chat, MERGE their availabilities (don't duplicate).
- For "priority" constraints, add the DJ name to the priorityDJs array.
- Validate dates against open dates only.
- Provide a clear "description" that summarizes what the constraint means.

USER CONSTRAINTS TEXT:
---
${userConstraints}
---
` : 'No user constraints provided. parsedConstraints should be an empty array.'}

AVAILABILITY CHAT TO PARSE:
---
${availabilityChat}
---`;

  const result = await generateObject({
    model: google(MODELS.extractor),
    schema: extractionResultSchema,
    prompt: systemPrompt,
    temperature: 0.1,
  });

  // Post-process: convert day-of-month numbers to ISO date strings

  const isoDate = (dom: number) =>
    format(new Date(year, month - 1, dom), 'yyyy-MM-dd');

  const processedAvailabilities: DJAvailability[] = result.object.availabilities.map(
    (avail, idx) => ({
      djId: `dj-${idx}-${avail.djName.toLowerCase().replace(/\s+/g, '-')}`,
      djName: avail.djName,
      availableDates: avail.availableDates.map(isoDate),
      rawText: avail.rawText,
      isExclusion: avail.isExclusion,
      confidence: avail.confidence,
      needsReview: avail.needsReview,
      reviewNote: avail.reviewNote,
    })
  );

  // Post-process parsed constraints: convert day-of-month to ISO dates
  const processedConstraints: ParsedConstraint[] = (result.object.parsedConstraints ?? []).map(
    (c) => ({
      type: c.type,
      description: c.description,
      rawText: c.rawText,
      djName: c.djName,
      date: c.date ? isoDate(c.date) : undefined,
      dates: c.dates ? c.dates.map(isoDate) : undefined,
      isHard: c.isHard,
    })
  );

  // Deterministically ensure extra-dj constraints produce availability entries
  const guaranteedAvailabilities = resolveExtraDJsFromConstraints(
    processedAvailabilities, processedConstraints, month, year
  );

  const roster: DJ[] = guaranteedAvailabilities.map((a) => ({
    id: a.djId,
    name: a.djName,
    isPriority: result.object.priorityDJs.some(
      (p) => p.toLowerCase() === a.djName.toLowerCase()
    ),
  }));

  return {
    roster,
    availabilities: guaranteedAvailabilities,
    priorityDJs: result.object.priorityDJs,
    parsedConstraints: processedConstraints,
    warnings: result.object.warnings,
    unmatchedNames: result.object.unmatchedNames,
  };
}

/**
 * Ensures any constraint that references a DJ not in the chat availabilities
 * gets that DJ added to the availabilities array. This covers extra-dj,
 * priority, must-play-date, and any other constraint type where a djName
 * is specified but the DJ wasn't found in the group chat.
 */
function resolveExtraDJsFromConstraints(
  availabilities: DJAvailability[],
  constraints: ParsedConstraint[],
  month: number,
  year: number
): DJAvailability[] {
  const result = [...availabilities];

  for (const constraint of constraints) {
    if (!constraint.djName || constraint.type === 'exclude-dj') continue;

    const alreadyPresent = result.find(
      (a) => a.djName.toLowerCase() === constraint.djName!.toLowerCase()
    );
    if (alreadyPresent) continue;

    // Use constraint dates if provided, otherwise fall back to all open dates
    let dates = constraint.dates ?? [];
    if (constraint.date && dates.length === 0) {
      dates = [constraint.date];
    }
    if (dates.length === 0) {
      dates = generateMonthDays(month, year)
        .filter((d) => d.status === 'open')
        .map((d) => d.date);
    }

    const djId = `dj-extra-${constraint.djName.toLowerCase().replace(/\s+/g, '-')}`;

    result.push({
      djId,
      djName: constraint.djName,
      availableDates: dates,
      rawText: constraint.rawText,
      isExclusion: false,
      confidence: 1.0,
      needsReview: false,
    });
  }

  return result;
}
