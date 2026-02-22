import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAvailabilities } from '@/lib/agents/extractor';
import { checkRateLimit } from '@/lib/rate-limit';

const extractInputSchema = z.object({
  availabilityChat: z.string().min(1).max(50000),
  userConstraints: z.string().max(5000).optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

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
    const parsed = extractInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await extractAvailabilities(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Extraction error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Extraction failed' },
      { status: 500 }
    );
  }
}
