import { NextRequest, NextResponse } from 'next/server';
import type { MonthSchedule } from '@/lib/types';
import { getDayName, getMonthName } from '@/lib/calendar-utils';

export async function POST(req: NextRequest) {
  try {
    const schedule: MonthSchedule = await req.json();
    if (!schedule.month || !schedule.year || !Array.isArray(schedule.assignments)) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 });
    }
    const text = generateExportText(schedule);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

function generateExportText(schedule: MonthSchedule): string {
  const monthName = getMonthName(schedule.month, schedule.year);
  const sorted = [...schedule.assignments].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const lines: string[] = [
    `DJ Schedule — ${monthName}`,
    '═'.repeat(30),
    '',
  ];

  // Group by week
  let currentWeek = -1;
  for (const assignment of sorted) {
    const day = schedule.days.find((d) => d.date === assignment.date);
    const dayNum = day?.dayOfMonth ?? parseInt(assignment.date.split('-')[2]);
    const weekNum = Math.ceil(dayNum / 7);

    if (weekNum !== currentWeek) {
      if (currentWeek !== -1) lines.push('');
      lines.push(`Week ${weekNum}:`);
      currentWeek = weekNum;
    }

    const dayName = getDayName(assignment.date);
    lines.push(`  ${dayName} ${dayNum}: @${assignment.djName}`);
  }

  // Unassigned DJs
  if (schedule.unassignedDJs.length > 0) {
    lines.push('');
    lines.push('Not assigned this month:');
    for (const dj of schedule.unassignedDJs) {
      lines.push(`  - ${dj.name}`);
    }
    lines.push('');
    lines.push('(These DJs get priority next month)');
  }

  return lines.join('\n');
}
