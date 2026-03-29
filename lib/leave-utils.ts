import AttendancePolicy from '@/models/AttendancePolicy';
import Holiday from '@/models/Holiday';
import LeaveBalance from '@/models/LeaveBalance';
import User from '@/models/User';
import { getISTDateStr } from '@/lib/attendance-utils';
import { IST_OFFSET_MS } from '@/lib/constants';

export function listDatesInRange(startDate: string, endDate: string) {
  const days: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    const ist = new Date(d.getTime() + IST_OFFSET_MS);
    days.push(ist.toISOString().split('T')[0]);
  }
  return days;
}

export function weekdayName(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
}

export async function getDefaultPolicy() {
  const existing = await AttendancePolicy.findOne({ isDefault: true }).lean();
  if (existing) return existing;
  const created = await AttendancePolicy.create({
    name: 'Default Policy',
    isDefault: true,
    graceMinutes: 15,
    holidayExclusionEnabled: true,
    weeklyOffExclusionEnabled: true,
    overtimeEnabled: false,
    overtimeAfterMinutes: 0,
    compOffEnabled: true,
  });
  return created.toObject();
}

export async function getPolicyForUser(userId: string) {
  const user = await User.findById(userId).select('workSchedule').lean() as any;
  const shiftType = user?.workSchedule?.shiftType;
  if (shiftType) {
    const policy = await AttendancePolicy.findOne({ shiftType }).lean();
    if (policy) return policy;
  }
  return getDefaultPolicy();
}

export async function getHolidaysInRange(startDate: string, endDate: string) {
  return Holiday.find({ date: { $gte: startDate, $lte: endDate } }).lean();
}

export function calculateLeaveDays(options: {
  startDate: string;
  endDate: string;
  weekOffs?: string[];
  holidays?: string[];
  holidayExclusionEnabled?: boolean;
  weeklyOffExclusionEnabled?: boolean;
}) {
  const {
    startDate, endDate,
    weekOffs = [],
    holidays = [],
    holidayExclusionEnabled = true,
    weeklyOffExclusionEnabled = true,
  } = options;
  const holidaySet = new Set(holidays);
  const weekOffSet = new Set(weekOffs.map(d => d.toLowerCase()));
  const days = listDatesInRange(startDate, endDate);
  let count = 0;
  for (const day of days) {
    const isHoliday = holidaySet.has(day);
    const isWeekOff = weekOffSet.has(weekdayName(day).toLowerCase());
    if (holidayExclusionEnabled && isHoliday) continue;
    if (weeklyOffExclusionEnabled && isWeekOff) continue;
    count += 1;
  }
  return count;
}

export async function ensureLeaveBalance(employeeId: string) {
  const existing = await LeaveBalance.findOne({ employeeId });
  if (existing) return existing;
  const created = await LeaveBalance.create({
    employeeId,
    paid: 12,
    sick: 6,
    casual: 6,
    compOff: 0,
    lop: 0,
    encashable: 0,
    encashed: 0,
    ratePerDay: 0,
  });
  return created;
}

export function getISTToday() {
  return getISTDateStr(new Date());
}
