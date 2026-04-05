import Attendance from '@/models/Attendance';
import OfficeZone from '@/models/OfficeZone';
import User from '@/models/User';
import { notifyMissedClockOut } from '@/lib/system-notifications';
import { IST_OFFSET_MS } from '@/lib/constants';

export type ShiftRules = {
  shiftStart: string;
  shiftEnd: string;
  graceMinutes: number;
  earlyGraceMinutes: number;
};

export const DEFAULT_SHIFT_RULES: ShiftRules = {
  shiftStart: '10:00',
  shiftEnd: '19:00',
  graceMinutes: 15,
  earlyGraceMinutes: 0,
};

export function getISTDateStr(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
}

function parseHHMM(timeStr: string) {
  const [h, m] = (timeStr || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function getISTMinutes(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeShiftRules(zone: any): ShiftRules {
  const shiftStart = typeof zone?.shiftStart === 'string' ? zone.shiftStart : DEFAULT_SHIFT_RULES.shiftStart;
  const shiftEnd = typeof zone?.shiftEnd === 'string' ? zone.shiftEnd : DEFAULT_SHIFT_RULES.shiftEnd;
  const graceMinutes = Number.isFinite(zone?.graceMinutes) ? Math.max(0, Math.min(180, Number(zone.graceMinutes))) : DEFAULT_SHIFT_RULES.graceMinutes;
  const earlyGraceMinutes = Number.isFinite(zone?.earlyGraceMinutes) ? Math.max(0, Math.min(180, Number(zone.earlyGraceMinutes))) : DEFAULT_SHIFT_RULES.earlyGraceMinutes;
  return { shiftStart, shiftEnd, graceMinutes, earlyGraceMinutes };
}

export async function getShiftRules() {
  const zone = await OfficeZone.findOne({}).lean();
  return normalizeShiftRules(zone);
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
  return {
    shiftStart,
    shiftEnd,
    graceMinutes: base.graceMinutes,
    earlyGraceMinutes: base.earlyGraceMinutes,
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

function endOfISTDayAsUTC(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 18, 29, 59, 999));
}

function sessionMins(checkIn: Date, checkOut: Date) {
  return Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recomputeAttendanceTotals(att: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMins = (s: any) => {
    const explicit = Number.isFinite(Number(s?.minutes)) ? Number(s.minutes) : null;
    const legacy = Number.isFinite(Number(s?.workMinutes)) ? Number(s.workMinutes) : 0;
    if (explicit !== null && explicit > 0) return explicit;
    if (explicit === 0 && legacy > 0) return legacy; // legacy records where minutes defaulted to 0
    return explicit ?? legacy ?? 0;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  att.totalWorkMins = (att.sessions || []).reduce((sum: number, s: any) => {
    const mins = getMins(s);
    return sum + ((s.type || 'work') === 'break' ? 0 : mins);
  }, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  att.totalBreakMins = (att.sessions || []).reduce((sum: number, s: any) => {
    const mins = getMins(s);
    return sum + ((s.type || 'work') === 'break' ? mins : 0);
  }, 0);
}

export async function autoCloseMissedClockOut(employeeId?: string) {
  const today = getISTDateStr();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    date: { $lt: today },
    $or: [{ isCheckedIn: true }, { isOnBreak: true }, { isInField: true }],
  };
  if (employeeId) query.employeeId = employeeId;

  const rows = await Attendance.find(query);
  let updated = 0;

  for (const att of rows) {
    try {
      const sessions = att.sessions || [];
      const last = sessions[sessions.length - 1];
      const closeAt = endOfISTDayAsUTC(att.date);
      let changed = false;

      if (last && !last.checkOut) {
        last.checkOut = closeAt;
        const mins = sessionMins(new Date(last.checkIn), closeAt);
        last.minutes = mins;
        if (last.type !== 'break') last.workMinutes = mins;
        changed = true;
      }

      att.isCheckedIn = false;
      att.isOnBreak = false;
      att.isInField = false;
      if (att.dayStatus !== 'Absent') att.workMode = 'Present';
      recomputeAttendanceTotals(att);
      att.markModified('sessions');
      await att.save();
      if (changed) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const emp = await User.findById(att.employeeId, 'fullName').lean() as any;
        await notifyMissedClockOut({
          employeeId: String(att.employeeId),
          employeeName: emp?.fullName || 'Employee',
          date: att.date,
        });
        updated++;
      }
    } catch (err) {
      console.error(`Failed to auto-close attendance ${att._id}:`, err);
    }
  }

  return updated;
}
