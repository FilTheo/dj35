import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { MODELS } from '@/lib/constants';
import { optimizationResultSchema } from '@/lib/schemas';
import { buildOptimizerStructuredPrompt } from '@/lib/agents/optimizer';
import { verifySchedule } from '@/lib/agents/verifier';
import { classifyConflicts } from '@/lib/scheduling-engine';
import { checkRateLimit } from '@/lib/rate-limit';
import type { MonthSchedule, OptimizationAssignment, OptimizationResult, VerificationResult } from '@/lib/types';

const optimizeInputSchema = z.object({
  schedule: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }).passthrough(),
  userAdjustment: z.string().max(2000).optional(),
});

const MAX_RETRIES = 2;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const { allowed, retryAfterMs } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((retryAfterMs ?? 60000) / 1000)) } }
      );
    }

    const body = await req.json();
    const parsed = optimizeInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { schedule, userAdjustment } = parsed.data;
    const typedSchedule = schedule as unknown as MonthSchedule;

    // Classify conflicts
    const assignedDJIds = new Set(typedSchedule.assignments.map((a) => a.djId));
    const classifiedConflicts = classifyConflicts(
      typedSchedule.conflicts,
      typedSchedule.days,
      assignedDJIds
    );

    // Build prompt
    const basePrompt = buildOptimizerStructuredPrompt(
      typedSchedule,
      classifiedConflicts,
      userAdjustment
    );

    let lastResult: OptimizationResult | null = null;
    let lastVerification: VerificationResult | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const prompt =
        attempt === 0
          ? basePrompt
          : `${basePrompt}\n\nPREVIOUS ATTEMPT FAILED VERIFICATION:\n${JSON.stringify(lastVerification?.violations)}\nPlease fix these issues and try again.`;

      const aiResult = await generateObject({
        model: google(MODELS.optimizer),
        schema: optimizationResultSchema,
        prompt,
        temperature: 0.2,
      });

      lastResult = aiResult.object as OptimizationResult;

      // Apply assignments to a clone and verify
      const testSchedule = applyOptimizationToSchedule(typedSchedule, lastResult.assignments);
      lastVerification = verifySchedule(testSchedule);

      if (lastVerification.isValid) {
        return NextResponse.json({
          result: lastResult,
          verification: lastVerification,
          attempts: attempt + 1,
        });
      }
    }

    // Return best-effort result with verification issues
    return NextResponse.json({
      result: lastResult,
      verification: lastVerification,
      attempts: MAX_RETRIES + 1,
    });
  } catch (error) {
    console.error('Optimize error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Optimization failed' },
      { status: 500 }
    );
  }
}

function applyOptimizationToSchedule(
  schedule: MonthSchedule,
  assignments: OptimizationAssignment[]
): MonthSchedule {
  const clone = structuredClone(schedule);

  for (const assignment of assignments) {
    clone.assignments.push({
      date: assignment.date,
      djId: assignment.djId,
      djName: assignment.djName,
      method: 'ai',
    });

    const day = clone.days.find((d) => d.date === assignment.date);
    if (day) {
      day.assignedDJ = { id: assignment.djId, name: assignment.djName, isPriority: false };
      day.status = 'ai-assigned';
      day.isLocked = true;
    }
  }

  clone.conflicts = clone.conflicts.filter(
    (c) => !assignments.some((a) => a.date === c.date)
  );

  return clone;
}
