import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import DatePicker from '../components/ui/date-picker';
import { 
  Plus, BookOpen, GraduationCap, Briefcase, Users, Target, 
  Edit, Trash2, Eye, Calendar, DollarSign, Clock, MapPin,
  Search, Filter, X
} from 'lucide-react';
import api from '../lib/api';

const LDInterventions = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('categories');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateType, setShowCreateType] = useState(false);
  const [showCreateInstance, setShowCreateInstance] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // category
  const [editingType, setEditingType] = useState(null);
  const [editingInstance, setEditingInstance] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#3B82F6', icon: 'BookOpen' });
  const [typeForm, setTypeForm] = useState({
    category_id: '', name: '', description: '', duration_range: '', delivery_mode: '',
    cost_level: 'MEDIUM', complexity_level: 'MEDIUM', prerequisites: '', learning_objectives: '',
    assessment_method: '', certification_provided: false, external_provider: ''
  });
  const [instanceForm, setInstanceForm] = useState({
    category_id: '', intervention_type_id: '', title: '', description: '', instructor: '', location: '',
    start_date: '', end_date: '', max_participants: 20, cost_per_participant: '', notes: ''
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['ld-categories'],
    queryFn: async () => (await api.get('/ld-interventions/categories')).data,
  });

  // Fetch types
  const { data: typesData } = useQuery({
    queryKey: ['ld-types', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory ? `?category_id=${selectedCategory}` : '';
      return (await api.get(`/ld-interventions/types${params}`)).data;
    },
  });

  // Fetch instances
  const { data: instancesData } = useQuery({
    queryKey: ['ld-instances'],
    queryFn: async () => (await api.get('/ld-interventions/instances')).data,
  });

  const categories = categoriesData?.categories || [];
  const types = typesData?.types || [];
  const instances = instancesData?.instances || [];

  // Filter types for instance creation based on selected category
  const filteredTypesForInstance = instanceForm.category_id 
    ? types.filter(type => type.category_id === instanceForm.category_id)
    : types;

  // Filter data based on search
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTypes = types.filter(type => 
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTypeActive = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/ld-interventions/types/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ld-types'], exact: false })
  });

  const filteredInstances = instances.filter(instance => 
    instance.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.instructor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleInstanceActive = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/ld-interventions/instances/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ld-instances'], exact: false })
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data) => api.post('/ld-interventions/categories', data),
    onSuccess: () => {
      qc.invalidateQueries(['ld-categories']);
      setCategoryForm({ name: '', description: '', color: '#3B82F6', icon: 'BookOpen' });
      setShowCreateCategory(false);
    }
  });

  const toggleCategoryActive = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/ld-interventions/categories/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ld-categories'], exact: false })
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/ld-interventions/categories/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['ld-categories']);
      setEditingItem(null);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => api.delete(`/ld-interventions/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['ld-categories']);
      qc.invalidateQueries(['ld-types']);
    }
  });

  const createTypeMutation = useMutation({
    mutationFn: (data) => api.post('/ld-interventions/types', data),
    onSuccess: () => {
      qc.invalidateQueries(['ld-types']);
      setTypeForm({
        category_id: '', name: '', description: '', duration_range: '', delivery_mode: '',
        cost_level: 'MEDIUM', complexity_level: 'MEDIUM', prerequisites: '', learning_objectives: '',
        assessment_method: '', certification_provided: false, external_provider: ''
      });
      setShowCreateType(false);
    }
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/ld-interventions/types/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['ld-types']);
      setEditingType(null);
    }
  });

  const createInstanceMutation = useMutation({
    mutationFn: (data) => api.post('/ld-interventions/instances', data),
    onSuccess: () => {
      qc.invalidateQueries(['ld-instances']);
      setInstanceForm({
        category_id: '', intervention_type_id: '', title: '', description: '', instructor: '', location: '',
        start_date: '', end_date: '', max_participants: 20, cost_per_participant: '', notes: ''
      });
      setShowCreateInstance(false);
    }
  });

  const updateInstanceMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/ld-interventions/instances/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['ld-instances']);
      setEditingInstance(null);
    }
  });

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    createCategoryMutation.mutate(categoryForm);
  };

  const handleCreateType = (e) => {
    e.preventDefault();
    if (!typeForm.category_id || !typeForm.name.trim()) return;
    createTypeMutation.mutate(typeForm);
  };

  const handleCreateInstance = (e) => {
    e.preventDefault();
    if (!instanceForm.intervention_type_id || !instanceForm.title.trim()) return;
    createInstanceMutation.mutate(instanceForm);
  };

  const handleInstanceCategoryChange = (categoryId) => {
    setInstanceForm(prev => ({
      ...prev,
      category_id: categoryId,
      intervention_type_id: '' // Reset intervention type when category changes
    }));
  };

  const getCategoryIcon = (iconName) => {
    const icons = {
      GraduationCap, Briefcase, Users, Target, BookOpen
    };
    const IconComponent = icons[iconName] || BookOpen;
    return <IconComponent className="h-5 w-5" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      PLANNED: 'bg-blue-100 text-blue-800',
      ONGOING: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCostLevelColor = (level) => {
    const colors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning & Development Interventions</h1>
          <p className="text-gray-600">Manage intervention categories, types, and instances</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateCategory(true)} className="loyverse-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={() => setShowCreateType(true)} className="loyverse-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
          <Button onClick={() => setShowCreateInstance(true)} className="loyverse-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Instance
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search interventions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'categories', name: 'Categories', count: filteredCategories.length },
            { id: 'types', name: 'Types', count: filteredTypes.length },
            { id: 'instances', name: 'Instances', count: filteredInstances.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map(category => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div 
                    className="p-2 rounded-lg text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {getCategoryIcon(category.icon)}
                  </div>
                  {category.name}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Types</span>
                  <span className="font-medium text-gray-900">{category.type_count}</span>
                </div>
                <div className="flex gap-3 mt-3 items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Active</span>
                    <button
                      type="button"
                      aria-pressed={!!category.is_active}
                      onClick={() => toggleCategoryActive.mutate({ id: category.id, is_active: !category.is_active })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${category.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${category.is_active ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditingItem(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this category?')) {
                        deleteCategoryMutation.mutate(category.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Types Tab */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTypes.map(type => (
            <Card key={type.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div 
                    className="p-2 rounded-lg text-white"
                    style={{ backgroundColor: type.category_color }}
                  >
                    {getCategoryIcon(type.category_icon)}
                  </div>
                  {type.name}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${type.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {type.is_active ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
                <p className="text-sm text-gray-500">{type.category_name}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{type.duration_range || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{type.delivery_mode || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className={`px-2 py-1 rounded-full text-xs ${getCostLevelColor(type.cost_level)}`}>
                      {type.cost_level}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Active</span>
                    <button
                      type="button"
                      aria-pressed={!!type.is_active}
                      onClick={() => toggleTypeActive.mutate({ id: type.id, is_active: !type.is_active })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${type.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${type.is_active ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingType(type)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instances Tab */}
      {activeTab === 'instances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstances.map(instance => (
            <Card key={instance.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {instance.title}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${instance.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {instance.is_active ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
                <p className="text-sm text-gray-500">{instance.type_name}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{instance.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {instance.start_date ? new Date(instance.start_date).toLocaleDateString() : 'N/A'} - 
                      {instance.end_date ? new Date(instance.end_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{instance.participant_count}/{instance.max_participants} participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(instance.status)}`}>
                      {instance.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Active</span>
                    <button
                      type="button"
                      aria-pressed={!!instance.is_active}
                      onClick={() => toggleInstanceActive.mutate({ id: instance.id, is_active: !instance.is_active })}
                      className={`relative w-10 h-5 rounded-full transition-colors ${instance.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${instance.is_active ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingInstance(instance)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Intervention Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Label htmlFor="cat-name">Name</Label>
                <Input 
                  id="cat-name" 
                  value={categoryForm.name} 
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} 
                  className="mt-1" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="cat-desc">Description</Label>
                <Input 
                  id="cat-desc" 
                  value={categoryForm.description} 
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cat-color">Color</Label>
                  <Input 
                    id="cat-color" 
                    type="color" 
                    value={categoryForm.color} 
                    onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })} 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="cat-icon">Icon</Label>
                  <select 
                    id="cat-icon" 
                    value={categoryForm.icon} 
                    onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} 
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="BookOpen">BookOpen</option>
                    <option value="GraduationCap">GraduationCap</option>
                    <option value="Briefcase">Briefcase</option>
                    <option value="Users">Users</option>
                    <option value="Target">Target</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setShowCreateCategory(false)} className="loyverse-button-secondary">
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending} className="loyverse-button">
                  {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Category</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = {
                name: form.name.value,
                description: form.description.value,
                color: form.color.value,
                icon: form.icon.value
              };
              updateCategoryMutation.mutate({ id: editingItem.id, data });
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit-cat-name">Name</Label>
                <Input id="edit-cat-name" name="name" defaultValue={editingItem.name} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="edit-cat-desc">Description</Label>
                <Input id="edit-cat-desc" name="description" defaultValue={editingItem.description || ''} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-cat-color">Color</Label>
                  <Input id="edit-cat-color" name="color" type="color" defaultValue={editingItem.color || '#3B82F6'} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-cat-icon">Icon</Label>
                  <select id="edit-cat-icon" name="icon" defaultValue={editingItem.icon || 'BookOpen'} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="BookOpen">BookOpen</option>
                    <option value="GraduationCap">GraduationCap</option>
                    <option value="Briefcase">Briefcase</option>
                    <option value="Users">Users</option>
                    <option value="Target">Target</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setEditingItem(null)} className="loyverse-button-secondary">Cancel</Button>
                <Button type="submit" className="loyverse-button">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Type Modal */}
      {showCreateType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Intervention Type</h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <Label htmlFor="type-category">Category</Label>
                <select 
                  id="type-category" 
                  value={typeForm.category_id} 
                  onChange={e => setTypeForm({ ...typeForm, category_id: e.target.value })} 
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="type-name">Name</Label>
                <Input 
                  id="type-name" 
                  value={typeForm.name} 
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} 
                  className="mt-1" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="type-desc">Description</Label>
                <Input 
                  id="type-desc" 
                  value={typeForm.description} 
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type-duration">Duration Range</Label>
                  <Input 
                    id="type-duration" 
                    value={typeForm.duration_range} 
                    onChange={e => setTypeForm({ ...typeForm, duration_range: e.target.value })} 
                    className="mt-1" 
                    placeholder="e.g., 1-3 days, Self-paced"
                  />
                </div>
                <div>
                  <Label htmlFor="type-delivery">Delivery Mode</Label>
                  <select 
                    id="type-delivery" 
                    value={typeForm.delivery_mode} 
                    onChange={e => setTypeForm({ ...typeForm, delivery_mode: e.target.value })} 
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select Mode</option>
                    <option value="Face-to-face">Face-to-face</option>
                    <option value="Online">Online</option>
                    <option value="Blended">Blended</option>
                    <option value="Self-directed">Self-directed</option>
                    <option value="Workplace">Workplace</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type-cost">Cost Level</Label>
                  <select 
                    id="type-cost" 
                    value={typeForm.cost_level} 
                    onChange={e => setTypeForm({ ...typeForm, cost_level: e.target.value })} 
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="type-complexity">Complexity Level</Label>
                  <select 
                    id="type-complexity" 
                    value={typeForm.complexity_level} 
                    onChange={e => setTypeForm({ ...typeForm, complexity_level: e.target.value })} 
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setShowCreateType(false)} className="loyverse-button-secondary">
                  Cancel
                </Button>
                <Button type="submit" disabled={createTypeMutation.isPending} className="loyverse-button">
                  {createTypeMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Type Modal */}
      {editingType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Intervention Type</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const data = {
                name: f.name.value,
                description: f.description.value,
                duration_range: f.duration_range.value,
                delivery_mode: f.delivery_mode.value,
                cost_level: f.cost_level.value,
                complexity_level: f.complexity_level.value
              };
              updateTypeMutation.mutate({ id: editingType.id, data });
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit-type-name">Name</Label>
                <Input id="edit-type-name" name="name" defaultValue={editingType.name} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="edit-type-desc">Description</Label>
                <Input id="edit-type-desc" name="description" defaultValue={editingType.description || ''} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-type-duration">Duration Range</Label>
                  <Input id="edit-type-duration" name="duration_range" defaultValue={editingType.duration_range || ''} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-type-delivery">Delivery Mode</Label>
                  <select id="edit-type-delivery" name="delivery_mode" defaultValue={editingType.delivery_mode || ''} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="">Select Mode</option>
                    <option value="Face-to-face">Face-to-face</option>
                    <option value="Online">Online</option>
                    <option value="Blended">Blended</option>
                    <option value="Self-directed">Self-directed</option>
                    <option value="Workplace">Workplace</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-type-cost">Cost Level</Label>
                  <select id="edit-type-cost" name="cost_level" defaultValue={editingType.cost_level || 'MEDIUM'} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-type-complexity">Complexity Level</Label>
                  <select id="edit-type-complexity" name="complexity_level" defaultValue={editingType.complexity_level || 'MEDIUM'} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="BASIC">Basic</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setEditingType(null)} className="loyverse-button-secondary">Cancel</Button>
                <Button type="submit" className="loyverse-button">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Instance Modal */}
      {showCreateInstance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Intervention Instance</h3>
            <form onSubmit={handleCreateInstance} className="space-y-4">
              <div>
                <Label htmlFor="instance-category">Category</Label>
                <select 
                  id="instance-category" 
                  value={instanceForm.category_id} 
                  onChange={e => handleInstanceCategoryChange(e.target.value)} 
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="instance-type">Intervention Type</Label>
                <select 
                  id="instance-type" 
                  value={instanceForm.intervention_type_id} 
                  onChange={e => setInstanceForm({ ...instanceForm, intervention_type_id: e.target.value })} 
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                  disabled={!instanceForm.category_id}
                >
                  <option value="">Select Type</option>
                  {filteredTypesForInstance.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                {!instanceForm.category_id && (
                  <p className="text-xs text-gray-500 mt-1">Please select a category first</p>
                )}
              </div>
              <div>
                <Label htmlFor="instance-title">Title</Label>
                <Input 
                  id="instance-title" 
                  value={instanceForm.title} 
                  onChange={e => setInstanceForm({ ...instanceForm, title: e.target.value })} 
                  className="mt-1" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="instance-desc">Description</Label>
                <Input 
                  id="instance-desc" 
                  value={instanceForm.description} 
                  onChange={e => setInstanceForm({ ...instanceForm, description: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instance-instructor">Instructor</Label>
                  <Input 
                    id="instance-instructor" 
                    value={instanceForm.instructor} 
                    onChange={e => setInstanceForm({ ...instanceForm, instructor: e.target.value })} 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="instance-location">Location</Label>
                  <Input 
                    id="instance-location" 
                    value={instanceForm.location} 
                    onChange={e => setInstanceForm({ ...instanceForm, location: e.target.value })} 
                    className="mt-1" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instance-start">Start Date</Label>
                  <DatePicker 
                    value={instanceForm.start_date} 
                    onChange={(date) => setInstanceForm({ ...instanceForm, start_date: date })}
                    placeholder="Select start date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="instance-end">End Date</Label>
                  <DatePicker 
                    value={instanceForm.end_date} 
                    onChange={(date) => setInstanceForm({ ...instanceForm, end_date: date })}
                    placeholder="Select end date"
                    className="mt-1"
                    minDate={instanceForm.start_date ? new Date(instanceForm.start_date) : null}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instance-max">Max Participants</Label>
                  <Input 
                    id="instance-max" 
                    type="number" 
                    value={instanceForm.max_participants} 
                    onChange={e => setInstanceForm({ ...instanceForm, max_participants: parseInt(e.target.value) })} 
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label htmlFor="instance-cost">Cost per Participant</Label>
                  <Input 
                    id="instance-cost" 
                    type="number" 
                    step="0.01" 
                    value={instanceForm.cost_per_participant} 
                    onChange={e => setInstanceForm({ ...instanceForm, cost_per_participant: e.target.value })} 
                    className="mt-1" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setShowCreateInstance(false)} className="loyverse-button-secondary">
                  Cancel
                </Button>
                <Button type="submit" disabled={createInstanceMutation.isPending} className="loyverse-button">
                  {createInstanceMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Instance Modal */}
      {editingInstance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Intervention Instance</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const data = {
                title: f.title.value,
                description: f.description.value,
                instructor: f.instructor.value,
                location: f.location.value,
                start_date: f.start_date.value,
                end_date: f.end_date.value,
                status: f.status.value
              };
              updateInstanceMutation.mutate({ id: editingInstance.id, data });
            }} className="space-y-4">
              <div>
                <Label htmlFor="edit-inst-title">Title</Label>
                <Input id="edit-inst-title" name="title" defaultValue={editingInstance.title} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="edit-inst-desc">Description</Label>
                <Input id="edit-inst-desc" name="description" defaultValue={editingInstance.description || ''} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-inst-instructor">Instructor</Label>
                  <Input id="edit-inst-instructor" name="instructor" defaultValue={editingInstance.instructor || ''} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-inst-location">Location</Label>
                  <Input id="edit-inst-location" name="location" defaultValue={editingInstance.location || ''} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-inst-start">Start Date</Label>
                  <Input id="edit-inst-start" name="start_date" type="date" defaultValue={editingInstance.start_date || ''} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-inst-end">End Date</Label>
                  <Input id="edit-inst-end" name="end_date" type="date" defaultValue={editingInstance.end_date || ''} className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-inst-status">Status</Label>
                <select id="edit-inst-status" name="status" defaultValue={editingInstance.status || 'PLANNED'} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="PLANNED">Planned</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" onClick={() => setEditingInstance(null)} className="loyverse-button-secondary">Cancel</Button>
                <Button type="submit" className="loyverse-button">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LDInterventions;
