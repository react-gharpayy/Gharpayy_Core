import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Notice from '@/models/Notice';
import { getISTDateStr } from '@/lib/attendance-utils';
import { BREAK_LIMIT_MINS } from '@/lib/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function csvEscape(v: any) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCSV(headers: string[], rows: any[][]) {
  return [headers.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n');
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'daily_attendance';
    const format = url.searchParams.get('format') || 'csv';
    const month = url.searchParams.get('month'); // YYYY-MM
    const today = getISTDateStr();

    const filename = `${type}_${today}.${format === 'excel' ? 'xls' : 'csv'}`;
    let content = '';

    if (type === 'daily_attendance') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await Attendance.find({ date: today }).lean() as any[];
      content = toCSV(
        ['employeeId', 'date', 'dayStatus', 'workMode', 'isCheckedIn', 'totalWorkMins', 'totalBreakMins', 'lateByMins', 'earlyByMins'],
        rows.map(r => [r.employeeId, r.date, r.dayStatus, r.workMode || '', !!r.isCheckedIn, r.totalWorkMins || 0, r.totalBreakMins || 0, r.lateByMins || 0, r.earlyByMins || 0]),
      );
    } else if (type === 'weekly_summary') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks = await Task.find({}).lean() as any[];
      content = toCSV(
        ['taskId', 'title', 'assignee', 'status', 'priority', 'dueDate', 'teamName', 'createdAt'],
        tasks.map(t => [t._id, t.title, t.assignedToName, t.status, t.priority, t.dueDate || '', t.teamName || '', t.createdAt]),
      );
    } else if (type === 'kpi_export') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attendanceToday = await Attendance.find({ date: today }).lean() as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks = await Task.find({}).lean() as any[];
      const total = attendanceToday.length || 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const present = attendanceToday.filter((a: any) => a.dayStatus !== 'Absent').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onTime = attendanceToday.filter((a: any) => a.dayStatus === 'On Time' || a.dayStatus === 'Early').length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completed = tasks.filter((t: any) => t.status === 'completed').length;
      content = toCSV(
        ['metric', 'value'],
        [
          ['attendance_rate_pct', Math.round((present / total) * 100)],
          ['on_time_rate_pct', Math.round((onTime / total) * 100)],
          ['task_completion_pct', tasks.length ? Math.round((completed / tasks.length) * 100) : 0],
        ],
      );
    } else if (type === 'notice_ack') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notices = await Notice.find({}).lean() as any[];
      content = toCSV(
        ['noticeId', 'title', 'type', 'createdByName', 'createdAt', 'readCount'],
        notices.map(n => [n._id, n.title, n.type, n.createdByName || '', n.createdAt, Array.isArray(n.readBy) ? n.readBy.length : 0]),
      );
    } else if (type === 'break_violations') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await Attendance.find({ date: today, totalBreakMins: { $gt: BREAK_LIMIT_MINS } }).lean() as any[];
      content = toCSV(
        ['employeeId', 'date', 'totalBreakMins', 'status'],
        rows.map(r => [r.employeeId, r.date, r.totalBreakMins || 0, 'violation']),
      );
    } else if (type === 'geo_compliance') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await Attendance.find({ date: today }).lean() as any[];
      content = toCSV(
        ['employeeId', 'date', 'sessionIndex', 'type', 'lat', 'lng'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows.flatMap((r: any) => (r.sessions || []).map((s: any, i: number) => [r.employeeId, r.date, i + 1, s.type || 'work', s.lat ?? '', s.lng ?? ''])),
      );
    } else if (type === 'monthly_attendance') {
      const ym = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await Attendance.find({ date: { $gte: `${ym}-01`, $lte: `${ym}-31` } }).lean() as any[];
      content = toCSV(
        ['employeeId', 'date', 'dayStatus', 'totalWorkMins', 'totalBreakMins', 'lateByMins', 'earlyByMins'],
        rows.map(r => [r.employeeId, r.date, r.dayStatus, r.totalWorkMins || 0, r.totalBreakMins || 0, r.lateByMins || 0, r.earlyByMins || 0]),
      );
    } else {
      return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': format === 'excel' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
