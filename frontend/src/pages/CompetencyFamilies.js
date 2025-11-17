import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Building2,
  Save,
  Check
} from 'lucide-react';

const CompetencyFamilies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: '', description: '', isActive: true });
  
  const allTypes = [
    { value: 'TECHNICAL', label: 'Technical' },
    { value: 'NON_TECHNICAL', label: 'Non Technical' }
  ];

  // Fetch all families
  const { data: families, isLoading } = useQuery({
    queryKey: ['competency-families'],
    queryFn: async () => {
      const response = await api.get('/competency-families');
      return response.data;
    }
  });

  // Create family mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/competency-families', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency-families']);
      toast({
        title: 'Success',
        description: 'Competency family created successfully!',
        variant: 'default'
      });
      setShowAddModal(false);
      setFormData({ name: '', type: '', description: '', isActive: true });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create competency family',
        variant: 'destructive'
      });
    }
  });

  // Update family mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/competency-families/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency-families']);
      toast({
        title: 'Success',
        description: 'Competency family updated successfully!',
        variant: 'default'
      });
      setEditingFamily(null);
      setFormData({ name: '', type: '', description: '', isActive: true });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update competency family',
        variant: 'destructive'
      });
    }
  });

  // Delete family mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/competency-families/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency-families']);
      toast({
        title: 'Success',
        description: 'Competency family deleted successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete competency family',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Family name is required',
        variant: 'destructive'
      });
      return;
    }

    if (editingFamily) {
      updateMutation.mutate({
        id: editingFamily.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (family) => {
    setEditingFamily(family);
    setFormData({
      name: family.name,
      type: family.type || '',
      description: family.description || '',
      isActive: family.isActive
    });
    setShowAddModal(true);
  };

  const handleDelete = (family) => {
    if (window.confirm(`Are you sure you want to delete "${family.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(family.id);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingFamily(null);
    setFormData({ name: '', type: '', description: '', isActive: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading families...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/competencies')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competencies
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Competency Families</h1>
              <p className="text-gray-600 mt-2">Manage competency families used in the framework</p>
            </div>
            <Button
              onClick={() => {
                setEditingFamily(null);
                setFormData({ name: '', type: '', description: '', isActive: true });
                setShowAddModal(true);
              }}
              className="loyverse-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Family
            </Button>
          </div>
        </div>

        {/* Families List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {families && families.length > 0 ? (
            families.map((family) => (
              <Card key={family.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{family.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      {family.type && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          family.type === 'TECHNICAL' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {family.type === 'TECHNICAL' ? 'Technical' : 'Non Technical'}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        family.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {family.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {family.description && (
                    <p className="text-sm text-gray-600 mb-4">{family.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-4">
                    Used by {family._count?.competencies || 0} competency(ies)
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(family)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(family)}
                      className="text-red-600 hover:text-red-700"
                      disabled={family._count?.competencies > 0}
                      title={family._count?.competencies > 0 ? 'Cannot delete: family is in use' : 'Delete family'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium mb-2">No Families Found</p>
              <p className="text-gray-500 text-sm mb-4">Get started by adding your first competency family.</p>
              <Button
                onClick={() => {
                  setEditingFamily(null);
                  setFormData({ name: '', type: '', description: '', isActive: true });
                  setShowAddModal(true);
                }}
                className="loyverse-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Family
              </Button>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingFamily ? 'Edit Family' : 'Add New Family'}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Family Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Finance, HR, Technical Services"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="loyverse-input mt-1 w-full"
                    required
                  >
                    <option value="">Select Type</option>
                    {allTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter family description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="loyverse-button"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingFamily ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingFamily ? (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Update
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetencyFamilies;

