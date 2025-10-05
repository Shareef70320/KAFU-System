import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import DatePicker from '../components/ui/date-picker';
import { Calendar, Layers, Plus, GripVertical, GraduationCap, Briefcase, Users, Target, BookOpen, Edit } from 'lucide-react';
import api from '../lib/api';

const PathDetails = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [edit, setEdit] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [editingIntervention, setEditingIntervention] = useState(null);
  const [editInterventionForm, setEditInterventionForm] = useState({
    category_id: '', intervention_type: '', intervention_name: '', description: '', 
    start_date: '', end_date: '', duration_hours: '', managed_by: ''
  });
  const emptyIntervention = { 
    intervention_type_id: '', title: '', description: '', instructor: '', location: '', 
    start_date: '', end_date: '', duration_hours: '', notes: '', managed_by: ''
  };
  const [newIntv, setNewIntv] = useState({ ...emptyIntervention });
  const [pendingList, setPendingList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data } = useQuery({
    queryKey: ['path-detail', id],
    queryFn: async () => (await api.get(`/development-paths/${id}`)).data,
    enabled: !!id
  });

  // Fetch L&D intervention categories and types
  const { data: categoriesData } = useQuery({
    queryKey: ['ld-categories'],
    queryFn: async () => (await api.get('/ld-interventions/categories')).data,
  });

  const { data: typesData } = useQuery({
    queryKey: ['ld-types', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory ? `?category_id=${selectedCategory}` : '';
      return (await api.get(`/ld-interventions/types${params}`)).data;
    },
  });

  // Fetch employees for managed_by dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get('/employees?page=1&limit=10000')).data,
  });

  const path = data?.path;
  const interventions = useMemo(() => data?.interventions || [], [data]);
  const categories = categoriesData?.categories || [];
  const types = typesData?.types || [];
  const employees = employeesData?.employees || [];

  // Filter types based on selected category
  const filteredTypes = selectedCategory 
    ? types.filter(type => type.category_id === selectedCategory)
    : types;

  // Helper function to get category icon
  const getCategoryIcon = (iconName) => {
    const icons = {
      GraduationCap, Briefcase, Users, Target, BookOpen
    };
    const IconComponent = icons[iconName] || BookOpen;
    return <IconComponent className="h-4 w-4" />;
  };

  // Helper function to get intervention type name
  const getInterventionTypeName = (typeId) => {
    const type = types.find(t => t.id === typeId);
    return type ? type.name : 'Unknown Type';
  };

  // Handler for category selection
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setNewIntv(prev => ({ ...prev, intervention_type_id: '' }));
  };

  const updatePath = useMutation({
    mutationFn: (payload) => api.put(`/development-paths/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['path-detail', id]);
      navigate('/development-paths');
    },
    onError: () => {
      // fallback notification
      alert('Failed to save path details. Please try again.');
    }
  });

  const createIntv = useMutation({
    mutationFn: (payload) => api.post(`/development-paths/${id}/interventions`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['path-detail', id]);
      setNewIntv({ ...emptyIntervention });
      setSelectedCategory('');
      console.log('Intervention created successfully');
    },
    onError: (error) => {
      console.error('Failed to create intervention:', error);
      alert('Failed to create intervention. Please check the console for details.');
    }
  });

  const updateIntv = useMutation({
    mutationFn: ({ iid, payload }) => api.put(`/development-paths/interventions/${iid}`, payload),
    onSuccess: () => qc.invalidateQueries(['path-detail', id])
  });

  const deleteIntv = useMutation({
    mutationFn: (iid) => api.delete(`/development-paths/interventions/${iid}`),
    onSuccess: () => qc.invalidateQueries(['path-detail', id])
  });

  const saveAllPending = async () => {
    // Save path details first
    await api.put(`/development-paths/${id}`, {
      name: edit.name || path.name,
      description: edit.description || path.description,
      start_date: (edit.start_date || (path.start_date ? path.start_date.split('T')[0] : '')) || null,
      end_date: (edit.end_date || (path.end_date ? path.end_date.split('T')[0] : '')) || null,
    });

    // Save pending interventions if any
    if (pendingList.length > 0) {
      const valid = pendingList.every(p => p.title && p.intervention_type_id);
      if (valid) {
        await Promise.all(pendingList.map(p => api.post(`/development-paths/${id}/interventions`, p)));
      }
    }

    // Navigate back
    navigate('/development-paths');
  };

  if (!path) return <div className="text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Layers className="h-6 w-6 text-green-600" /> {path.name}</h1>
          <p className="text-gray-600">Edit path details and manage interventions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Path Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={edit.name || path.name} onChange={e => setEdit({ ...edit, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Start Date</Label>
              <DatePicker 
                value={edit.start_date || (path.start_date ? path.start_date.split('T')[0] : '')} 
                onChange={(date) => setEdit({ ...edit, start_date: date })}
                placeholder="Select start date"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={edit.description || path.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>End Date</Label>
              <DatePicker 
                value={edit.end_date || (path.end_date ? path.end_date.split('T')[0] : '')} 
                onChange={(date) => setEdit({ ...edit, end_date: date })}
                placeholder="Select end date"
                className="mt-1"
                minDate={edit.start_date ? new Date(edit.start_date) : (path.start_date ? new Date(path.start_date.split('T')[0]) : null)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEdit({ name: '', description: '', start_date: '', end_date: '' })}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                const payload = {
                  name: (edit.name ?? '').trim() || path.name,
                  description: (edit.description ?? '').trim() === '' ? (path.description ?? null) : (edit.description ?? path.description ?? null),
                  start_date: edit.start_date !== undefined ? edit.start_date : (path.start_date ? path.start_date.split('T')[0] : null),
                  end_date: edit.end_date !== undefined ? edit.end_date : (path.end_date ? path.end_date.split('T')[0] : null),
                };
                // convert empty strings to null to avoid ::date cast errors
                if (payload.start_date === '') payload.start_date = null;
                if (payload.end_date === '') payload.end_date = null;
                
                console.log('Updating path with payload:', payload);
                updatePath.mutate(payload);
              }}
              disabled={updatePath.isPending}
              className="loyverse-button"
            >
              {updatePath.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Interventions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeline view */}
          <div className="relative pl-8 mb-6">
            <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gray-200" />
            {interventions.map((iv) => (
              <div key={iv.id} className="relative mb-5">
                <div className="absolute -left-2 top-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white shadow" />
                <div className="ml-2 border rounded-md p-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      {iv.intervention_name}
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                        {iv.intervention_type || 'Unknown Type'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingIntervention(iv);
                        // Find the category for this intervention type
                        const interventionType = types.find(type => type.id === iv.intervention_type);
                        setEditInterventionForm({
                          category_id: interventionType?.category_id || '',
                          intervention_type: iv.intervention_type || '',
                          intervention_name: iv.intervention_name || '',
                          description: iv.description || '',
                          start_date: iv.start_date ? iv.start_date.split('T')[0] : '',
                          end_date: iv.end_date ? iv.end_date.split('T')[0] : '',
                          duration_hours: iv.duration_hours || '',
                          managed_by: iv.managed_by || ''
                        });
                      }}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteIntv.mutate(iv.id)}>Delete</Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{iv.description || '—'}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <Calendar className="h-3 w-3" /> 
                    {iv.start_date ? iv.start_date.split('T')[0] : 'N/A'} → {iv.end_date ? iv.end_date.split('T')[0] : 'N/A'} • {iv.duration_hours || 0}h
                    {iv.managed_by && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-blue-600">Managed by: {employees.find(emp => emp.sid === iv.managed_by)?.first_name} {employees.find(emp => emp.sid === iv.managed_by)?.last_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select 
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                  value={selectedCategory} 
                  onChange={e => handleCategoryChange(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Intervention Type</Label>
                <select 
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                  value={newIntv.intervention_type_id} 
                  onChange={e => setNewIntv({ ...newIntv, intervention_type_id: e.target.value })}
                  disabled={!selectedCategory}
                >
                  <option value="">Select Type</option>
                  {filteredTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                {!selectedCategory && (
                  <p className="text-xs text-gray-500 mt-1">Please select a category first</p>
                )}
              </div>
              <div>
                <Label>Title</Label>
                <Input className="mt-1" value={newIntv.title} onChange={e => setNewIntv({ ...newIntv, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Input className="mt-1" value={newIntv.description} onChange={e => setNewIntv({ ...newIntv, description: e.target.value })} />
              </div>
              <div>
                <Label>Instructor</Label>
                <Input className="mt-1" value={newIntv.instructor} onChange={e => setNewIntv({ ...newIntv, instructor: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input className="mt-1" value={newIntv.location} onChange={e => setNewIntv({ ...newIntv, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <DatePicker 
                    value={newIntv.start_date} 
                    onChange={(date) => {
                      setNewIntv({ 
                        ...newIntv, 
                        start_date: date,
                        // Automatically set end date to be 1 day after start date
                        end_date: date ? (() => {
                          const endDate = new Date(date);
                          endDate.setDate(endDate.getDate() + 1);
                          return endDate;
                        })() : ''
                      });
                    }}
                    placeholder="Select start date"
                    className="mt-1"
                    minDate={path.start_date ? new Date(path.start_date.split('T')[0]) : null}
                    maxDate={path.end_date ? new Date(path.end_date.split('T')[0]) : null}
                    // Set initial month to path start date month
                    initialMonth={path.start_date ? new Date(path.start_date.split('T')[0]) : new Date()}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <DatePicker 
                    value={newIntv.end_date} 
                    onChange={(date) => setNewIntv({ ...newIntv, end_date: date })}
                    placeholder="Select end date"
                    className="mt-1"
                    minDate={newIntv.start_date ? new Date(newIntv.start_date) : (path.start_date ? new Date(path.start_date.split('T')[0]) : null)}
                    maxDate={path.end_date ? new Date(path.end_date.split('T')[0]) : null}
                  />
                </div>
              </div>
              <div>
                <Label>Duration (hours)</Label>
                <Input type="number" className="mt-1" value={newIntv.duration_hours} onChange={e => setNewIntv({ ...newIntv, duration_hours: e.target.value ? parseInt(e.target.value) || 0 : '' })} />
              </div>
              <div>
                <Label>Manage By</Label>
                <select 
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                  value={newIntv.managed_by} 
                  onChange={e => setNewIntv({ ...newIntv, managed_by: e.target.value })}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.sid} value={emp.sid}>{emp.first_name} {emp.last_name} ({emp.sid})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">Pending: {pendingList.length}</span>
              <Button
                onClick={() => {
                  if (!newIntv.title || !newIntv.intervention_type_id) return;
                  
                  // Validate dates are within path duration
                  const pathStart = path.start_date ? new Date(path.start_date.split('T')[0]) : null;
                  const pathEnd = path.end_date ? new Date(path.end_date.split('T')[0]) : null;
                  const intvStart = newIntv.start_date ? new Date(newIntv.start_date) : null;
                  const intvEnd = newIntv.end_date ? new Date(newIntv.end_date) : null;
                  
                  // Helper function to format date in local timezone
                  const formatDateLocal = (date) => {
                    if (!date) return null;
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  
                  console.log('Date validation:', {
                    pathStart: formatDateLocal(pathStart),
                    pathEnd: formatDateLocal(pathEnd),
                    intvStart: formatDateLocal(intvStart),
                    intvEnd: formatDateLocal(intvEnd),
                    pathStartRaw: path.start_date,
                    pathEndRaw: path.end_date,
                    intvStartRaw: newIntv.start_date,
                    intvEndRaw: newIntv.end_date
                  });
                  
                  // Normalize dates to midnight for proper comparison
                  const normalizeDate = (date) => {
                    if (!date) return null;
                    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                  };
                  
                  const normalizedPathStart = normalizeDate(pathStart);
                  const normalizedPathEnd = normalizeDate(pathEnd);
                  const normalizedIntvStart = normalizeDate(intvStart);
                  const normalizedIntvEnd = normalizeDate(intvEnd);
                  
                  if (normalizedPathStart && normalizedIntvStart && normalizedIntvStart < normalizedPathStart) {
                    alert('Intervention start date cannot be before the path start date');
                    return;
                  }
                  
                  if (normalizedPathEnd && normalizedIntvEnd && normalizedIntvEnd > normalizedPathEnd) {
                    alert('Intervention end date cannot be after the path end date');
                    return;
                  }
                  
                  if (normalizedIntvStart && normalizedIntvEnd && normalizedIntvEnd < normalizedIntvStart) {
                    alert('Intervention end date cannot be before the start date');
                    return;
                  }
                  
                  console.log('Creating intervention with payload:', newIntv);
                  
                  if (pendingList.length === 0) {
                    // Immediate save if no batch is active
                    createIntv.mutate(newIntv);
                  } else {
                    // Stage into batch when batch exists
                    setPendingList(list => [...list, { ...newIntv }]);
                  }
                  setNewIntv({ ...emptyIntervention });
                  setSelectedCategory('');
                }}
                className="loyverse-button"
                disabled={!newIntv.title || !newIntv.intervention_type_id}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Intervention
              </Button>
            </div>
          </div>

          {pendingList.length > 0 && (
            <div className="mt-6 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-900">Pending Interventions</div>
                <div className="text-xs text-gray-500">{pendingList.length} pending</div>
              </div>
              <div className="space-y-4">
                {pendingList.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div>
                      <Label>Type</Label>
                      <select className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={p.intervention_type_id} onChange={e => setPendingList(list => list.map((it,i)=> i===idx? { ...it, intervention_type_id: e.target.value }: it))}>
                        <option value="">Select Type</option>
                        {types.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Title</Label>
                      <Input className="mt-1" value={p.title} onChange={e => setPendingList(list => list.map((it,i)=> i===idx? { ...it, title: e.target.value }: it))} />
                    </div>
                    <div>
                      <Label>Start</Label>
                      <DatePicker 
                        value={p.start_date} 
                        onChange={(date) => setPendingList(list => list.map((it,i)=> i===idx? { 
                          ...it, 
                          start_date: date,
                          // Automatically set end date to be 1 day after start date
                          end_date: date ? (() => {
                            const endDate = new Date(date);
                            endDate.setDate(endDate.getDate() + 1);
                            return endDate;
                          })() : ''
                        }: it))}
                        placeholder="Start date"
                        className="mt-1"
                        minDate={path.start_date ? new Date(path.start_date.split('T')[0]) : null}
                        maxDate={path.end_date ? new Date(path.end_date.split('T')[0]) : null}
                        initialMonth={path.start_date ? new Date(path.start_date.split('T')[0]) : new Date()}
                      />
                    </div>
                    <div>
                      <Label>End</Label>
                      <DatePicker 
                        value={p.end_date} 
                        onChange={(date) => setPendingList(list => list.map((it,i)=> i===idx? { ...it, end_date: date }: it))}
                        placeholder="End date"
                        className="mt-1"
                        minDate={p.start_date ? new Date(p.start_date) : (path.start_date ? new Date(path.start_date.split('T')[0]) : null)}
                        maxDate={path.end_date ? new Date(path.end_date.split('T')[0]) : null}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPendingList(list => list.filter((_,i)=> i!==idx))}>Remove</Button>
                    </div>
                    <div className="md:col-span-4">
                      <Label>Description</Label>
                      <Input className="mt-1" value={p.description} onChange={e => setPendingList(list => list.map((it,i)=> i===idx? { ...it, description: e.target.value }: it))} />
                    </div>
                    <div>
                      <Label>Duration (hours)</Label>
                      <Input type="number" className="mt-1" value={p.duration_hours} onChange={e => setPendingList(list => list.map((it,i)=> i===idx? { ...it, duration_hours: e.target.value ? parseInt(e.target.value) || 0 : '' }: it))} />
                    </div>
                    <div>
                      <Label>Manage By</Label>
                      <select 
                        className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                        value={p.managed_by || ''} 
                        onChange={e => setPendingList(list => list.map((it,i)=> i===idx? { ...it, managed_by: e.target.value }: it))}
                      >
                        <option value="">Select Employee</option>
                        {employees.map(emp => (
                          <option key={emp.sid} value={emp.sid}>{emp.first_name} {emp.last_name} ({emp.sid})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPendingList(list => [...list, { ...emptyIntervention }])}>Add Row</Button>
                    <Button variant="outline" onClick={() => setPendingList([])}>Clear</Button>
                  </div>
                  <Button onClick={saveAllPending} className="loyverse-button" disabled={pendingList.some(p=>!p.title)}>
                    Save All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Intervention Modal */}
      <Dialog open={!!editingIntervention} onOpenChange={() => setEditingIntervention(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Intervention</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select 
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                value={editInterventionForm.category_id || ''} 
                onChange={e => {
                  const categoryId = e.target.value;
                  setEditInterventionForm({ 
                    ...editInterventionForm, 
                    category_id: categoryId,
                    intervention_type: '' // Reset type when category changes
                  });
                }}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Intervention Type</Label>
              <select 
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                value={editInterventionForm.intervention_type || ''} 
                onChange={e => setEditInterventionForm({ ...editInterventionForm, intervention_type: e.target.value })}
                disabled={!editInterventionForm.category_id}
              >
                <option value="">Select Type</option>
                {types
                  .filter(type => type.category_id === editInterventionForm.category_id)
                  .map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Intervention Name</Label>
              <Input 
                value={editInterventionForm.intervention_name} 
                onChange={e => setEditInterventionForm({ ...editInterventionForm, intervention_name: e.target.value })}
                placeholder="e.g., Financial Analysis Workshop"
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <textarea 
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                rows={3}
                value={editInterventionForm.description} 
                onChange={e => setEditInterventionForm({ ...editInterventionForm, description: e.target.value })}
                placeholder="Detailed description of the intervention"
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <DatePicker 
                value={editInterventionForm.start_date} 
                onChange={(date) => setEditInterventionForm({ 
                  ...editInterventionForm, 
                  start_date: date 
                })}
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <DatePicker 
                value={editInterventionForm.end_date} 
                onChange={(date) => setEditInterventionForm({ 
                  ...editInterventionForm, 
                  end_date: date 
                })}
                placeholder="Select end date"
              />
            </div>
            <div>
              <Label>Duration (hours)</Label>
              <Input 
                type="number" 
                value={editInterventionForm.duration_hours} 
                onChange={e => setEditInterventionForm({ ...editInterventionForm, duration_hours: e.target.value })}
                placeholder="e.g., 8"
              />
            </div>
            <div>
              <Label>Manage By</Label>
              <select 
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                value={editInterventionForm.managed_by} 
                onChange={e => setEditInterventionForm({ ...editInterventionForm, managed_by: e.target.value })}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.sid} value={emp.sid}>{emp.first_name} {emp.last_name} ({emp.sid})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIntervention(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const payload = { ...editInterventionForm };
                // Convert empty strings to null for dates
                if (payload.start_date === '') payload.start_date = null;
                if (payload.end_date === '') payload.end_date = null;
                if (payload.duration_hours === '') payload.duration_hours = null;
                
                updateIntv.mutate({ 
                  iid: editingIntervention.id, 
                  payload 
                });
                setEditingIntervention(null);
              }}
              disabled={updateIntv.isPending}
            >
              {updateIntv.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PathDetails;


