'use client';
import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Link as LinkIcon, Video, AlertTriangle, CheckSquare, Plus, Save, Activity, Trash2, Edit2, PlayCircle, Lightbulb, History, Users, ArrowRight, TrendingDown, Target, CheckCircle2, Sparkles, FileDown, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';

interface SessionDetailModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isEmployeeView?: boolean;
}

const HEALTH_CONFIG = [
  { id: 'doing-well', label: 'Doing Well', color: '#10b981', bg: 'rgba(16,185,129,0.1)', desc: 'Marks employee as operationally stable and reduces intervention urgency.' },
  { id: 'needs-attention', label: 'Needs Attention', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'Adds moderate risk weighting (+30) and increases follow-up priority.' },
  { id: 'immediate-support', label: 'Immediate Support', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', desc: 'Adds critical risk weighting (+60) and escalates priority in the intelligence engine.' },
];

export default function SessionDetailModal({ sessionId, isOpen, onClose, onUpdate, isEmployeeView = false }: SessionDetailModalProps) {
  const [session, setSession] = useState<any>(null);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit states
  const [sharedNotes, setSharedNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [newActionItem, setNewActionItem] = useState('');
  
  // Tabs
  const [activeTab, setActiveTab] = useState('notes');
  const [generating, setGenerating] = useState(false);

  const generateAiSummary = async () => {
    if (!context?.analytics) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/coaching/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: session.employeeName,
          stats: context.analytics,
          notes: sharedNotes,
          actionItems: session.actionItems || []
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiSummary(data.summary);
        await handleSave({ aiSummary: data.summary });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadSummaryPdf = () => {
    if (!aiSummary || !session) return;

    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('OPERATIONAL REVIEW REPORT', margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin, y);
    y += 10;
    doc.setDrawColor(230);
    doc.line(margin, y, 190, y);
    y += 15;

    // Session Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('1. SESSION INFORMATION', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Employee: ${session.employeeName}`, margin, y);
    doc.text(`Reviewer: ${session.conductedByName}`, 110, y);
    y += 7;
    doc.text(`Date: ${new Date(session.scheduledAt).toLocaleDateString()}`, margin, y);
    doc.text(`Type: ${session.meetingType.toUpperCase()}`, 110, y);
    y += 15;

    // Operational Pulse (Metrics)
    if (context?.analytics) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. PERFORMANCE PULSE', margin, y);
      y += 10;

      const a = context.analytics;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`• Attendance: ${a.onTimeCount}/${a.onTimeCount + a.lateLogins} On-Time`, margin, y);
      doc.text(`• Task Velocity: ${a.taskCompletionRate}%`, 110, y);
      y += 7;
      doc.text(`• Late Logins: ${a.lateLogins} Days`, margin, y);
      doc.text(`• EOD Consistency: ${a.eodConsistency}%`, 110, y);
      y += 15;
    }

    // AI Summary Sections
    const sections = aiSummary.split('\n\n');
    sections.forEach((section: string) => {
      const lines = section.split('\n');
      const title = lines[0];
      const content = lines.slice(1).join('\n');

      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitContent = doc.splitTextToSize(content, 170);
      doc.text(splitContent, margin, y);
      y += (splitContent.length * 5) + 10;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gharpayy Internal Intelligence Platform - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`Operational_Review_${session.employeeName.replace(' ', '_')}.pdf`);
  };

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`/api/coaching/${sessionId}`);
      const data = await res.json();
      if (data.ok) {
        setSession(data.session);
        // Only set these on initial load to avoid overwriting user's active typing
        if (isInitial) {
          setSharedNotes(data.session.sharedNotes || '');
          setPrivateNotes(data.session.privateNotes || '');
          setHealthStatus(data.session.healthStatus || 'doing-well');
          setAiSummary(data.session.aiSummary || '');
        }
        
        if (!isEmployeeView && data.session.employeeId) {
          const ctxRes = await fetch(`/api/coaching/employee-context?employeeId=${data.session.employeeId}`);
          const ctxData = await ctxRes.json();
          if (ctxData.ok) setContext(ctxData.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchData(true);
    }
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleSave = async (updates: any = {}) => {
    setSaving(true);
    try {
      const payload = isEmployeeView ? updates : {
        sharedNotes,
        privateNotes,
        healthStatus,
        aiSummary,
        ...updates
      };
      
      await fetch(`/api/coaching/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await fetchData();
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddActionItem = async () => {
    if (!newActionItem.trim()) return;
    const currentItems = session.actionItems || [];
    const newItems = [...currentItems, { title: newActionItem, status: 'pending' }];
    await handleSave({ actionItems: newItems });
    setNewActionItem('');
  };

  const updateActionItemStatus = async (id: string, status: string) => {
    await handleSave({
      actionItemUpdate: { actionItemId: id, status }
    });
  };

  const removeActionItem = async (index: number) => {
    if (isEmployeeView) return;
    const newItems = [...(session.actionItems || [])];
    newItems.splice(index, 1);
    await handleSave({ actionItems: newItems });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-xl flex items-center justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const dateStr = new Date(session.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white font-black text-xl shadow-lg">
               {session.employeeName.split(' ').map((n:any)=>n[0]).join('').substring(0,2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">
                {isEmployeeView ? `1:1 with ${session.conductedByName}` : `1:1: ${session.employeeName}`}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-orange-500" /> {dateStr}</span>
                <span className="flex items-center gap-1.5">
                   {session.meetingType === 'in-person' ? <Users className="w-4 h-4 text-blue-500" /> : <Video className="w-4 h-4 text-blue-500" />} 
                   {session.meetingType.replace('-', ' ')}
                </span>
                {session.meetingLink && (
                  <a href={session.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 transition-colors">
                    <LinkIcon className="w-4 h-4" /> Join Remote Session
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             {!isEmployeeView && (
               <div className="flex flex-col items-end gap-2">
                 <div className="hidden sm:flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl border border-gray-100">
                   {HEALTH_CONFIG.map(h => (
                     <button 
                       key={h.id}
                       onClick={() => { setHealthStatus(h.id); handleSave({ healthStatus: h.id }); }}
                       className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${healthStatus === h.id ? 'shadow-md bg-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                       style={{ color: healthStatus === h.id ? h.color : undefined }}
                     >
                       {h.label}
                     </button>
                   ))}
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100/50">
                    <ShieldCheck className="w-3 h-3 text-orange-500" />
                    <span className="text-[9px] font-bold text-gray-500">
                      {HEALTH_CONFIG.find(h => h.id === healthStatus)?.desc}
                    </span>
                 </div>
               </div>
             )}
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body Layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white">
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
             
             {/* Tabs */}
             <div className="flex px-8 pt-6 border-b border-gray-100 gap-8 shrink-0 bg-white">
                {[
                  { id: 'notes', label: 'Discussion & Notes', icon: Edit2 },
                  { id: 'actions', label: `Action Items (${session.actionItems?.length || 0})`, icon: CheckSquare },
                  ...(!isEmployeeView ? [{ id: 'ai', label: 'AI Summary', icon: Activity }] : [])
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`pb-4 text-[11px] font-black uppercase tracking-[0.15em] flex items-center gap-2 border-b-2 transition-all ${activeTab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                ))}
             </div>

             {/* Tab Content */}
             <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                
                {activeTab === 'notes' && (
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <Users className="w-4 h-4 text-orange-500" />
                           Shared Discussion Notes
                        </label>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Synced Live</span>
                      </div>
                      <textarea 
                        className="w-full h-48 p-6 bg-gray-50 border border-gray-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-sm font-medium leading-relaxed resize-none shadow-inner"
                        placeholder="Notes discussed during the session..."
                        value={sharedNotes}
                        onChange={(e) => setSharedNotes(e.target.value)}
                        onBlur={() => handleSave()}
                      />
                    </div>

                    {!isEmployeeView && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Private Performance Observations
                          </label>
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-1 rounded-lg">Manager Only</span>
                        </div>
                        <textarea 
                          className="w-full h-32 p-6 bg-red-50/20 border border-red-100/50 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500 transition-all text-sm font-medium leading-relaxed resize-none shadow-inner"
                          placeholder="Private observations, performance concerns, or escalation notes..."
                          value={privateNotes}
                          onChange={(e) => setPrivateNotes(e.target.value)}
                          onBlur={() => handleSave()}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="space-y-6 max-w-3xl">
                     {!isEmployeeView && (
                       <div className="flex gap-3">
                         <input 
                           type="text"
                           className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all shadow-inner"
                           placeholder="New follow-up action..."
                           value={newActionItem}
                           onChange={e => setNewActionItem(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleAddActionItem()}
                         />
                         <button onClick={handleAddActionItem} className="px-8 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                           Add Item
                         </button>
                       </div>
                     )}

                     <div className="space-y-3 mt-6">
                       {session.actionItems?.length === 0 ? (
                         <div className="text-center py-16 text-gray-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 rounded-[2rem]">
                           No action items registered.
                         </div>
                       ) : (
                         session.actionItems?.map((item: any, i: number) => (
                           <div key={item._id || i} className={`p-5 rounded-2xl border flex items-center gap-4 transition-all ${item.status === 'completed' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}>
                             <button 
                               onClick={() => updateActionItemStatus(item._id, item.status === 'completed' ? 'pending' : 'completed')}
                               className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${item.status === 'completed' ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200 hover:border-orange-500'}`}
                             >
                               {item.status === 'completed' && <CheckSquare className="w-3.5 h-3.5" />}
                             </button>
                             <div className="flex-1">
                               <div className={`text-sm font-bold ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                 {item.title}
                               </div>
                               {item.dueDate && <div className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">Due: {item.dueDate}</div>}
                             </div>
                             {!isEmployeeView && (
                               <button onClick={() => removeActionItem(i)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                           </div>
                         ))
                       )}
                     </div>
                  </div>
                )}

                {activeTab === 'ai' && !isEmployeeView && (
                   <div className="space-y-6">
                      <div className="p-8 bg-indigo-50/30 border border-indigo-100 rounded-[2.5rem]">
                         <div className="flex items-center justify-between mb-6">
                           <div>
                            <div className="flex items-center gap-3 text-indigo-700 font-black text-xs uppercase tracking-widest">
                              <Activity className="w-5 h-5" /> AI Insight Summary
                            </div>
                            <p className="text-[11px] font-bold text-indigo-400 mt-2 uppercase tracking-tight">Intelligence-driven wrap-up based on performance signals.</p>
                           </div>
                           <div className="flex items-center gap-3">
                             {aiSummary && (
                               <button 
                                 onClick={downloadSummaryPdf}
                                 className="px-6 py-3 rounded-2xl bg-white border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm"
                               >
                                 <FileDown className="w-4 h-4" /> Download PDF Report
                               </button>
                             )}
                             <button 
                               onClick={generateAiSummary}
                               disabled={generating || !context?.analytics}
                               className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${generating ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95'}`}
                             >
                               {generating ? (
                                 <> <div className="w-3 h-3 border-2 border-indigo-400 border-t-white rounded-full animate-spin" /> Synthesizing Data... </>
                               ) : (
                                 <> <Sparkles className="w-3.5 h-3.5" /> {aiSummary ? 'Regenerate Summary' : 'Generate Intelligent Summary'} </>
                               )}
                             </button>
                           </div>
                         </div>
                         
                         <textarea 
                          className="w-full h-72 p-8 bg-white border border-indigo-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium leading-relaxed resize-none shadow-sm"
                          placeholder="Summarized insights will appear here once generated..."
                          value={aiSummary}
                          onChange={(e) => setAiSummary(e.target.value)}
                          onBlur={() => handleSave()}
                        />
                      </div>
                   </div>
                )}

             </div>
          </div>

          {/* Right Context Panel (Admins Only) */}
          {!isEmployeeView && (
            <div className="w-full md:w-96 bg-slate-50 overflow-y-auto shrink-0 border-l border-gray-100 p-8 custom-scrollbar">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <Lightbulb className="w-4 h-4 text-orange-500" /> Operational Context
               </h3>
               
               {context?.analytics ? (
                 <div className="space-y-8">
                   
                   {/* Suggested Discussion Topics */}
                   <div className="bg-white p-6 rounded-3xl border border-gray-200/60 shadow-sm">
                     <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Target className="w-3.5 h-3.5 text-orange-500" /> Suggested Agenda
                     </div>
                     <ul className="space-y-3">
                       {context.analytics.riskScore >= 25 ? (
                         context.analytics.riskBreakdown.map((p: string, i: number) => (
                           <li key={i} className="text-[11px] text-gray-600 font-medium flex items-start gap-2.5 leading-relaxed">
                             <TrendingDown className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                             {p}
                           </li>
                         ))
                       ) : (
                         <li className="text-[11px] text-gray-600 font-medium flex items-start gap-2.5 leading-relaxed">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            Operational performance is stable. Discuss growth and recognition.
                         </li>
                       )}
                     </ul>
                   </div>

                   {/* Stats Matrix */}
                   <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Attendance', val: `${context.analytics.onTimeCount}/${context.analytics.onTimeCount + context.analytics.lateLogins + context.analytics.absentCount}`, sub: 'On Time', color: 'text-emerald-600' },
                        { label: 'Task Rate', val: `${context.analytics.taskCompletionRate}%`, sub: 'Completed', color: 'text-indigo-600' },
                        { label: 'Late Logins', val: context.analytics.lateLogins, sub: 'Days', color: 'text-red-500' },
                        { label: 'Daily Updates', val: `${context.analytics.eodConsistency}%`, sub: 'Submitted', color: 'text-orange-500' }
                      ].map((s, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 text-center shadow-sm">
                          <div className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-1.5">{s.label}</div>
                          <div className={`text-lg font-black leading-none ${s.color}`}>{s.val}</div>
                          <div className="text-[8px] font-black uppercase text-gray-300 mt-1">{s.sub}</div>
                        </div>
                      ))}
                   </div>

                   {/* History Timeline */}
                   {context.previousSessions?.length > 0 && (
                     <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                         <History className="w-3.5 h-3.5" /> Recent Sync History
                       </h4>
                       <div className="space-y-3">
                         {context.previousSessions.map((s: any) => (
                           <div key={s._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group cursor-pointer hover:border-orange-500/30 transition-all">
                             <div className="flex justify-between items-center mb-1.5">
                               <span className="text-[10px] font-black text-gray-900">{new Date(s.scheduledAt).toLocaleDateString()}</span>
                               <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${s.healthStatus === 'doing-well' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                 {s.healthStatus.replace('-', ' ')}
                               </span>
                             </div>
                             <div className="text-[10px] text-gray-500 font-medium line-clamp-1 group-hover:text-gray-900">{s.aiSummary}</div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                   <Activity className="w-10 h-10 text-gray-300 animate-pulse mb-3" />
                   <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aggregating Pulse Data...</div>
                 </div>
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
