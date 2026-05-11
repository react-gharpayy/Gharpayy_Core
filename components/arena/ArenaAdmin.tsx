'use client';
import { useState, useEffect } from 'react';
import { 
  Users, Target, Zap, Plus, Edit2, Trash2, 
  ChevronRight, Activity, Search, ShieldCheck, BarChart3, Settings2, Palette, Shield, GitBranch
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function ArenaAdmin() {
  const router = useRouter();
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [teamGroups, setTeamGroups] = useState<{ teamName: string; members: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [playbookRoles, setPlaybookRoles] = useState<any[]>([]);
  const [newRole, setNewRole] = useState({ name: '', slug: '', color: '#f97316', isActive: true });
  // teamFilter replaces roleFilter — monitoring now groups by team, not playbook role
  const [teamFilter, setTeamFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRole, setEditingRole] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d));
    const savedFilter = localStorage.getItem('arena_team_filter');
    const savedSearch = localStorage.getItem('arena_search_term');
    if (savedFilter) setTeamFilter(savedFilter);
    if (savedSearch) setSearchTerm(savedSearch);
  }, []);

  useEffect(() => {
    localStorage.setItem('arena_team_filter', teamFilter);
  }, [teamFilter]);

  useEffect(() => {
    localStorage.setItem('arena_search_term', searchTerm);
  }, [searchTerm]);



  const [newKpi, setNewKpi] = useState<{
    role: string;
    kpiName: string;
    label: string;
    target: number | boolean;
    type: string;
  }>({
    role: 'recruiter',
    kpiName: '',
    label: '',
    target: 0,
    type: 'NUMBER'
  });

  const [newSprint, setNewSprint] = useState({
    role: 'recruiter',
    sprintName: '',
    startTime: '10:00',
    endTime: '11:00'
  });

  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingSprint, setEditingSprint] = useState<any>(null);

  const fetchDefs = async () => {
    const res = await fetch('/api/arena/definitions').then(r => r.json());
    if (res.ok) {
      setDefinitions(res.kpis);
      setSprints(res.sprints);
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees/approvals?status=approved').then(r => r.json());
    if (res.ok) setEmployees(res.employees);
  };

  // Fetch employees grouped by team (operational grouping)
  const fetchTeamGroups = async () => {
    const res = await fetch('/api/arena/team-view').then(r => r.json());
    if (res.ok) setTeamGroups(res.groups || []);
  };

  const fetchRoles = async () => {
    const res = await fetch('/api/arena/roles').then(r => r.json());
    if (res.ok) setPlaybookRoles(res.roles);
  };

  useEffect(() => {
    Promise.all([fetchDefs(), fetchEmployees(), fetchTeamGroups(), fetchRoles()]).finally(() => setLoading(false));
  }, []);

  const handleSaveRole = async () => {
    if (!newRole.name) return alert("Name required");
    const res = await fetch('/api/arena/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRole ? { ...newRole, _id: editingRole._id } : newRole)
    }).then(r => r.json());
    if (res.ok) {
      fetchRoles();
      setNewRole({ name: '', slug: '', color: '#f97316', isActive: true });
      setEditingRole(null);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Are you sure? This may orphan employees using this role.")) return;
    await fetch(`/api/arena/roles?id=${id}`, { method: 'DELETE' });
    fetchRoles();
  };

  const handleAssignRole = async (employeeId: string, playbookRole: string) => {
    const res = await fetch('/api/employees/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, playbookRole })
    }).then(r => r.json());
    if (res.ok) {
      fetchEmployees();
      fetchTeamGroups();
    }
  };

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    const res = await fetch('/api/employees/approvals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, isApproved: !currentStatus })
    }).then(r => r.json());
    if (res.ok) {
      fetchEmployees();
      fetchTeamGroups();
    }
  };

  const handleSaveKpi = async () => {
    if (!newKpi.label) return alert("KPI Label required");
    const res = await fetch('/api/arena/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'kpi', data: newKpi })
    }).then(r => r.json());
    if (res.ok) {
      fetchDefs();
      setNewKpi({ role: 'recruiter', kpiName: '', label: '', target: 0, type: 'NUMBER' });
      setEditingItem(null);
    }
  };

  const handleSaveSprint = async () => {
    if (!newSprint.sprintName) return alert("Fill all fields");
    const res = await fetch('/api/arena/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'sprint', data: newSprint })
    }).then(r => r.json());
    if (res.ok) {
      fetchDefs();
      setNewSprint({ role: 'recruiter', sprintName: '', startTime: '10:00', endTime: '11:00' });
      setEditingSprint(null);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm("Are you absolutely sure? This action cannot be undone.")) return;
    await fetch(`/api/arena/definitions?id=${id}&type=${type}`, { method: 'DELETE' });
    fetchDefs();
  };

  const cardStyle = { 
    background: '#ffffff', 
    border: '1px solid #e5e7eb', 
    borderRadius: '24px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">ARENA OS - Management</h1>
          <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">
            Execution Intelligence & Playbook Control
          </p>
        </div>
        <Badge variant="outline" className="border-orange-500 text-orange-500 font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px]">
          Operational Core
        </Badge>
      </div>

      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="bg-gray-100 p-1.5 rounded-2xl h-14 w-full md:w-auto">
          <TabsTrigger value="monitoring" className="rounded-xl px-6 font-bold text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4 mr-2" /> PERFORMANCE MONITORING
          </TabsTrigger>
          {user?.role === 'admin' && (
            <>
              <TabsTrigger value="workforce" className="rounded-xl px-6 font-bold text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="h-4 w-4 mr-2" /> WORKFORCE
              </TabsTrigger>
              <TabsTrigger value="kpis" className="rounded-xl px-6 font-bold text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Target className="h-4 w-4 mr-2" /> KPI DEFINITIONS
              </TabsTrigger>
              <TabsTrigger value="sprints" className="rounded-xl px-6 font-bold text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Zap className="h-4 w-4 mr-2" /> SPRINT PLANS
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-xl px-6 font-bold text-xs h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Shield className="h-4 w-4 mr-2" /> KPI FUNCTION GROUPS
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="monitoring" className="mt-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
               {/* Team filter tabs — operational grouping by teamName, NOT hierarchy role */}
               <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setTeamFilter('all')}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      teamFilter === 'all' 
                      ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/10' 
                      : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    All Teams ({employees.length})
                  </button>
                  {teamGroups.map(group => (
                    <button 
                      key={group.teamName}
                      onClick={() => setTeamFilter(group.teamName)}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                        teamFilter === group.teamName 
                        ? 'bg-white shadow-lg border-indigo-400 text-indigo-600' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {group.teamName} ({group.members.length})
                    </button>
                  ))}
               </div>

               <div className="relative w-full md:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Quick search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm"
                  />
               </div>
            </div>

           {/* Employee cards grouped by team */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(teamFilter === 'all'
                ? teamGroups.flatMap(g => g.members)
                : (teamGroups.find(g => g.teamName === teamFilter)?.members ?? [])
              )
                .filter(emp => !searchTerm || emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(emp => {
                  // playbookRole is the KPI function — shown as a secondary badge, NOT the primary label
                  const kpiRole = playbookRoles.find(r => r.slug === emp.playbookRole);
                  return (
                    <div key={emp._id} style={cardStyle} className="p-6 hover:border-orange-500/30 transition-all group relative overflow-hidden">
                       {/* Team color bar at top */}
                       <div className="absolute top-0 left-0 h-1 w-full bg-indigo-500" />
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex gap-4 items-center">
                             <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                <Users className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
                             </div>
                             <div>
                                <div className="font-black text-gray-900">{emp.fullName}</div>
                                {/* PRIMARY label: Team name (operational grouping) */}
                                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-500">
                                  {emp.teamName || 'Unassigned Team'}
                                </div>
                                {/* SECONDARY badges: hierarchy role + KPI function */}
                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                  {emp.hierarchyRole && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                                      style={{ background: `${emp.hierarchyRole.color}20`, color: emp.hierarchyRole.color }}>
                                      {emp.hierarchyRole.name}
                                    </span>
                                  )}
                                  {emp.jobTitle && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                                      {emp.jobTitle}
                                    </span>
                                  )}
                                  {kpiRole && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                                      style={{ background: `${kpiRole.color}15`, color: kpiRole.color }}>
                                      KPI: {kpiRole.name}
                                    </span>
                                  )}
                                </div>
                             </div>
                          </div>
                          <Badge className="bg-green-500/10 text-green-600 border-none text-[9px] font-black">ACTIVE</Badge>
                       </div>

                       <div className="mt-4">
                          <button 
                            onClick={() => router.push(`/arena-admin/performance/${emp._id}`)}
                            className="w-full py-3 bg-gray-900 text-white rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-gray-900/10"
                          >
                             <BarChart3 className="h-4 w-4" /> VIEW DASHBOARD
                          </button>
                       </div>
                    </div>
                  );
                })}
           </div>
        </TabsContent>

        <TabsContent value="workforce" className="mt-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
               <div>
                  <h3 className="text-lg font-black text-gray-900">Workforce Management</h3>
                  <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                    Assign KPI function groups · Team assignment via Hierarchy Manager
                  </p>
               </div>
               <div className="relative w-full md:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm"
                  />
               </div>
            </div>

            <div className="space-y-4">
               {employees
                .filter(emp => !searchTerm || emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(emp => {
                  return (
                    <div key={emp._id} style={cardStyle} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-gray-300 transition-all group relative">
                       <div className="flex gap-4 items-center flex-1">
                          <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                             <Users className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
                          </div>
                          <div>
                             <div className="font-black text-gray-900 flex items-center gap-2">
                                {emp.fullName}
                                <Badge className={`text-[8px] font-black border-none ${emp.isApproved ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                  {emp.isApproved ? 'ACTIVE' : 'DEACTIVATED'}
                                </Badge>
                             </div>
                             <div className="text-[10px] font-bold text-gray-400">{emp.email}</div>
                             <div className="flex gap-3 items-center mt-1.5 flex-wrap">
                               {/* Team assignment — set via Hierarchy Manager, shown read-only here */}
                               {emp.teamName ? (
                                 <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600">
                                   Team: {emp.teamName}
                                 </span>
                               ) : (
                                 <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-400">
                                   No team assigned
                                 </span>
                               )}
                               {emp.department && (
                                 <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-tighter">
                                   {emp.department}
                                 </span>
                               )}
                               <button 
                                 onClick={() => handleToggleStatus(emp._id, emp.isApproved)}
                                 className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                                   emp.isApproved 
                                   ? 'text-red-500 border-red-100 hover:bg-red-50' 
                                   : 'text-green-500 border-green-100 hover:bg-green-50'
                                 }`}
                               >
                                 {emp.isApproved ? 'DEACTIVATE' : 'ACTIVATE'}
                               </button>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-8 w-full md:w-auto">
                          <div className="flex-1 md:w-64">
                             {/* KPI Function Group — drives which KPIs/sprints are assigned */}
                             <div className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                               KPI Function Group
                               <span className="ml-1 text-gray-300 normal-case font-normal">(not a hierarchy role)</span>
                             </div>
                             <select 
                               className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none focus:border-orange-500/30 transition-all shadow-sm group-hover:bg-white"
                               value={emp.playbookRole || ''}
                               onChange={(e) => handleAssignRole(emp._id, e.target.value)}
                             >
                               <option value="">Assign KPI Group...</option>
                               {playbookRoles.map(r => (
                                 <option key={r.slug} value={r.slug}>{r.name}</option>
                               ))}
                             </select>
                          </div>
                       </div>
                    </div>
                  );
                })}
            </div>
        </TabsContent>

        <TabsContent value="kpis" className="mt-8 space-y-8">
           <Card className="rounded-[32px] border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 p-8 border-b border-gray-100">
                 <CardTitle className="text-lg font-black flex items-center gap-3">
                    <Plus className="h-5 w-5 text-orange-500" /> {editingItem ? 'EDIT KPI' : 'DEFINE NEW KPI'}
                 </CardTitle>
                 <p className="text-[10px] font-mono text-gray-400 mt-1">KPIs are assigned by functional group (recruiter, coach, etc.) — not by hierarchy role</p>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-end">
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">KPI Function Group</label>
                       <select 
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         value={newKpi.role}
                         onChange={e => setNewKpi({...newKpi, role: e.target.value})}
                       >
                         <option value="">Select Function Group...</option>
                         {playbookRoles.map(r => <option key={r.slug} value={r.slug}>{r.name.toUpperCase()}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">UI Label</label>
                       <input 
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         placeholder="e.g. Leads Completed"
                         value={newKpi.label}
                         onChange={e => setNewKpi({...newKpi, label: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">Type</label>
                       <select 
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         value={newKpi.type}
                         onChange={e => {
                           const type = e.target.value;
                           setNewKpi({...newKpi, type, target: type === 'BOOLEAN' ? true : 0});
                         }}
                       >
                         <option value="NUMBER">NUMBER</option>
                         <option value="BOOLEAN">BOOLEAN</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">Target</label>
                       {newKpi.type === 'NUMBER' ? (
                         <input 
                           type="number"
                           className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                           value={newKpi.target as number}
                           onChange={e => setNewKpi({...newKpi, target: Number(e.target.value)})}
                         />
                       ) : (
                         <select 
                           className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                           value={String(newKpi.target)}
                           onChange={e => setNewKpi({...newKpi, target: e.target.value === 'true'})}
                         >
                           <option value="true">TRUE (Complete)</option>
                           <option value="false">FALSE (Incomplete)</option>
                         </select>
                       )}
                    </div>
                 </div>
                 <div className="mt-8 flex gap-3">
                    <button 
                      onClick={handleSaveKpi}
                      className="flex-1 h-11 bg-orange-500 text-white rounded-xl text-xs font-black tracking-widest uppercase hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10"
                    >
                       {editingItem ? 'UPDATE KPI' : 'CREATE KPI'}
                    </button>
                    {editingItem && (
                      <button 
                        onClick={() => { setEditingItem(null); setNewKpi({ role: 'recruiter', kpiName: '', label: '', target: 0, type: 'NUMBER' }); }}
                        className="px-6 h-11 bg-gray-100 text-gray-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-gray-200 transition-all"
                      >
                         CANCEL
                      </button>
                    )}
                 </div>
              </CardContent>
           </Card>

           <div className="grid grid-cols-1 gap-4">
              {definitions.map(def => (
                <div key={def._id} style={cardStyle} className="p-6 flex items-center justify-between hover:border-gray-300 transition-all">
                   <div className="flex gap-6 items-center">
                      <Badge className="bg-gray-100 text-gray-600 border-none font-mono text-[10px] uppercase font-black px-3 py-1">
                        {def.role}
                      </Badge>
                      <div>
                         <div className="font-black text-gray-900">{def.label}</div>
                         <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                           {def.type} · Target: {String(def.target)} · KPI Group: {def.role}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingItem(def); setNewKpi({ ...def }); }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
                      >
                         <Edit2 className="h-4 w-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(def._id, 'kpi')} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-red-50 transition border border-transparent hover:border-red-100">
                         <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="sprints" className="mt-8 space-y-8">
           <Card className="rounded-[32px] border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 p-8 border-b border-gray-100">
                 <CardTitle className="text-lg font-black flex items-center gap-3">
                    <Zap className="h-5 w-5 text-orange-500" /> {editingSprint ? 'EDIT SPRINT PLAN' : 'DEFINE SPRINT PLAN'}
                 </CardTitle>
                 <p className="text-[10px] font-mono text-gray-400 mt-1">Sprint plans are scoped to functional groups — not hierarchy authority roles</p>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">KPI Function Group</label>
                       <select 
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         value={newSprint.role}
                         onChange={e => setNewSprint({...newSprint, role: e.target.value})}
                       >
                         <option value="">Select Function Group...</option>
                         {playbookRoles.map(r => <option key={r.slug} value={r.slug}>{r.name.toUpperCase()}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">Sprint Title</label>
                       <input 
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         placeholder="e.g. Early Morning Blitz"
                         value={newSprint.sprintName}
                         onChange={e => setNewSprint({...newSprint, sprintName: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">Start Time</label>
                       <input 
                         type="time"
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         value={newSprint.startTime}
                         onChange={e => setNewSprint({...newSprint, startTime: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">End Time</label>
                       <input 
                         type="time"
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         value={newSprint.endTime}
                         onChange={e => setNewSprint({...newSprint, endTime: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="mt-8 flex gap-3">
                    <button 
                      onClick={handleSaveSprint}
                      className="flex-1 h-11 bg-gray-900 text-white rounded-xl text-xs font-black tracking-widest uppercase hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                    >
                       {editingSprint ? 'UPDATE SPRINT PLAN' : 'CREATE SPRINT PLAN'}
                    </button>
                    {editingSprint && (
                      <button 
                        onClick={() => { setEditingSprint(null); setNewSprint({ role: 'recruiter', sprintName: '', startTime: '10:00', endTime: '11:00' }); }}
                        className="px-6 h-11 bg-gray-100 text-gray-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-gray-200 transition-all"
                      >
                         CANCEL
                      </button>
                    )}
                 </div>
              </CardContent>
           </Card>

           <div className="grid grid-cols-1 gap-4">
              {sprints.map((sprint, idx) => (
                <div key={sprint._id} style={cardStyle} className="p-6 flex items-center justify-between hover:border-gray-300 transition-all">
                   <div className="flex gap-6 items-center">
                      <Badge className="bg-gray-100 text-gray-600 border-none font-mono text-[10px] uppercase font-black px-3 py-1">{sprint.role}</Badge>
                      <div>
                         <div className="font-black text-gray-900">{sprint.sprintName}</div>
                         <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                           {sprint.startTime} – {sprint.endTime}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingSprint(sprint); setNewSprint({ ...sprint }); }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
                      >
                         <Edit2 className="h-4 w-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(sprint._id, 'sprint')} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-red-50 transition border border-transparent hover:border-red-100">
                         <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </TabsContent>
        <TabsContent value="roles" className="mt-8 space-y-8">
           <Card className="rounded-[32px] border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50/50 p-8 border-b border-gray-100">
                 <CardTitle className="text-lg font-black flex items-center gap-3">
                    <Shield className="h-5 w-5 text-orange-500" /> {editingRole ? 'EDIT KPI FUNCTION GROUP' : 'DEFINE KPI FUNCTION GROUP'}
                 </CardTitle>
                 <p className="text-[10px] font-mono text-gray-400 mt-1">
                   These are operational function groups (Recruiter, Coach, etc.) that drive KPI/sprint assignment.
                   They are NOT hierarchy authority roles. Hierarchy roles (Manager, Team Lead) are managed separately in Team Hierarchy.
                 </p>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">Function Group Name</label>
                       <input 
                         className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold outline-none"
                         placeholder="e.g. Sales Expert, Field Agent"
                         value={newRole.name}
                         onChange={e => setNewRole({...newRole, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono font-bold uppercase text-gray-400 ml-1">Badge Color</label>
                       <div className="flex gap-2">
                         <input 
                           type="color"
                           className="h-11 w-11 p-1 bg-gray-50 border border-gray-100 rounded-xl outline-none cursor-pointer"
                           value={newRole.color}
                           onChange={e => setNewRole({...newRole, color: e.target.value})}
                         />
                         <input 
                           className="flex-1 h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-mono font-bold outline-none"
                           value={newRole.color}
                           onChange={e => setNewRole({...newRole, color: e.target.value})}
                         />
                       </div>
                    </div>
                  </div>
                 <div className="mt-8 flex gap-3">
                    <button 
                      onClick={handleSaveRole}
                      className="flex-1 h-11 bg-gray-900 text-white rounded-xl text-xs font-black tracking-widest uppercase hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                    >
                       {editingRole ? 'UPDATE ROLE' : 'CREATE ROLE'}
                    </button>
                    {editingRole && (
                      <button 
                        onClick={() => { setEditingRole(null); setNewRole({ name: '', slug: '', color: '#f97316', isActive: true }); }}
                        className="px-6 h-11 bg-gray-100 text-gray-400 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-gray-200 transition-all"
                      >
                         CANCEL
                      </button>
                    )}
                 </div>
              </CardContent>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {playbookRoles.map(role => (
                <div key={role._id} style={cardStyle} className="p-6 flex items-center justify-between hover:border-gray-300 transition-all group">
                   <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center border border-gray-100" style={{ backgroundColor: `${role.color}15` }}>
                         <Shield className="h-5 w-5" style={{ color: role.color }} />
                      </div>
                      <div>
                         <div className="font-black text-gray-900 flex items-center gap-2">
                            {role.name}
                            {!role.isActive && <Badge variant="secondary" className="text-[8px]">INACTIVE</Badge>}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditingRole(role); setNewRole({ ...role }); }}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
                      >
                         <Edit2 className="h-4 w-4 text-gray-400" />
                      </button>
                      <button onClick={() => handleDeleteRole(role._id)} className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-red-50 transition border border-transparent hover:border-red-100">
                         <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
