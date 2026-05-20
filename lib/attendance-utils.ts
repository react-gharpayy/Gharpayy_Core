import Attendance from '@/models/Attendance';
import OfficeZone from '@/models/OfficeZone';
import User from '@/models/User';
import { notifyMissedClockOut } from '@/lib/system-notifications';
import { logAttendanceAudit } from './audit-logger';
import { getISTDateStr } from './date-utils';

export * from './attendance-shared';
export { getISTDateStr };

import { normalizeShiftRules } from './attendance-shared';

export async function getShiftRules() {
  const zone = await OfficeZone.findOne({}).lean();
  return normalizeShiftRules(zone);
}

function endOfISTDayAsUTC(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 18, 29, 59, 999));
}

function sessionMins(checkIn: Date, checkOut: Date) {
  const diff = checkOut.getTime() - checkIn.getTime();
  if (Number.isNaN(diff)) return 0;
  return Math.max(0, Math.floor(diff / 60000));
}

import { recomputeAttendanceTotals } from './attendance-shared';

export async function autoCloseMissedClockOut(employeeId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    $or: [{ isCheckedIn: true }, { isOnBreak: true }, { isInField: true }],
  };
  if (employeeId) query.employeeId = employeeId;

  const rows = await Attendance.find(query);
  let updated = 0;

  for (const att of rows) {
    try {
      const sessions = att.sessions || [];
      const last = sessions[sessions.length - 1];
      let changed = false;
      if (last && !last.checkOut) {
        const checkInTime = last.checkIn ? new Date(last.checkIn).getTime() : NaN;
        
        if (!Number.isNaN(checkInTime) && Date.now() - checkInTime < 16 * 60 * 60 * 1000) {
          continue; 
        }

        const fallbackClose = !Number.isNaN(checkInTime) 
          ? new Date(checkInTime + 16 * 60 * 60 * 1000) 
          : endOfISTDayAsUTC(att.date);

        if (!Number.isNaN(checkInTime)) {
          last.checkOut = fallbackClose;
          const mins = sessionMins(new Date(checkInTime), fallbackClose);
          last.minutes = mins;
          if (last.type !== 'break') last.workMinutes = mins;
          changed = true;
        } else {
          last.checkOut = fallbackClose;
          last.minutes = 0;
          if (last.type !== 'break') last.workMinutes = 0;
          changed = true;
        }
      }

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
        
        logAttendanceAudit({
          employeeId: String(att.employeeId),
          attendanceId: att._id.toString(),
          action: 'auto_close',
          date: att.date,
          actorId: String(att.employeeId), 
          metadata: { closedAt: last?.checkOut }
        });
        
        updated++;
      }
    } catch (err) {
      console.error(`Failed to auto-close attendance ${att._id}:`, err);
    }
  }

  return updated;
}
