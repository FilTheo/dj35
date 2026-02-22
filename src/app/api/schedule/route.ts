import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSchedule, saveSchedule, deleteSchedule, deletePriorityDJs } from '@/lib/store';
import type { MonthSchedule } from '@/lib/types';

const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = monthYearSchema.safeParse({
    month: searchParams.get('month'),
    year: searchParams.get('year'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid month (1-12) and year required' }, { status: 400 });
  }

  const schedule = await getSchedule(parsed.data.year, parsed.data.month);
  return NextResponse.json(schedule);
}

export async function POST(req: NextRequest) {
  try {
    const schedule: MonthSchedule = await req.json();
    if (!schedule.month || !schedule.year) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 });
    }
    await saveSchedule(schedule);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = monthYearSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid month and year required' }, { status: 400 });
    }

    const { month, year } = parsed.data;
    await deleteSchedule(year, month);

    // Also clear priority DJs saved for next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    await deletePriorityDJs(nextYear, nextMonth);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}
