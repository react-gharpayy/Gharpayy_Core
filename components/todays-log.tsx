'use client';
import { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, ChevronRight, X } from 'lucide-react';

interface Employee {
  employeeId: string;
  employeeName: string;
  role: string;
  checkInTime: string | null;
  isCheckedIn: boolean;
  dayStatus: 'Early' | 'On Time' | 'Late' | 'Absent';
  totalWorkMins: number;
}

interface DrillDown {
  employee: { _id: string; fullName: string; email: string; role: string };
  attendance: {
    isCheckedIn: boolean;
    dayStatus: string;
    firstCheckIn: string | null;
    lastCheckOut: string | null;
    totalWorkMins: number;
    totalWorkFormatted: string;
    sessions: number;
    timeline: { time: string; label: string; type: string }[];
  } | null;
}

const COLORS = ['bg-blue-200','bg-purple-200','bg-yellow-200','bg-green-200','bg-pink-200','bg-orange-200'];
const TEXT_COLORS = ['text-blue-700','text-purple-700','text-yellow-700','text-green-700','text-pink-700','text-orange-700'];

function colorIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return h;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function statusStyle(status: string) {
  if (status === 'Early')   return 'bg-blue-100 text-blue-700';
  if (status === 'On Time') return 'bg-green-100 text-green-700';
  if (status === 'Late')    return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-500';
}

function fmtMins(m: number) {
  if (!m) return '0m';
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function TodaysLog() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillDown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    fetch('/api/attendance/heatmap', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.todayLog) setEmployees(d.todayLog);
        if (d.present !== undefined) setPresent(d.present);
        if (d.total !== undefined) setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openDrillDown = async (empId: string) => {
    setDrillLoading(true);
    setDrill(null);
    try {
      const r = await fetch(`/api/attendance/employee?id=${empId}`, { cache: 'no-store' });
      const d = await r.json();
      setDrill(d);
    } catch {}
    setDrillLoading(false);
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Attendance</h2>
          </div>
          <span className="text-gray-500 text-sm md:text-base">
            Today · <strong className="text-gray-800">{present}/{total} present</strong>
          </span>
        </div>

        <h3 className="text-gray-600 text-sm font-medium mb-4">Today's Log — click any employee for details</h3>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}
          </div>
        ) : employees.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No employee records found</p>
        ) : (
          <div className="space-y-2">
            {employees.map(emp => {
              const ci = colorIdx(emp.employeeName);
              return (
                <button
                  key={emp.employeeId}
                  onClick={() => openDrillDown(emp.employeeId)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${COLORS[ci]} flex items-center justify-center text-xs font-bold ${TEXT_COLORS[ci]} flex-shrink-0`}>
                      {initials(emp.employeeName)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{emp.employeeName}</p>
                      <p className="text-xs text-gray-500 capitalize">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{emp.checkInTime || '--:--'}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle(emp.dayStatus)}`}>
                        {emp.dayStatus}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400"/>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Drill-down modal */}
      {(drillLoading || drill) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4"
          onClick={() => setDrill(null)}>
          <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {drillLoading ? (
              <div className="p-8 animate-pulse space-y-4">
                <div className="h-6 bg-gray-100 rounded w-1/2"/>
                <div className="h-32 bg-gray-100 rounded-2xl"/>
              </div>
            ) : drill && (
              <>
                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${COLORS[colorIdx(drill.employee.fullName)]} flex items-center justify-center text-sm font-bold ${TEXT_COLORS[colorIdx(drill.employee.fullName)]}`}>
                      {initials(drill.employee.fullName)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{drill.employee.fullName}</p>
                      <p className="text-xs text-gray-500 capitalize">{drill.employee.role} · {drill.employee.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrill(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                    <X className="w-4 h-4 text-gray-500"/>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {!drill.attendance ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <XCircle className="w-6 h-6 text-red-400"/>
                      </div>
                      <p className="font-semibold text-gray-700">Absent Today</p>
                      <p className="text-sm text-gray-400 mt-1">No attendance record for today</p>
                    </div>
                  ) : (
                    <>
                      {/* Status badge */}
                      <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                        drill.attendance.isCheckedIn
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Current Status</p>
                          <p className={`font-bold text-sm ${drill.attendance.isCheckedIn ? 'text-green-700' : 'text-gray-700'}`}>
                            {drill.attendance.isCheckedIn ? '● Active Right Now' : '✓ Checked Out'}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusStyle(drill.attendance.dayStatus)}`}>
                          {drill.attendance.dayStatus}
                        </span>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Clocked In',  value: drill.attendance.firstCheckIn ? new Date(drill.attendance.firstCheckIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--' },
                          { label: 'Clocked Out', value: drill.attendance.lastCheckOut  ? new Date(drill.attendance.lastCheckOut).toLocaleTimeString('en-IN',  { hour: '2-digit', minute: '2-digit', hour12: true }) : drill.attendance.isCheckedIn ? 'Still active' : '--' },
                          { label: 'Total Worked', value: drill.attendance.totalWorkFormatted },
                          { label: 'Sessions',    value: String(drill.attendance.sessions) },
                        ].map(s => (
                          <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                            <p className="text-sm font-bold text-gray-800">{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Timeline */}
                      {drill.attendance.timeline.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</p>
                          <div className="space-y-2">
                            {drill.attendance.timeline.map((ev, i) => (
                              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                                ev.type === 'checkin' ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                              }`}>
                                {ev.type === 'checkin'
                                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0"/>
                                  : <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
                                <span className="text-sm text-gray-700 flex-1">{ev.label}</span>
                                <span className="text-xs text-gray-400 font-medium">{ev.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
