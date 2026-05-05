'use client';

import { useEffect, useState, useCallback } from 'react';

const LEAVE_TYPE_COLORS: Record<string, string> = {
  casual: 'bg-blue-100 text-blue-800 border-blue-200',
  sick: 'bg-red-100 text-red-800 border-red-200',
  earned: 'bg-green-100 text-green-800 border-green-200',
  comp_off: 'bg-purple-100 text-purple-800 border-purple-200',
  lop: 'bg-orange-100 text-orange-800 border-orange-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type LeaveEntry = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  isHalfDay: boolean;
};

type EmployeeLeaves = {
  employeeId: string;
  employeeName: string;
  leaves: LeaveEntry[];
};

export default function TeamCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<EmployeeLeaves[]>([]);
  const [loading, setLoading] = useState(false);

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

  const fetchTeamLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaves/team?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.ok) setData(json.employees);
    } catch {}
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTeamLeaves();
  }, [fetchTeamLeaves]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build day columns for current month
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  const isOnLeave = (leave: LeaveEntry, day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return d >= leave.startDate && d <= leave.endDate;
  };

  const getLeaveForDay = (leaves: LeaveEntry[], day: number) =>
    leaves.find((l) => isOnLeave(l, day));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Team Leave Calendar</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-5 py-2 border-b border-gray-50">
        {Object.entries(LEAVE_TYPE_COLORS).map(([type, cls]) => (
          <span key={type} className={`text-xs px-2 py-0.5 rounded border ${cls}`}>
            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
          </span>
        ))}
        <span className="text-xs px-2 py-0.5 rounded border bg-yellow-50 text-yellow-700 border-yellow-200">Pending</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No team leaves found for this month</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 z-10 px-4 py-2 text-left font-medium text-gray-600 min-w-[140px] border-r border-gray-100">
                  Employee
                </th>
                {days.map((d) => {
                  const date = new Date(year, month, d);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
                  return (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center font-medium min-w-[28px] ${
                        isToday ? 'bg-blue-600 text-white rounded' : isWeekend ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((emp) => (
                <tr key={emp.employeeId} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-4 py-1.5 font-medium text-gray-700 border-r border-gray-100 truncate max-w-[140px]">
                    {emp.employeeName || 'Unknown'}
                  </td>
                  {days.map((d) => {
                    const leave = getLeaveForDay(emp.leaves, d);
                    const colorCls = leave
                      ? leave.status === 'pending'
                        ? 'bg-yellow-50 border-yellow-200'
                        : LEAVE_TYPE_COLORS[leave.leaveType] || LEAVE_TYPE_COLORS.other
                      : '';
                    return (
                      <td key={d} className="px-0.5 py-1 text-center">
                        {leave ? (
                          <div
                            title={`${leave.leaveType} - ${leave.status}${leave.isHalfDay ? ' (half day)' : ''}`}
                            className={`w-5 h-5 mx-auto rounded text-center text-xs flex items-center justify-center border ${colorCls}`}
                          >
                            {leave.isHalfDay ? '½' : '●'}
                          </div>
                        ) : (
                          <div className="w-5 h-5 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
