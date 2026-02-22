import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPriorityDJs, savePriorityDJs } from '@/lib/store';

const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

const savePrioritySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  djNames: z.array(z.string().min(1).max(100)).max(50),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = monthYearSchema.safeParse({
    month: searchParams.get('month'),
    year: searchParams.get('year'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid month and year required' }, { status: 400 });
  }

  const djNames = await getPriorityDJs(parsed.data.year, parsed.data.month);
  return NextResponse.json(djNames);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = savePrioritySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    await savePriorityDJs(parsed.data.year, parsed.data.month, parsed.data.djNames);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save priority DJs' },
      { status: 500 }
    );
  }
}
