'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, ClipboardList, BarChart2 } from 'lucide-react';

interface AttendanceRecord {
  employeeId: string;
  fullName: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
}

interface TaskRecord {
  _id: string;
  title: string;
  assignedToName?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
}

interface Props {
  assignedTeamId: string;
  userName: string;
}

export default function SubAdminDashboard({ assignedTeamId, userName }: Props) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'tasks'>('attendance');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, taskRes] = await Promise.all([
        fetch(`/api/attendance?teamId=${assignedTeamId}`),
        fetch(`/api/tasks?teamId=${assignedTeamId}`),
      ]);
      const attData = await attRes.json();
      const taskData = await taskRes.json();
      // Normalize attendance
      if (Array.isArray(attData)) setAttendance(attData);
      else if (attData.records) setAttendance(attData.records);
      else if (attData.attendance) setAttendance(attData.attendance);
      // Normalize tasks
      if (Array.isArray(taskData)) setTasks(taskData);
      else if (taskData.tasks) setTasks(taskData.tasks);
    } finally {
      setLoading(false);
    }
  }, [assignedTeamId]);

  useEffect(() => { if (assignedTeamId) fetchData(); }, [fetchData, assignedTeamId]);

  const TABS = [
    { id: 'attendance' as const, label: 'Attendance', icon: Users },
    { id: 'tasks' as const, label: 'Task Board', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Welcome, {userName}</h1>
            <p className="text-sm text-gray-500">Sub-Admin — Team View Only</p>
          </div>
        </div>
        {!assignedTeamId && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-4 py-3 text-sm">
            You are not assigned to a team yet. Please contact your admin.
          </div>
        )}
      </div>

      {assignedTeamId && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 ${
                    activeTab === tab.id
                      ? 'text-orange-500 border-orange-500'
                      : 'text-gray-600 border-transparent hover:text-gray-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {loading ? (
                <p className="text-sm text-gray-400">Loading team data...</p>
              ) : activeTab === 'attendance' ? (
                attendance.length === 0 ? (
                  <p className="text-sm text-gray-400">No attendance records for your team.</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.slice(0, 30).map((rec, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{rec.fullName}</p>
                          <p className="text-xs text-gray-500">{rec.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">{rec.clockIn || '--'} → {rec.clockOut || '--'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            rec.status === 'present' ? 'bg-green-100 text-green-700' :
                            rec.status === 'absent' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{rec.status || 'unknown'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                tasks.length === 0 ? (
                  <p className="text-sm text-gray-400">No tasks for your team.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task._id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{task.title}</p>
                          {task.assignedToName && <p className="text-xs text-gray-500">Assigned: {task.assignedToName}</p>}
                        </div>
                        <div className="text-right">
                          {task.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{task.priority}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
