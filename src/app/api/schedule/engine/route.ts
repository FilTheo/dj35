import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runEngine } from '@/lib/scheduling-engine';

const engineInputSchema = z.object({
  schedule: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }).passthrough(),
  availabilities: z.array(z.object({
    djId: z.string(),
    djName: z.string(),
    availableDates: z.array(z.string()),
  }).passthrough()),
  priorityDJs: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = engineInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = runEngine(parsed.data as unknown as Parameters<typeof runEngine>[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Engine error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Engine failed' },
      { status: 500 }
    );
  }
}
