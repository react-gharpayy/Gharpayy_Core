'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, Link as LinkIcon, AlertCircle, Brain, Target, AlertTriangle, Sparkles, Info, TrendingDown, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Employee {
  _id: string;
  fullName: string;
  email: string;
}

export default function ScheduleSessionModal({ isOpen, onClose, onSuccess, initialEmployeeId }: { isOpen: boolean, onClose: () => void, onSuccess: (sessionId: string) => void, initialEmployeeId?: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Intelligence state
  const [contextLoading, setContextLoading] = useState(false);
  const [employeeContext, setEmployeeContext] = useState<any>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    date: '', // Set in useEffect to avoid hydration mismatch
    time: '10:00',
    duration: 30,
    meetingType: 'in-person',
    meetingLink: '',
    isRecurring: false,
    recurringFrequency: 'weekly',
  });

  // Initialize date safely on client
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: today }));
    }
  }, [isOpen]);

  useEffect(() => {
    const controller = new AbortController();
    if (isOpen) {
      setLoading(true);
      fetch('/api/employees?page=1&limit=100', { signal: controller.signal })
        .then(r => r.json())
        .then(d => {
          if (d.users) {
            setEmployees(d.users.filter((u: any) => u.role === 'employee' || u.role === 'manager' || u.role === 'lead'));
          }
        })
        .catch(err => { if (err.name !== 'AbortError') console.error(err); })
        .finally(() => setLoading(false));

      if (initialEmployeeId) {
        setFormData(prev => ({ ...prev, employeeId: initialEmployeeId }));
      }
    } else {
      setEmployeeContext(null);
      setFormData({
        employeeId: '',
        date: '',
        time: '10:00',
        duration: 30,
        meetingType: 'in-person',
        meetingLink: '',
        isRecurring: false,
        recurringFrequency: 'weekly',
      });
      setError('');
    }
    return () => controller.abort();
  }, [isOpen, initialEmployeeId]);

  useEffect(() => {
    const controller = new AbortController();
    if (formData.employeeId && isOpen) {
      setContextLoading(true);
      fetch(`/api/coaching/employee-context?employeeId=${formData.employeeId}`, { signal: controller.signal })
        .then(r => r.json())
        .then(d => {
          if (d.ok && d.data) setEmployeeContext(d.data);
          else setEmployeeContext(null);
        })
        .catch(err => { 
          if (err.name !== 'AbortError') {
            console.error(err);
            setEmployeeContext(null);
          }
        })
        .finally(() => setContextLoading(false));
    } else {
      setEmployeeContext(null);
    }
    return () => controller.abort();
  }, [formData.employeeId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) { setError('Please select an employee'); return; }
    
    const scheduledAt = new Date(`${formData.date}T${formData.time}:00`);
    if (scheduledAt < new Date()) {
      setError('Cannot schedule a session in the past.');
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          scheduledAt: scheduledAt.toISOString(),
          duration: formData.duration,
          meetingType: formData.meetingType,
          meetingLink: formData.meetingLink,
          isRecurring: formData.isRecurring,
          recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to schedule session');
      
      onSuccess(data.sessionId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`bg-white rounded-[2rem] w-full ${formData.employeeId ? 'max-w-5xl' : 'max-w-lg'} shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] transition-all duration-500`}>
        
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
              <Brain className="w-5 h-5" />
            </div>
            Smart 1:1 Session
          </h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form Side */}
          <div className="flex-1 p-8 overflow-y-auto flex flex-col bg-white">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-wider rounded-2xl flex items-center gap-3 border border-red-100 animate-in shake duration-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form id="schedule-form" onSubmit={handleSubmit} className="space-y-6 flex-1">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Member</label>
                <select
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-gray-900 appearance-none shadow-sm"
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                  disabled={loading}
                >
                  <option value="">{loading ? 'Connecting to system...' : 'Select team member...'}</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.fullName} • {e.email}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Schedule Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-gray-900 shadow-sm"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Start Time</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-gray-900 shadow-sm"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duration</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all text-gray-900 shadow-sm"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all text-gray-900 shadow-sm"
                    value={formData.meetingType}
                    onChange={e => setFormData({ ...formData, meetingType: e.target.value })}
                  >
                    <option value="in-person">In-Person (Desk Sync)</option>
                    <option value="remote">Remote (Video Call)</option>
                  </select>
                </div>
              </div>

              {formData.meetingType === 'remote' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Meeting Link (GMeet / Zoom)</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      required={formData.meetingType === 'remote'}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-gray-900 shadow-sm"
                      value={formData.meetingLink}
                      onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100 space-y-4">
                 <label className="flex items-center gap-3 cursor-pointer group">
                   <input 
                     type="checkbox" 
                     className="w-5 h-5 text-orange-500 rounded-lg border-gray-300 focus:ring-orange-500/20 transition-all" 
                     checked={formData.isRecurring}
                     onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                   />
                   <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Set as Recurring Performance Check</span>
                 </label>
                 
                 {formData.isRecurring && (
                    <div className="pl-8 animate-in slide-in-from-top-2 duration-300">
                      <select
                        className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all shadow-sm"
                        value={formData.recurringFrequency}
                        onChange={e => setFormData({ ...formData, recurringFrequency: e.target.value })}
                      >
                        <option value="weekly">Weekly Sync</option>
                        <option value="biweekly">Bi-weekly Check</option>
                        <option value="monthly">Monthly Review</option>
                      </select>
                    </div>
                 )}
              </div>
            </form>
          </div>

          {/* Intelligence Sidebar */}
          {formData.employeeId && (
            <div className="w-96 bg-slate-50 border-l border-gray-100 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-500">
              <div className="p-6 border-b border-gray-200/50 bg-white">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  Live Employee Pulse
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {contextLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 bg-gray-200 rounded-[1.25rem]"></div>
                      <div className="h-20 bg-gray-200 rounded-[1.25rem]"></div>
                    </div>
                    <div className="h-40 bg-gray-200 rounded-[1.25rem]"></div>
                  </div>
                ) : employeeContext?.analytics ? (
                  <>
                    {/* Operational Summary */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Risk Score</div>
                        <div className={`text-2xl font-black ${employeeContext.analytics.riskScore >= 60 ? 'text-red-600' : 'text-gray-900'}`}>
                          {employeeContext.analytics.riskScore}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase ${employeeContext.analytics.classification === 'Needs Attention' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {employeeContext.analytics.classification}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Lates', val: employeeContext.analytics.lateLogins, color: 'text-red-600' },
                        { label: 'Overdue', val: employeeContext.analytics.overdueTasks, color: 'text-orange-600' },
                        { label: 'EOD Rate', val: `${employeeContext.analytics.eodConsistency}%`, color: 'text-blue-600' },
                        { label: 'Task Rate', val: `${employeeContext.analytics.taskCompletionRate}%`, color: 'text-emerald-600' }
                      ].map((s, i) => (
                        <div key={i} className="p-4 bg-white rounded-[1.25rem] border border-gray-100 shadow-sm text-center">
                          <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                          <div className="text-[9px] uppercase text-gray-400 font-bold tracking-widest mt-1">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="p-5 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Brain className="w-3.5 h-3.5 text-orange-400" /> Suggested Focus
                      </h4>
                      {employeeContext.analytics.riskScore >= 25 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-tighter">
                            <AlertTriangle className="w-4 h-4" /> Priority Intervention
                          </div>
                          <ul className="space-y-2">
                            {employeeContext.analytics.riskBreakdown.map((point: string, pi: number) => (
                              <li key={pi} className="flex gap-2 text-[11px] text-gray-600 leading-relaxed">
                                <TrendingDown className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-tighter">
                            <CheckCircle2 className="w-4 h-4" /> Growth Sync
                          </div>
                          <p className="text-[11px] text-gray-600 leading-relaxed">
                            Operationally stable. Focus on milestone achievements and discussing future development paths.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Previous History</h4>
                      {employeeContext.previousSessions?.length > 0 ? (
                        <div className="space-y-3">
                          {employeeContext.previousSessions.map((s: any) => (
                            <div key={s._id} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <div className="text-[9px] font-bold text-gray-400 uppercase">{new Date(s.scheduledAt).toLocaleDateString()}</div>
                                <div className={`text-[8px] font-black px-1 rounded uppercase ${s.healthStatus === 'doing-well' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{s.healthStatus}</div>
                              </div>
                              <div className="text-[11px] font-bold text-gray-800 line-clamp-1">{s.aiSummary}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-400 font-bold bg-gray-200/30 p-4 rounded-xl border border-dashed border-gray-200 text-center uppercase tracking-widest leading-relaxed">
                          First Intelligent 1:1 Session
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-3xl mx-2">
                    <Info className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Awaiting Pulse Scan</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-gray-100 bg-slate-50 shrink-0 flex justify-end gap-4 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="schedule-form"
            disabled={submitting || loading || contextLoading}
            className="px-8 py-3 bg-gray-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-[1.25rem] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {submitting ? 'Scheduling...' : 'Confirm & Notify Member'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
