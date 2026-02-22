'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { MonthSchedule } from '@/lib/types';

interface ExportButtonProps {
  schedule: MonthSchedule;
  disabled?: boolean;
}

export default function ExportButton({ schedule, disabled }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    try {
      const res = await apiFetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      const data = await res.json();
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: generate locally
      const text = generateExportText(schedule);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? 'Copied!' : 'Export & Copy'}
    </button>
  );
}

function generateExportText(schedule: MonthSchedule): string {
  const lines: string[] = [];
  const sorted = [...schedule.assignments].sort((a, b) => a.date.localeCompare(b.date));

  for (const assignment of sorted) {
    const day = schedule.days.find((d) => d.date === assignment.date);
    const dayName = day
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.dayOfWeek]
      : '';
    lines.push(`${assignment.date} (${dayName}): ${assignment.djName}`);
  }

  return lines.join('\n');
}
