import type { DayStatus } from './types';

// ─── AI Model Configuration ───
export const MODELS = {
  //extractor: 'gemini-3-flash-preview',
  extractor: 'gemini-2.5-flash',
  optimizer: 'gemini-3.1-pro-preview',
} as const;

// ─── Day Status Colors (Tailwind classes) ───
export const STATUS_COLORS: Record<DayStatus, { bg: string; text: string; border: string }> = {
  closed: { bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-200' },
  open: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  external: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  holiday: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'auto-assigned': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'ai-assigned': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'manual-assigned': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  conflict: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export const STATUS_LABELS: Record<DayStatus, string> = {
  closed: 'Closed',
  open: 'Open',
  external: 'External DJ',
  holiday: 'Holiday',
  'auto-assigned': 'Auto-assigned',
  'ai-assigned': 'AI-assigned',
  'manual-assigned': 'Manual',
  conflict: 'Conflict',
};

// ─── Day of Week ───
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

// Default open days: Friday (5), Saturday (6), Sunday (0)
export const DEFAULT_OPEN_DAYS = new Set([0, 5, 6]);

// ─── App ───
export const APP_TITLE = 'DJ Scheduler';
export const MAX_GIGS_PER_DJ = 1;
