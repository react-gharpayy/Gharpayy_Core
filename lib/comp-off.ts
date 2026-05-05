import CompOffCredit from '@/models/CompOffCredit';
import LeaveBalance from '@/models/LeaveBalance';
import Holiday from '@/models/Holiday';
import User from '@/models/User';
import { getPolicyForUser, ensureLeaveBalance, weekdayName } from '@/lib/leave-utils';

export async function maybeCreditCompOff(employeeId: string, date: string, attendanceId?: string, minutesWorked = 0) {
  const policy = await getPolicyForUser(employeeId);
  const policyAny = policy as any;
  if (!policyAny?.compOffEnabled) return { credited: false };

  const threshold = Number(policyAny?.overtimeAfterMinutes ?? policyAny?.overtimeThresholdMinutes ?? 0);
  if (policyAny?.overtimeEnabled && minutesWorked < threshold) return { credited: false };

  const holiday = await Holiday.findOne({ date }).lean();
  const user = await User.findById(employeeId).select('workSchedule').lean() as any;
  const weekOffs = Array.isArray(user?.workSchedule?.weekOffs) && user.workSchedule.weekOffs.length > 0
    ? user.workSchedule.weekOffs
    : Array.isArray(policyAny?.weeklyOffDays) ? policyAny.weeklyOffDays : [];
  const isWeekOff = weekOffs.map((d: string) => d.toLowerCase()).includes(weekdayName(date).toLowerCase());
  const isHoliday = !!holiday;

  if (!isHoliday && !isWeekOff) return { credited: false };

  const existing = await CompOffCredit.findOne({ employeeId, date });
  if (existing) return { credited: false, reason: 'already_credited' };

  await CompOffCredit.create({
    employeeId,
    date,
    source: isHoliday ? 'holiday' : 'week_off',
    attendanceId,
    minutesWorked,
  });

  const balance = await ensureLeaveBalance(employeeId);
  balance.comp_off.total = Number(balance.comp_off?.total || 0) + 1;
  await balance.save();

  return { credited: true, source: isHoliday ? 'holiday' : 'week_off' };
}
