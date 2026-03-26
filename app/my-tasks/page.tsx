'use client';
import { useEffect, useState } from 'react';
import EmployeeSidebar from '@/components/employee-sidebar';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface Task { _id: string; title: string; description: string; assignedByName: string; dueDate: string | null; priority: string; status: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo:           { label: 'To Do',          color: '#6b7280', bg: '#f3f4f6' },
  in_progress:    { label: 'In Progress',     color: '#818cf8',              bg: 'rgba(99,102,241,0.12)'  },
  blocked:        { label: 'Blocked',         color: '#ef4444',              bg: 'rgba(239,68,68,0.12)'   },
  pending_review: { label: 'Pending Review',  color: '#f59e0b',              bg: 'rgba(245,158,11,0.12)'  },
  completed:      { label: 'Done',            color: '#10b981',              bg: 'rgba(16,185,129,0.12)'  },
  overdue:        { label: 'Overdue',         color: '#ef4444',              bg: 'rgba(239,68,68,0.15)'   },
};

const PRIORITY_COLOR: Record<string, string> = { low: '#6b7280', medium: '#818cf8', high: '#f59e0b', urgent: '#ef4444' };

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTasks = () => {
    fetch('/api/tasks', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.tasks) setTasks(d.tasks); if (d.summary) setSummary(d.summary); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (taskId: string, status: string) => {
    setUpdating(taskId);
    try {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, status }) });
      fetchTasks();
    } catch {} setUpdating(null);
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <EmployeeSidebar />
      <div className="md:ml-64 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          <div style={card} className="p-5">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">ARENA OS - My Tasks</h1>
            <div className="text-xs mb-4" style={{ color: '#6b7280' }}>
              {summary.total || 0} tasks  -  {summary.completed || 0} done  -  {summary.blocked || 0} blocked
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'To Do',    value: summary.todo || 0,      color: '#6b7280' },
                { label: 'Active',   value: summary.in_progress || 0, color: '#818cf8' },
                { label: 'Blocked',  value: summary.blocked || 0,   color: '#ef4444' },
                { label: 'Done',     value: summary.completed || 0, color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px]" style={{ color: '#6b7280' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: '#ffffff' }}/>)}
            </div>
          ) : tasks.length === 0 ? (
            <div style={card} className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#d1d5db' }}/>
              <div className="text-sm text-gray-900 font-semibold">No tasks assigned</div>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                return (
                  <div key={task._id} style={card} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                          <span className="text-[10px] font-bold" style={{ color: PRIORITY_COLOR[task.priority] || '#818cf8' }}>{task.priority?.toUpperCase()}</span>
                          {task.status === 'blocked' && <AlertTriangle className="w-3.5 h-3.5 text-red-400"/>}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{task.title}</div>
                        {task.description && <div className="text-xs mt-1" style={{ color: '#6b7280' }}>{task.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: '#f9fafb' }}>
                      <div className="text-[10px]" style={{ color: '#6b7280' }}>
                        From {task.assignedByName}
                        {task.dueDate && <span>  -  Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      <select value={task.status} onChange={e => updateStatus(task._id, e.target.value)} disabled={updating === task._id}
                        className="text-[10px] py-1 px-2 rounded-lg focus:outline-none disabled:opacity-50"
                        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563' }}>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="completed">Done</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




