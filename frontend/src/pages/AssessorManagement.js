import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Award,
  BookOpen,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';

const AssessorManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssessor, setEditingAssessor] = useState(null);

  // Form state for adding/editing assessor
  const [formData, setFormData] = useState({
    assessorSid: '',
    competencyId: '',
    competencyLevel: ''
  });

  // Fetch assessors
  const { data: assessorsData, isLoading: assessorsLoading } = useQuery({
    queryKey: ['assessor-management', searchTerm, selectedCompetency, selectedLevel],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCompetency) params.append('competencyId', selectedCompetency);
      if (selectedLevel) params.append('level', selectedLevel);
      
      const response = await api.get(`/assessor-management?${params.toString()}`);
      return response.data;
    }
  });

  // Fetch competencies for dropdown
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies-for-assessors'],
    queryFn: async () => {
      const response = await api.get('/competencies?limit=1000');
      return response.data.competencies || response.data;
    }
  });

  // Fetch employees for assessor selection
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-assessors'],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      return response.data.employees || response.data;
    }
  });

  // Add assessor mutation
  const addAssessorMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/assessor-management', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessor-management']);
      setShowAddModal(false);
      setFormData({ assessorSid: '', competencyId: '', competencyLevel: '' });
      toast({
        title: "Success",
        description: "Assessor competency added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add assessor competency",
        variant: "destructive",
      });
    }
  });

  // Update assessor mutation
  const updateAssessorMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/assessor-management/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessor-management']);
      setEditingAssessor(null);
      toast({
        title: "Success",
        description: "Assessor competency updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update assessor competency",
        variant: "destructive",
      });
    }
  });

  // Delete assessor mutation
  const deleteAssessorMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/assessor-management/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessor-management']);
      toast({
        title: "Success",
        description: "Assessor competency removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove assessor competency",
        variant: "destructive",
      });
    }
  });

  const handleAddAssessor = () => {
    if (!formData.assessorSid || !formData.competencyId || !formData.competencyLevel) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    addAssessorMutation.mutate(formData);
  };

  const handleUpdateAssessor = () => {
    if (!editingAssessor) return;
    updateAssessorMutation.mutate({
      id: editingAssessor.id,
      data: { competencyLevel: formData.competencyLevel }
    });
  };

  const handleDeleteAssessor = (id) => {
    if (window.confirm('Are you sure you want to remove this assessor competency?')) {
      deleteAssessorMutation.mutate(id);
    }
  };

  const openEditModal = (assessor) => {
    setEditingAssessor(assessor);
    setFormData({
      assessorSid: assessor.assessor_sid,
      competencyId: assessor.competency_id,
      competencyLevel: assessor.competency_level
    });
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-gray-100 text-gray-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-blue-100 text-blue-800';
      case 'MASTERY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssessors = assessorsData?.assessors?.filter(assessor => {
    const matchesSearch = !searchTerm || 
      assessor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessor.competency_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessor Management</h1>
          <p className="text-gray-600">Manage assessors and their competency qualifications</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Assessor Competency
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Total Assessors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {assessorsData?.pagination?.total || 0}
            </div>
            <p className="text-sm text-gray-500">Active assessors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Award className="h-5 w-5 mr-2 text-green-600" />
              Competency Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {assessorsData?.assessors?.length || 0}
            </div>
            <p className="text-sm text-gray-500">Total assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
              Competencies Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {new Set(assessorsData?.assessors?.map(a => a.competency_id)).size || 0}
            </div>
            <p className="text-sm text-gray-500">Unique competencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-orange-600" />
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {assessorsData?.assessors?.filter(a => a.is_active).length || 0}
            </div>
            <p className="text-sm text-gray-500">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search assessors or competencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Competency</label>
              <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
                <SelectTrigger>
                  <SelectValue placeholder="All competencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All competencies</SelectItem>
                  {competenciesData?.map(comp => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Level</label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All levels</SelectItem>
                  <SelectItem value="BASIC">BASIC</SelectItem>
                  <SelectItem value="INTERMEDIATE">INTERMEDIATE</SelectItem>
                  <SelectItem value="ADVANCED">ADVANCED</SelectItem>
                  <SelectItem value="MASTERY">MASTERY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCompetency('');
                  setSelectedLevel('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assessor Competencies</CardTitle>
        </CardHeader>
        <CardContent>
          {assessorsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Assessor</th>
                    <th className="text-left p-3 font-medium">Competency</th>
                    <th className="text-left p-3 font-medium">Level</th>
                    <th className="text-left p-3 font-medium">Division</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessors.map((assessor) => (
                    <tr key={assessor.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{assessor.first_name} {assessor.last_name}</div>
                          <div className="text-sm text-gray-500">{assessor.email}</div>
                          <div className="text-sm text-gray-500">{assessor.job_title}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{assessor.competency_name}</div>
                          <div className="text-sm text-gray-500">{assessor.competency_family}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(assessor.competency_level)}`}>
                          {assessor.competency_level}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{assessor.division}</div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          assessor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {assessor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(assessor)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAssessor(assessor.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Assessor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add Assessor Competency</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Assessor</label>
                <Select value={formData.assessorSid} onValueChange={(value) => setFormData({...formData, assessorSid: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessor" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesData?.map(emp => (
                      <SelectItem key={emp.sid} value={emp.sid}>
                        {emp.first_name} {emp.last_name} ({emp.sid})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Competency</label>
                <Select value={formData.competencyId} onValueChange={(value) => setFormData({...formData, competencyId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select competency" />
                  </SelectTrigger>
                  <SelectContent>
                    {competenciesData?.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name} ({comp.family})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Maximum Level</label>
                <Select value={formData.competencyLevel} onValueChange={(value) => setFormData({...formData, competencyLevel: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">BASIC</SelectItem>
                    <SelectItem value="INTERMEDIATE">INTERMEDIATE</SelectItem>
                    <SelectItem value="ADVANCED">ADVANCED</SelectItem>
                    <SelectItem value="MASTERY">MASTERY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddAssessor}
                disabled={addAssessorMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {addAssessorMutation.isPending ? 'Adding...' : 'Add Assessor'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assessor Modal */}
      {editingAssessor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Assessor Competency</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Assessor</label>
                <div className="p-2 bg-gray-100 rounded text-sm">
                  {editingAssessor.first_name} {editingAssessor.last_name} ({editingAssessor.assessor_sid})
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Competency</label>
                <div className="p-2 bg-gray-100 rounded text-sm">
                  {editingAssessor.competency_name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Maximum Level</label>
                <Select value={formData.competencyLevel} onValueChange={(value) => setFormData({...formData, competencyLevel: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">BASIC</SelectItem>
                    <SelectItem value="INTERMEDIATE">INTERMEDIATE</SelectItem>
                    <SelectItem value="ADVANCED">ADVANCED</SelectItem>
                    <SelectItem value="MASTERY">MASTERY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setEditingAssessor(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateAssessor}
                disabled={updateAssessorMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateAssessorMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessorManagement;
