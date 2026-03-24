'use client';
import { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, ChevronRight, X, Calendar, Info, Filter } from 'lucide-react';

interface Employee {
  employeeId: string;
  employeeName: string;
  role: string;
  team: string;
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

interface Zone { _id: string; name: string; }

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
  if (status === 'Early')   return 'bg-teal-100 text-teal-700';
  if (status === 'On Time') return 'bg-green-100 text-green-700';
  if (status === 'Late')    return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
}
function fmtISTTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}
function getTodayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

const STATUS_ORDER: Record<string, number> = { 'Early': 0, 'On Time': 1, 'Late': 2, 'Absent': 3 };

function sortEmployees(list: Employee[]) {
  return [...list].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.dayStatus] ?? 3) - (STATUS_ORDER[b.dayStatus] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    if (!a.checkInTime && !b.checkInTime) return 0;
    if (!a.checkInTime) return 1;
    if (!b.checkInTime) return -1;
    return a.checkInTime.localeCompare(b.checkInTime);
  });
}

export default function TodaysLog() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [present, setPresent]           = useState(0);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [drill, setDrill]               = useState<DrillDown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [shiftInfo, setShiftInfo]       = useState<any>(null);
  const [zones, setZones]               = useState<Zone[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [rangeStart, setRangeStart]     = useState('');
  const [rangeEnd, setRangeEnd]         = useState('');
  const [rangeMode, setRangeMode]       = useState(false);

  useEffect(() => {
    fetch('/api/zones').then(r => r.json())
      .then(d => { if (d.zones) setZones(d.zones); })
      .catch(() => {});
  }, []);

  const fetchLog = (date: string, teamId?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (teamId) params.set('team', teamId);
    fetch(`/api/attendance/heatmap?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.todayLog) {
          const sorted = sortEmployees(d.todayLog);
          setAllEmployees(sorted);
          setEmployees(sorted);
          setSelectedStatus('');
        }
        if (d.present !== undefined) setPresent(d.present);
        if (d.total !== undefined)   setTotal(d.total);
        if (d.shiftInfo)             setShiftInfo(d.shiftInfo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLog(selectedDate); }, []);

  // Status filter — client side
  useEffect(() => {
    if (!selectedStatus) {
      setEmployees(allEmployees);
    } else {
      setEmployees(allEmployees.filter(e => e.dayStatus === selectedStatus));
    }
  }, [selectedStatus, allEmployees]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    setRangeMode(false);
    fetchLog(date, selectedTeam);
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    fetchLog(selectedDate, teamId);
  };

  const handleRangeApply = () => {
    if (!rangeStart || !rangeEnd) return;
    setRangeMode(true);
    fetchLog(rangeStart, selectedTeam);
  };

  const resetFilters = () => {
    setSelectedTeam('');
    setSelectedStatus('');
    setRangeStart('');
    setRangeEnd('');
    setRangeMode(false);
    const today = getTodayIST();
    setSelectedDate(today);
    fetchLog(today);
  };

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

  const isToday = selectedDate === getTodayIST() && !rangeMode;
  const activeFilters = [selectedTeam, selectedStatus].filter(Boolean).length;

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Attendance</h2>
          </div>
          <span className="text-gray-700 text-sm md:text-base">
            {rangeMode ? `${rangeStart} → ${rangeEnd}` : isToday ? 'Today' : selectedDate}
            &nbsp;·&nbsp;<strong className="text-gray-800">{present}/{total} present</strong>
          </span>
        </div>

        {/* Date + filter row */}
        <div className="flex gap-2 mb-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 flex-1">
            <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <input type="date" value={selectedDate} max={getTodayIST()}
              onChange={handleDateChange}
              className="bg-transparent text-sm text-gray-700 focus:outline-none w-full" />
          </div>
          <button onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border text-sm font-medium transition ${
              showFilters || activeFilters > 0
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
            }`}>
            <Filter className="w-4 h-4" />
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
          {(!isToday || activeFilters > 0) && (
            <button onClick={resetFilters}
              className="px-3 py-2.5 rounded-2xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition whitespace-nowrap">
              Reset
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3 space-y-3">
            {/* Zone filter */}
            <div>
              <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2 block">Zone / Team</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleTeamChange('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    !selectedTeam ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}>All Zones</button>
                {zones.map(z => (
                  <button key={z._id} onClick={() => handleTeamChange(z._id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      selectedTeam === z._id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}>{z.name}</button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {['', 'Early', 'On Time', 'Late', 'Absent'].map(s => (
                  <button key={s} onClick={() => setSelectedStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      selectedStatus === s ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}>{s || 'All'}</button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide mb-2 block">Date Range</label>
              <div className="flex gap-2 items-center">
                <input type="date" value={rangeStart} max={getTodayIST()}
                  onChange={e => setRangeStart(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <span className="text-gray-400 text-xs flex-shrink-0">to</span>
                <input type="date" value={rangeEnd} max={getTodayIST()}
                  onChange={e => setRangeEnd(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <button onClick={handleRangeApply} disabled={!rangeStart || !rangeEnd}
                  className="px-3 py-2 bg-orange-500 text-white text-xs font-medium rounded-xl hover:bg-orange-600 transition disabled:opacity-40 flex-shrink-0">
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shift info */}
        {shiftInfo && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5 mb-4">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>Shift:</strong> Early = before {shiftInfo.earlyBefore} &nbsp;·&nbsp;
              On Time = till {shiftInfo.onTimeTill} &nbsp;·&nbsp;
              Late = after {shiftInfo.lateAfter}
            </p>
          </div>
        )}

        <h3 className="text-gray-600 text-sm font-medium mb-4">
          {employees.length} employees · sorted Early first · click for details
        </h3>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}
          </div>
        ) : employees.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No records for selected filters</p>
        ) : (
          <div className="space-y-2">
            {employees.map(emp => {
              const ci = colorIdx(emp.employeeName);
              return (
                <button key={emp.employeeId} onClick={() => openDrillDown(emp.employeeId)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-transparent transition text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${COLORS[ci]} flex items-center justify-center text-xs font-bold ${TEXT_COLORS[ci]} flex-shrink-0`}>
                      {initials(emp.employeeName)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{emp.employeeName}</p>
                      <p className="text-xs text-gray-400">{emp.team || emp.role}</p>
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
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${COLORS[colorIdx(drill.employee.fullName)]} flex items-center justify-center text-sm font-bold ${TEXT_COLORS[colorIdx(drill.employee.fullName)]}`}>
                      {initials(drill.employee.fullName)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{drill.employee.fullName}</p>
                      <p className="text-xs text-gray-700 capitalize">{drill.employee.role} · {drill.employee.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrill(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                    <X className="w-4 h-4 text-gray-700"/>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {!drill.attendance ? (
                    <div className="text-center py-8">
                      <XCircle className="w-10 h-10 text-red-300 mx-auto mb-3"/>
                      <p className="font-semibold text-gray-700">Absent</p>
                      <p className="text-sm text-gray-400 mt-1">No attendance record for this date</p>
                    </div>
                  ) : (
                    <>
                      <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                        drill.attendance.isCheckedIn ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div>
                          <p className="text-xs text-gray-700 mb-0.5">Status</p>
                          <p className={`font-bold text-sm ${drill.attendance.isCheckedIn ? 'text-green-700' : 'text-gray-700'}`}>
                            {drill.attendance.isCheckedIn ? '● Active Right Now' : '✓ Checked Out'}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusStyle(drill.attendance.dayStatus)}`}>
                          {drill.attendance.dayStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Clocked In',   value: drill.attendance.firstCheckIn ? fmtISTTime(drill.attendance.firstCheckIn) : '--' },
                          { label: 'Clocked Out',  value: drill.attendance.lastCheckOut ? fmtISTTime(drill.attendance.lastCheckOut) : drill.attendance.isCheckedIn ? 'Still active' : '--' },
                          { label: 'Total Worked', value: drill.attendance.totalWorkFormatted },
                          { label: 'Sessions',     value: String(drill.attendance.sessions) },
                        ].map(s => (
                          <div key={s.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                            <p className="text-sm font-bold text-gray-800">{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {drill.attendance.timeline.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Timeline</p>
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
