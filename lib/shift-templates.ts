export type ShiftType = 'FT_MAIN' | 'FT_EARLY' | 'INTERN_DAY' | 'CUSTOM';

export type BreakItem = {
  name: string;
  start: string;
  end: string;
  durationMinutes: number;
};

export const DEFAULT_WEEK_OFFS = ['Sunday'];

export const SHIFT_TEMPLATES: Record<Exclude<ShiftType, 'CUSTOM'>, {
  label: string;
  workStart: string;
  workEnd: string;
  breaks: BreakItem[];
  weekOffs: string[];
}> = {
  FT_MAIN: {
    label: 'FT Main',
    workStart: '10:35',
    workEnd: '20:00',
    breaks: [
      { name: 'Lunch', start: '13:15', end: '14:00', durationMinutes: 45 },
      { name: 'Snack', start: '17:00', end: '17:20', durationMinutes: 20 },
    ],
    weekOffs: DEFAULT_WEEK_OFFS,
  },
  FT_EARLY: {
    label: 'FT Early',
    workStart: '09:25',
    workEnd: '19:00',
    breaks: [
      { name: 'Lunch', start: '13:15', end: '14:00', durationMinutes: 45 },
      { name: 'Snack', start: '17:00', end: '17:20', durationMinutes: 20 },
    ],
    weekOffs: DEFAULT_WEEK_OFFS,
  },
  INTERN_DAY: {
    label: 'Intern Day',
    workStart: '13:25',
    workEnd: '20:00',
    breaks: [
      { name: 'Snack', start: '17:00', end: '17:20', durationMinutes: 20 },
    ],
    weekOffs: DEFAULT_WEEK_OFFS,
  },
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  FT_MAIN: 'FT Main',
  FT_EARLY: 'FT Early',
  INTERN_DAY: 'Intern Day',
  CUSTOM: 'Custom',
};

export const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
