import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import DatePicker from '../components/ui/date-picker';
import { Plus, Users, Calendar, Layers } from 'lucide-react';
import api from '../lib/api';

const DevelopmentPaths = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [activePath, setActivePath] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [preloadingAssignments, setPreloadingAssignments] = useState(false);

  const { data: pathsData } = useQuery({
    queryKey: ['development-paths'],
    queryFn: async () => (await api.get('/development-paths')).data,
  });

  const paths = useMemo(() => pathsData?.paths || [], [pathsData]);

  const { data: employeesData } = useQuery({
    queryKey: ['dp-employees'],
    queryFn: async () => (await api.get('/employees?page=1&limit=10000')).data.employees || [],
  });

  const { data: groupsData } = useQuery({
    queryKey: ['dp-groups'],
    queryFn: async () => (await api.get('/groups?page=1&limit=1000')).data.groups || [],
  });

  const filteredEmployees = useMemo(() => {
    const list = employeesData || [];
    if (!assignSearch.trim()) return list;
    const q = assignSearch.toLowerCase();
    return list.filter(e =>
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.sid?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q)
    );
  }, [employeesData, assignSearch]);

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/development-paths', payload),
    onSuccess: () => {
      qc.invalidateQueries(['development-paths']);
      setForm({ name: '', description: '', start_date: '', end_date: '' });
      setShowCreate(false);
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, employeeIds, groupId }) => api.put(`/development-paths/${id}/assign`, {
      employee_ids: Array.from(employeeIds),
      group_id: groupId || null
    }),
    onSuccess: () => {
      setShowAssign(false);
      setSelectedEmployees(new Set());
      setSelectedGroupId('');
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate(form);
  };

  const openAssign = async (path) => {
    setActivePath(path);
    setShowAssign(true);
    setPreloadingAssignments(true);
    try {
      const res = await api.get(`/development-paths/${path.id}/assignments`);
      const emps = res.data?.employees || [];
      setSelectedEmployees(new Set(emps.map(e => e.id)));
      const groups = res.data?.groups || [];
      setSelectedGroupId(groups[0]?.id || '');
    } catch (e) {
      // ignore
    } finally {
      setPreloadingAssignments(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Development Paths</h1>
          <p className="text-gray-600">Create paths and assign to groups or employees</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="loyverse-button">
          <Plus className="h-4 w-4 mr-2" />
          Create Path
        </Button>
      </div>

      {/* Paths grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paths.map((p) => (
          <Card key={p.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-green-600" /> {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{p.description || '—'}</p>
              <div className="flex items-center text-sm text-gray-500 gap-2 mb-3">
                <Calendar className="h-4 w-4" />
                <span>{p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'} → {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Assignments</span>
                <span className="font-medium text-gray-900">Emp: {p.employee_assignments} • Grp: {p.group_assignments}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => navigate(`/development-paths/${p.id}`)}>Details</Button>
                <Button variant="outline" onClick={() => openAssign(p)}><Users className="h-4 w-4 mr-2" />Assign</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Development Path</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Start Date</Label>
                  <DatePicker 
                    value={form.start_date} 
                    onChange={(date) => setForm({ ...form, start_date: date })}
                    placeholder="Select start date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end">End Date</Label>
                  <DatePicker 
                    value={form.end_date} 
                    onChange={(date) => setForm({ ...form, end_date: date })}
                    placeholder="Select end date"
                    className="mt-1"
                    minDate={form.start_date ? new Date(form.start_date) : null}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setShowCreate(false)} className="loyverse-button-secondary">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="loyverse-button">{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssign && activePath && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Assign: {activePath.name}</h3>
              <Button onClick={() => setShowAssign(false)} variant="outline">Close</Button>
            </div>
            {preloadingAssignments && (
              <div className="text-xs text-gray-500 mb-3">Loading current assignments…</div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Label>Search Employees</Label>
                <Input placeholder="Search by name, SID, email..." value={assignSearch} onChange={e => setAssignSearch(e.target.value)} className="mt-1 mb-3" />
                <div className="border rounded-md divide-y max-h-[55vh] overflow-y-auto">
                  {filteredEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{emp.first_name} {emp.last_name} {emp.sid ? `(SID: ${emp.sid})` : ''}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.email} • {emp.job_title || 'N/A'} • {emp.location || 'N/A'}</p>
                      </div>
                      <input type="checkbox" className="h-4 w-4" checked={selectedEmployees.has(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <Label>Assign to Group (optional)</Label>
                  <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                    <option value="">— None —</option>
                    {(groupsData || []).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">If a group is selected, employees are optional.</p>
                </div>
                <div className="text-sm text-gray-600 mb-2">Selected employees: {selectedEmployees.size}</div>
                <Button className="w-full loyverse-button" disabled={assignMutation.isPending} onClick={() => assignMutation.mutate({ id: activePath.id, employeeIds: selectedEmployees, groupId: selectedGroupId })}>
                  {assignMutation.isPending ? 'Assigning...' : 'Save Assignment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentPaths;


