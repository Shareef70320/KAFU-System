import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Target, 
  Edit, 
  Save, 
  X, 
  Plus,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  UserCheck,
  BarChart3,
  UserPlus,
  Search,
  Briefcase,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';

const JobCriticality = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('evaluate'); // 'evaluate' or 'results'
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCriticality, setSelectedCriticality] = useState('all'); // 'all', 'High', 'Medium', 'Low'
  const [selectedJobForSuccessor, setSelectedJobForSuccessor] = useState(null);
  const [showAssignSuccessorModal, setShowAssignSuccessorModal] = useState(false);
  const [successorForm, setSuccessorForm] = useState({ employeeId: '', readinessLevel: '', notes: '' });
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Icon mapping
  const iconMap = {
    Target,
    AlertTriangle,
    Shield,
    DollarSign,
    UserCheck,
    Users
  };

  // Fetch criteria from backend
  const { data: criteriaData, isLoading } = useQuery({
    queryKey: ['job-criticality-criteria'],
    queryFn: async () => {
      const response = await api.get('/job-criticality');
      return response.data.criteria;
    }
  });

  const criteria = criteriaData || [];

  // Fetch job evaluations with job details
  const { data: evaluationsData, isLoading: evaluationsLoading } = useQuery({
    queryKey: ['job-evaluations-with-jobs'],
    queryFn: async () => {
      const [evaluationsRes, jobsRes] = await Promise.all([
        api.get('/job-evaluations'),
        api.get('/jobs?limit=1000')
      ]);
      
      const evaluations = evaluationsRes.data.evaluations || [];
      const jobs = jobsRes.data.jobs || [];
      
      // Join evaluations with job details
      return evaluations.map(evaluation => {
        const job = jobs.find(j => j.id === evaluation.job_id);
        return {
          ...evaluation,
          job: job || null
        };
      });
    }
  });

  // Fetch all employees for successor assignment
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-successors'],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      return response.data.employees || response.data || [];
    }
  });

  // Fetch successors for selected job
  const { data: successorsData } = useQuery({
    queryKey: ['job-successors', selectedJobForSuccessor],
    queryFn: async () => {
      if (!selectedJobForSuccessor) return [];
      const response = await api.get(`/job-successors/job/${selectedJobForSuccessor}`);
      return response.data.successors || [];
    },
    enabled: !!selectedJobForSuccessor
  });

  // Update criteria mutation
  const updateCriteriaMutation = useMutation({
    mutationFn: async ({ id, definition, weight }) => {
      const response = await api.put(`/job-criticality/${id}`, {
        definition,
        weight
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-criticality-criteria']);
      toast({
        title: 'Success',
        description: 'Criteria updated successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update criteria',
        variant: 'destructive'
      });
    }
  });

  // Assign successor mutation
  const assignSuccessorMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/job-successors', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-successors']);
      queryClient.invalidateQueries(['job-evaluations-with-jobs']);
      toast({
        title: 'Success',
        description: 'Successor assigned successfully!',
        variant: 'default'
      });
      setShowAssignSuccessorModal(false);
      setSuccessorForm({ employeeId: '', readinessLevel: '', notes: '' });
      setSelectedJobForSuccessor(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign successor',
        variant: 'destructive'
      });
    }
  });

  // Remove successor mutation
  const removeSuccessorMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/job-successors/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-successors']);
      toast({
        title: 'Success',
        description: 'Successor removed successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove successor',
        variant: 'destructive'
      });
    }
  });

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCriticalityBadge = (level) => {
    const variants = {
      High: { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' },
      Medium: { variant: 'default', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      Low: { variant: 'outline', className: 'bg-green-100 text-green-800 border-green-300' }
    };
    const config = variants[level] || variants.Low;
    return (
      <Badge className={config.className}>
        {level}
      </Badge>
    );
  };

  const handleEditCriteria = (criteriaId) => {
    const criterion = criteria.find(c => c.id === criteriaId);
    setEditingCriteria(criteriaId);
    setEditData({
      definition: criterion.definition || '',
      weight: parseFloat(criterion.weight || 0)
    });
    setIsEditing(true);
  };

  const handleSaveCriteria = (criteriaId) => {
    updateCriteriaMutation.mutate({
      id: criteriaId,
      definition: editData.definition,
      weight: editData.weight
    });
    setEditingCriteria(null);
    setIsEditing(false);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingCriteria(null);
    setIsEditing(false);
  };

  const handleDefinitionChange = (criteriaId, value) => {
    setEditData(prev => ({ ...prev, definition: value }));
  };

  const handleWeightChange = (criteriaId, value) => {
    const numeric = parseInt(value, 10);
    const weight = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
    setEditData(prev => ({ ...prev, weight }));
  };

  const getTotalWeight = () => {
    return criteria.reduce((total, c) => total + (parseFloat(c.weight || 0)), 0);
  };

  const getWeightStatus = () => {
    const total = getTotalWeight();
    if (total === 0) return { status: 'empty', message: 'No weights assigned' };
    if (total < 100) return { status: 'under', message: `Total weight: ${total.toFixed(1)}% (under 100%)` };
    if (total === 100) return { status: 'perfect', message: `Total weight: ${total.toFixed(1)}% (perfect!)` };
    return { status: 'over', message: `Total weight: ${total.toFixed(1)}% (over 100%)` };
  };

  const handleAssignSuccessor = (jobId) => {
    setSelectedJobForSuccessor(jobId);
    setShowAssignSuccessorModal(true);
  };

  const handleSaveSuccessor = () => {
    if (!successorForm.employeeId) {
      toast({
        title: 'Error',
        description: 'Please select an employee',
        variant: 'destructive'
      });
      return;
    }

    assignSuccessorMutation.mutate({
      jobId: selectedJobForSuccessor,
      employeeId: successorForm.employeeId,
      readinessLevel: successorForm.readinessLevel || null,
      notes: successorForm.notes || null
    });
  };

  // Filter evaluations by criticality and search
  const filteredEvaluations = (evaluationsData || []).filter(evaluation => {
    if (selectedCriticality !== 'all' && evaluation.criticality_level !== selectedCriticality) {
      return false;
    }
    if (searchTerm && evaluation.job) {
      const searchLower = searchTerm.toLowerCase();
      return (
        evaluation.job.title?.toLowerCase().includes(searchLower) ||
        evaluation.job.code?.toLowerCase().includes(searchLower) ||
        evaluation.job.department?.toLowerCase().includes(searchLower) ||
        evaluation.job.division?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Group evaluations by criticality
  const groupedEvaluations = {
    High: filteredEvaluations.filter(evaluation => evaluation.criticality_level === 'High'),
    Medium: filteredEvaluations.filter(evaluation => evaluation.criticality_level === 'Medium'),
    Low: filteredEvaluations.filter(evaluation => evaluation.criticality_level === 'Low')
  };

  // Filter employees for search
  const filteredEmployees = (employeesData || []).filter(emp => {
    if (!employeeSearchTerm) return true;
    const searchLower = employeeSearchTerm.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.sid?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.job_title?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 20); // Limit to 20 results

  const weightStatus = getWeightStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading criteria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Job Criticality</h1>
          <p className="text-gray-600 mt-2">
            Evaluate job criticality and manage succession planning
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="space-y-6">
                {/* Weight Status */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-6 w-6 text-gray-600" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Weight Distribution</h3>
                          <p className={`text-sm ${
                            weightStatus.status === 'perfect' ? 'text-green-600' :
                            weightStatus.status === 'under' ? 'text-yellow-600' :
                            weightStatus.status === 'over' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {weightStatus.message}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{getTotalWeight().toFixed(1)}%</div>
                        <div className="text-sm text-gray-500">Total Weight</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Criteria List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {criteria.map((criterion) => {
                    const IconComponent = iconMap[criterion.icon] || Target;
                    const isEditing = editingCriteria === criterion.id;
                    
                    return (
                      <Card key={criterion.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${getColorClasses(criterion.color).split(' ')[0]}`}>
                                <IconComponent className={`h-5 w-5 ${getColorClasses(criterion.color).split(' ')[1]}`} />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{criterion.name}</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getColorClasses(criterion.color)}`}>
                                    Weight: {(parseFloat(criterion.weight || 0)).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!isEditing ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditCriteria(criterion.id)}
                                  disabled={isEditing}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveCriteria(criterion.id)}
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          {isEditing ? (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`definition-${criterion.id}`}>Definition</Label>
                                <Textarea
                                  id={`definition-${criterion.id}`}
                                  value={editData.definition || ''}
                                  onChange={(e) => handleDefinitionChange(criterion.id, e.target.value)}
                                  placeholder="Enter the definition and description for this criteria..."
                                  className="mt-1"
                                  rows={4}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`weight-${criterion.id}`}>Weight (0-100)</Label>
                                <Input
                                  id={`weight-${criterion.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={editData.weight ?? 0}
                                  onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Enter a weight between 0 and 100 (e.g., 15 for 15%)
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Definition</h4>
                                {criterion.definition ? (
                                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                    {criterion.definition}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-400 italic">
                                    No definition provided. Click Edit to add one.
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700">Weight</h4>
                                  <p className="text-lg font-semibold text-gray-900">{(parseFloat(criterion.weight || 0)).toFixed(1)}%</p>
                                </div>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${getColorClasses(criterion.color).split(' ')[0]}`}
                                    style={{ width: `${parseFloat(criterion.weight || 0)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Instructions */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p>
                        <strong>1. Define Each Criteria:</strong> Click "Edit" on each criteria card to add a clear definition 
                        that explains what this criteria measures and how it should be evaluated.
                      </p>
                      <p>
                        <strong>2. Set Weights:</strong> Assign a weight percentage (0-100%) to each criteria based on its 
                        importance in determining job criticality. The total should ideally equal 100%.
                      </p>
                      <p>
                        <strong>3. Evaluate Jobs:</strong> Go to the "Job Evaluation" page to evaluate individual jobs using these criteria.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab 2: Results & Successors */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {evaluationsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading evaluations...</p>
                  </div>
                ) : (
                  <>
                    {/* Filters */}
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search jobs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={selectedCriticality === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCriticality('all')}
                        >
                          All ({filteredEvaluations.length})
                        </Button>
                        <Button
                          variant={selectedCriticality === 'High' ? 'default' : 'outline'}
                          size="sm"
                          className="bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => setSelectedCriticality('High')}
                        >
                          High ({groupedEvaluations.High.length})
                        </Button>
                        <Button
                          variant={selectedCriticality === 'Medium' ? 'default' : 'outline'}
                          size="sm"
                          className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          onClick={() => setSelectedCriticality('Medium')}
                        >
                          Medium ({groupedEvaluations.Medium.length})
                        </Button>
                        <Button
                          variant={selectedCriticality === 'Low' ? 'default' : 'outline'}
                          size="sm"
                          className="bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={() => setSelectedCriticality('Low')}
                        >
                          Low ({groupedEvaluations.Low.length})
                        </Button>
                      </div>
                    </div>

                    {/* Results by Criticality Level */}
                    {selectedCriticality === 'all' ? (
                      // Show all grouped by level
                      ['High', 'Medium', 'Low'].map(level => (
                        groupedEvaluations[level].length > 0 && (
                          <Card key={level} className="border-2">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getCriticalityBadge(level)}
                                  <CardTitle className="text-xl">
                                    {level} Criticality ({groupedEvaluations[level].length} jobs)
                                  </CardTitle>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                {groupedEvaluations[level].map(evaluation => (
                                  <JobEvaluationCard
                                    key={evaluation.id}
                                    evaluation={evaluation}
                                    onAssignSuccessor={handleAssignSuccessor}
                                    successors={successorsData || []}
                                    onRemoveSuccessor={removeSuccessorMutation.mutate}
                                  />
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )
                      ))
                    ) : (
                      // Show filtered results
                      filteredEvaluations.length > 0 ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              {selectedCriticality} Criticality Jobs ({filteredEvaluations.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                              {filteredEvaluations.map(evaluation => (
                                <JobEvaluationCard
                                  key={evaluation.id}
                                  evaluation={evaluation}
                                  onAssignSuccessor={handleAssignSuccessor}
                                  successors={successorsData || []}
                                  onRemoveSuccessor={removeSuccessorMutation.mutate}
                                />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="p-12 text-center">
                            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No evaluations found for the selected criteria</p>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Successor Modal */}
      {showAssignSuccessorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assign Successor</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowAssignSuccessorModal(false);
                  setSelectedJobForSuccessor(null);
                  setSuccessorForm({ employeeId: '', readinessLevel: '', notes: '' });
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Search */}
              <div>
                <Label>Search Employee</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, SID, email, or job title..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Employee List */}
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {filteredEmployees.length > 0 ? (
                  <div className="divide-y">
                    {filteredEmployees.map(emp => (
                      <div
                        key={emp.id}
                        className={`p-3 cursor-pointer hover:bg-gray-50 ${
                          successorForm.employeeId === emp.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => setSuccessorForm(prev => ({ ...prev, employeeId: emp.id }))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {emp.sid} • {emp.job_title || 'N/A'}
                            </p>
                            {emp.department && (
                              <p className="text-xs text-gray-500">{emp.department}</p>
                            )}
                          </div>
                          {successorForm.employeeId === emp.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {employeeSearchTerm ? 'No employees found' : 'Start typing to search employees'}
                  </div>
                )}
              </div>

              {/* Readiness Level */}
              <div>
                <Label>Readiness Level</Label>
                <select
                  value={successorForm.readinessLevel}
                  onChange={(e) => setSuccessorForm(prev => ({ ...prev, readinessLevel: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select readiness level</option>
                  <option value="Ready Now">Ready Now</option>
                  <option value="Ready in 1-2 years">Ready in 1-2 years</option>
                  <option value="Ready in 3+ years">Ready in 3+ years</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={successorForm.notes}
                  onChange={(e) => setSuccessorForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Current Successors */}
              {successorsData && successorsData.length > 0 && (
                <div>
                  <Label className="mb-2 block">Current Successors</Label>
                  <div className="space-y-2">
                    {successorsData.map(successor => (
                      <div key={successor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {successor.first_name} {successor.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {successor.readiness_level || 'No readiness level specified'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSuccessorMutation.mutate(successor.id)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveSuccessor}
                  disabled={!successorForm.employeeId || assignSuccessorMutation.isPending}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {assignSuccessorMutation.isPending ? 'Assigning...' : 'Assign Successor'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignSuccessorModal(false);
                    setSelectedJobForSuccessor(null);
                    setSuccessorForm({ employeeId: '', readinessLevel: '', notes: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Job Evaluation Card Component
const JobEvaluationCard = ({ evaluation, onAssignSuccessor, successors, onRemoveSuccessor }) => {
  const jobSuccessors = successors.filter(s => s.job_id === evaluation.job_id);
  
  const getBadge = (level) => {
    const variants = {
      High: 'bg-red-100 text-red-800 border-red-300',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Low: 'bg-green-100 text-green-800 border-green-300'
    };
    return (
      <Badge className={variants[level] || variants.Low}>
        {level}
      </Badge>
    );
  };
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">{evaluation.job?.title || 'Unknown Job'}</h3>
            </div>
            <p className="text-sm text-gray-600">{evaluation.job?.code || 'N/A'}</p>
            {evaluation.job?.department && (
              <p className="text-xs text-gray-500 mt-1">{evaluation.job.department}</p>
            )}
          </div>
          {getBadge(evaluation.criticality_level)}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div>
          <p className="text-xs text-gray-500">Weighted Score</p>
          <p className="text-lg font-semibold text-gray-900">{evaluation.weighted_score?.toFixed(1) || 'N/A'}</p>
        </div>
        
        {jobSuccessors.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Successors ({jobSuccessors.length})</p>
            <div className="space-y-1">
              {jobSuccessors.slice(0, 2).map(successor => (
                <div key={successor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <span className="text-gray-700">
                    {successor.first_name} {successor.last_name}
                  </span>
                  {successor.readiness_level && (
                    <Badge variant="outline" className="text-xs">
                      {successor.readiness_level}
                    </Badge>
                  )}
                </div>
              ))}
              {jobSuccessors.length > 2 && (
                <p className="text-xs text-gray-500">+{jobSuccessors.length - 2} more</p>
              )}
            </div>
          </div>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAssignSuccessor(evaluation.job_id)}
        >
          <UserPlus className="h-3 w-3 mr-1" />
          {jobSuccessors.length > 0 ? 'Manage Successors' : 'Assign Successor'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default JobCriticality;
