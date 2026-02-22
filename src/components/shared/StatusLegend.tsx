'use client';

import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import type { DayStatus } from '@/lib/types';

const LEGEND_ITEMS: DayStatus[] = [
  'open',
  'closed',
  'external',
  'holiday',
  'auto-assigned',
  'ai-assigned',
  'manual-assigned',
  'conflict',
];

export default function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 px-2 py-2 text-xs">
      {LEGEND_ITEMS.map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <div
            className={`h-3 w-3 rounded-sm border ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].border}`}
          />
          <span className="text-gray-600">{STATUS_LABELS[status]}</span>
        </div>
      ))}
    </div>
  );
}
