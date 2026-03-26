'use client';
import { useEffect, useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';

interface Task {
  _id: string; title: string; description: string;
  assignedToName: string; assignedByName: string;
  dueDate: string | null; priority: string; status: string;
  teamName: string; createdAt: string;
}
interface Employee { _id: string; fullName: string; email: string; }

const COLUMNS = [
  { id: 'todo',           label: 'TO DO',          color: '#6b7280'  },
  { id: 'in_progress',    label: 'IN PROGRESS',     color: '#6366f1'                },
  { id: 'blocked',        label: 'BLOCKED',         color: '#ef4444'                },
  { id: 'pending_review', label: 'PENDING REVIEW',  color: '#f59e0b'                },
  { id: 'completed',      label: 'DONE',            color: '#10b981'                },
];

const PRIORITY_COLOR: Record<string, { bg: string; text: string }> = {
  low:    { bg: '#f3f4f6', text: '#6b7280' },
  medium: { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8'               },
  high:   { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b'               },
  urgent: { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444'               },
};

const AVATAR_COLORS = ['#f97316','#6366f1','#10b981','#a855f7','#f59e0b','#ef4444'];
function avColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 6; return AVATAR_COLORS[h]; }
function initials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase(); }

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', assignedToName: '', dueDate: '', priority: 'medium', teamName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTasks = () => {
    setLoading(true);
    fetch('/api/tasks', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.tasks) setTasks(d.tasks); if (d.summary) setSummary(d.summary); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    fetch('/api/employees').then(r => r.json()).then(d => { if (d.users) setEmployees(d.users); }).catch(() => {});
  }, []);

  const createTask = async () => {
    if (!form.title || !form.assignedTo) return;
    setSubmitting(true);
    try {
      const emp = employees.find(e => e._id === form.assignedTo);
      const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, assignedToName: emp?.fullName || '' }) });
      const d = await r.json();
      if (d.ok) { setShowForm(false); setForm({ title: '', description: '', assignedTo: '', assignedToName: '', dueDate: '', priority: 'medium', teamName: '' }); fetchTasks(); }
    } catch {} setSubmitting(false);
  };

  const updateStatus = async (taskId: string, status: string) => {
    setUpdating(taskId);
    try {
      await fetch('/api/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, status }) });
      fetchTasks();
    } catch {} setUpdating(null);
  };

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };
  const colBg = { background: '#f9fafb', border: '1px solid #f9fafb', borderRadius: 16 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={card} className="p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Task Management Console</h1>
          <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
            {summary.total || 0} tasks  -  {summary.completed || 0} done  -  {summary.blocked || 0} blocked
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff' }}>
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl" style={{ background: '#ffffff' }}/>)}
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-3 min-w-max md:min-w-0 md:grid md:grid-cols-5 pb-4">
            {COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} style={colBg} className="w-72 md:w-auto p-3">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-bold tracking-wider" style={{ color: col.color }}>{col.label}</span>
                    <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#e5e7eb', color: '#6b7280' }}>{colTasks.length}</span>
                  </div>

                  <div className="space-y-2">
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-xs" style={{ color: '#e5e7eb' }}>No tasks</div>
                    )}
                    {colTasks.map(task => {
                      const pc = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium;
                      return (
                        <div key={task._id} className="p-3 rounded-2xl transition-all hover:border-white/10"
                          style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase"
                              style={{ background: pc.bg, color: pc.text }}>{task.priority}</span>
                            {task.status === 'blocked' && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0"/>}
                          </div>
                          <p className="text-sm font-medium text-gray-900 leading-tight mb-2">{task.title}</p>
                          {task.description && <p className="text-[11px] mb-2 line-clamp-2" style={{ color: '#6b7280' }}>{task.description}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                style={{ background: avColor(task.assignedToName), color: '#fff' }}>
                                {initials(task.assignedToName)}
                              </div>
                              <span className="text-[10px]" style={{ color: '#6b7280' }}>{task.assignedToName.split(' ')[0]}</span>
                            </div>
                            {task.dueDate && (
                              <span className="text-[9px]" style={{ color: '#9ca3af' }}>
                                {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          {/* Status change */}
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: '#f9fafb' }}>
                            <select value={task.status}
                              onChange={e => updateStatus(task._id, e.target.value)}
                              disabled={updating === task._id}
                              className="w-full text-[10px] py-1 px-2 rounded-lg focus:outline-none disabled:opacity-50"
                              style={{ background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="pending_review">Pending Review</option>
                              <option value="completed">Done</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #d1d5db' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">New Task</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition" style={{ color: '#6b7280' }}><X className="w-4 h-4"/></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title *"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none text-gray-700 placeholder-gray-400 resize-none"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
              <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#1f2937' }}>
                <option value="">Assign to *</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="px-4 py-3 rounded-xl text-sm focus:outline-none text-gray-900"
                  style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#1f2937' }} />
              </div>
              <button onClick={createTask} disabled={submitting || !form.title || !form.assignedTo}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff' }}>
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



