import { IST_OFFSET_MS } from '@/lib/constants';

export type ShiftRules = {
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  earlyGraceMinutes: number;
  breakDuration: number;
};

export interface AuditLog {
  _id: string;
  employeeId: string;
  attendanceId?: string;
  action: string;
  date: string;
  timestamp: string;
  actorId: {
    _id: string;
    fullName: string;
    role: string;
  };
  metadata?: any;
}

export const DEFAULT_SHIFT_RULES: ShiftRules = {
  shiftStart: '10:00',
  shiftEnd: '19:00',
  graceMinutes: 15,
  earlyGraceMinutes: 0,
  breakDuration: 45,
};

/**
 * Standardizes duration display into human-readable format.
 * Example: 373 -> "6h 13m", 45 -> "45m", 120 -> "2h 0m"
 */
export function formatDuration(mins: number): string {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Standardizes duration into strict HH:MM format.
 * Example: 373 -> "06:13", 45 -> "00:45"
 */
export function formatHHMM(mins: number): string {
  if (!mins || mins <= 0) return '00:00';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * live HH:MM:SS display for seconds
 */
export function formatHMS(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function parseHHMM(timeStr: string) {
  const [h, m] = (timeStr || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function getISTMinutes(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeShiftRules(zone: any): ShiftRules {
  const shiftStart = typeof zone?.shiftStart === 'string' ? zone.shiftStart : DEFAULT_SHIFT_RULES.shiftStart;
  const shiftEnd = typeof zone?.shiftEnd === 'string' ? zone.shiftEnd : DEFAULT_SHIFT_RULES.shiftEnd;
  const graceMinutes = Number.isFinite(zone?.graceMinutes) ? Math.max(0, Math.min(180, Number(zone.graceMinutes))) : DEFAULT_SHIFT_RULES.graceMinutes;
  const earlyGraceMinutes = Number.isFinite(zone?.earlyGraceMinutes) ? Math.max(0, Math.min(180, Number(zone.earlyGraceMinutes))) : DEFAULT_SHIFT_RULES.earlyGraceMinutes;
  const breakDuration = Number.isFinite(zone?.breakDuration) ? Math.max(0, Number(zone.breakDuration)) : DEFAULT_SHIFT_RULES.breakDuration;
  return { shiftStart, shiftEnd, graceMinutes, earlyGraceMinutes, breakDuration };
}

// Apply per-user work schedule over base rules when available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyUserSchedule(base: ShiftRules, workSchedule?: any): ShiftRules {
  if (!workSchedule) return base;
  const shiftStart = typeof workSchedule.startTime === 'string' && workSchedule.startTime
    ? workSchedule.startTime
    : base.shiftStart;
  const shiftEnd = typeof workSchedule.endTime === 'string' && workSchedule.endTime
    ? workSchedule.endTime
    : base.shiftEnd;
  const breakDuration = Number.isFinite(workSchedule.breakDuration)
    ? Number(workSchedule.breakDuration)
    : base.breakDuration;
  return {
    shiftStart,
    shiftEnd,
    graceMinutes: base.graceMinutes,
    earlyGraceMinutes: base.earlyGraceMinutes,
    breakDuration,
  };
}

export function getStatusByShiftRules(checkInAt: Date, rules: ShiftRules) {
  const shiftStartMins = parseHHMM(rules.shiftStart) ?? parseHHMM(DEFAULT_SHIFT_RULES.shiftStart)!;
  const checkInMins = getISTMinutes(checkInAt);

  if (checkInMins < shiftStartMins - (rules.earlyGraceMinutes || 0)) {
    return { dayStatus: 'Early' as const, earlyByMins: shiftStartMins - checkInMins, lateByMins: 0 };
  }
  if (checkInMins <= shiftStartMins + rules.graceMinutes) {
    return { dayStatus: 'On Time' as const, earlyByMins: 0, lateByMins: 0 };
  }
  return { dayStatus: 'Late' as const, earlyByMins: 0, lateByMins: checkInMins - (shiftStartMins + rules.graceMinutes) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deriveStatusFromAttendance(att: any, rules: ShiftRules) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstWork = (att?.sessions || []).find((s: any) => (s?.type || 'work') !== 'break');
  if (!firstWork?.checkIn) return { dayStatus: 'Absent' as const, earlyByMins: 0, lateByMins: 0 };
  return getStatusByShiftRules(new Date(firstWork.checkIn), rules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recomputeAttendanceTotals(att: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMins = (s: any): number => {
    const explicit = Number(s?.minutes);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    if (s?.checkIn && s?.checkOut) {
      const diff = new Date(s.checkOut).getTime() - new Date(s.checkIn).getTime();
      if (Number.isFinite(diff) && diff > 0) return Math.floor(diff / 60000);
    }
    return 0;
  };

  if (Array.isArray(att.sessions)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    att.sessions.forEach((s: any) => {
      const m = getMins(s);
      s.minutes = m;
      s.workMinutes = (s.type || 'work') !== 'break' ? m : 0;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  att.totalWorkMins = (att.sessions || []).reduce((sum: number, s: any) => {
    return sum + ((s.type || 'work') === 'break' ? 0 : getMins(s));
  }, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  att.totalBreakMins = (att.sessions || []).reduce((sum: number, s: any) => {
    return sum + ((s.type || 'work') === 'break' ? getMins(s) : 0);
  }, 0);

  if (Array.isArray(att.sessions) && att.sessions.length > 0) {
    const lastSession = att.sessions[att.sessions.length - 1];
    if (!lastSession.checkOut) {
      if (lastSession.type === 'break') {
        att.isCheckedIn = false;
        att.isOnBreak = true;
        att.isInField = false;
        att.workMode = 'Break';
      } else if (lastSession.type === 'field') {
        att.isCheckedIn = false;
        att.isOnBreak = false;
        att.isInField = true;
        att.workMode = 'Field';
      } else {
        att.isCheckedIn = true;
        att.isOnBreak = false;
        att.isInField = false;
        att.workMode = 'Present';
      }
    } else {
      att.isCheckedIn = false;
      att.isOnBreak = false;
      att.isInField = false;
      att.workMode = 'Present';
    }
  } else {
    att.isCheckedIn = false;
    att.isOnBreak = false;
    att.isInField = false;
    att.workMode = 'Absent';
  }
}
