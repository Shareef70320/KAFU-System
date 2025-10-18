import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Eye,
  Target,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Play,
  Settings,
  X,
  Shuffle,
  RotateCcw,
  Timer,
  BarChart3,
  EyeOff,
  EyeOn
} from 'lucide-react';

const NewAssessments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for search and filters
  const [searchInput, setSearchInput] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [showEditAssessment, setShowEditAssessment] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  // Create form state for question selection
  const [newAssessmentCompetencyId, setNewAssessmentCompetencyId] = useState('');
  // Simplified creation options
  const [numQuestions, setNumQuestions] = useState(10);
  const [applyToAll, setApplyToAll] = useState(false);

  // Edit modal local state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCompetencyId, setEditCompetencyId] = useState('');
  const [editApplyToAll, setEditApplyToAll] = useState(false);
  const [editNumQuestions, setEditNumQuestions] = useState(10);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editShuffleQuestions, setEditShuffleQuestions] = useState(true);
  const [editAllowMultipleAttempts, setEditAllowMultipleAttempts] = useState(true);
  const [editMaxAttempts, setEditMaxAttempts] = useState(3);
  const [editShowTimer, setEditShowTimer] = useState(true);
  const [editTimeLimitMinutes, setEditTimeLimitMinutes] = useState(30);
  const [editForceTimeLimit, setEditForceTimeLimit] = useState(false);
  const [editShowDashboard, setEditShowDashboard] = useState(true);
  const [editShowCorrectAnswers, setEditShowCorrectAnswers] = useState(true);
  const [editShowIncorrectAnswers, setEditShowIncorrectAnswers] = useState(true);

  // Fetch assessments from API
  const { data: assessmentsData, isLoading, error } = useQuery({
    queryKey: ['new-assessments'],
    queryFn: () => api.get('/assessments?page=1&limit=1000').then(res => res.data),
    retry: 1,
    keepPreviousData: false,
    staleTime: 0,
  });

  // Fetch competencies for filtering and selection
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => api.get('/competencies?page=1&limit=1000').then(res => res.data),
    retry: 1,
  });

  // Client-side filtering with useMemo
  const filteredAssessments = useMemo(() => {
    if (!assessmentsData?.assessments) return [];
    
    let filtered = assessmentsData.assessments;
    
    // Search filter
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(assessment => 
        assessment.title?.toLowerCase().includes(searchLower) ||
        assessment.description?.toLowerCase().includes(searchLower) ||
        assessment.competency_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Competency filter
    if (selectedCompetency) {
      filtered = filtered.filter(assessment => assessment.competency_id === selectedCompetency);
    }
    
    return filtered;
  }, [assessmentsData?.assessments, searchInput, selectedCompetency]);

  const assessments = assessmentsData?.assessments || [];
  const competencies = competenciesData?.competencies || [];

  // No manual question fetching/selection in simplified flow

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (assessmentData) => {
      const response = await api.post('/assessments', assessmentData);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['new-assessments'] });
      await queryClient.refetchQueries({ queryKey: ['new-assessments'], type: 'active' });
      toast({
        title: 'Success',
        description: 'Assessment created successfully!',
        variant: 'default'
      });
      setShowAddAssessment(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create assessment',
        variant: 'destructive'
      });
    }
  });

  // Update assessment mutation
  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/assessments/${id}`, data);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['new-assessments'] });
      await queryClient.refetchQueries({ queryKey: ['new-assessments'], type: 'active' });
      toast({
        title: 'Updated',
        description: 'Assessment updated successfully!',
        variant: 'default'
      });
      setShowEditAssessment(false);
      setSelectedAssessment(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update assessment',
        variant: 'destructive'
      });
    }
  });

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId) => {
      await api.delete(`/assessments/${assessmentId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['new-assessments'] });
      await queryClient.refetchQueries({ queryKey: ['new-assessments'], type: 'active' });
      toast({
        title: 'Success',
        description: 'Assessment deleted successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete assessment',
        variant: 'destructive'
      });
    }
  });

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('name');
    const description = formData.get('description');
    const selectedCompetencyId = formData.get('competencyId') || '';
    const payload = {
      title,
      description,
      competencyId: applyToAll ? null : (selectedCompetencyId || null),
      numberOfQuestions: Number.isFinite(numQuestions) ? numQuestions : 10,
      shuffleQuestions: formData.get('shuffleQuestions') === 'on',
      allowMultipleAttempts: formData.get('allowMultipleAttempts') === 'on',
      maxAttempts: parseInt(formData.get('maxAttempts')) || null,
      showTimer: formData.get('showTimer') === 'on',
      timeLimit: parseInt(formData.get('timeLimitMinutes')) || null,
      forceTimeLimit: formData.get('forceTimeLimit') === 'on',
      showDashboard: formData.get('showDashboard') === 'on',
      showCorrectAnswers: formData.get('showCorrectAnswers') === 'on',
      showIncorrectAnswers: formData.get('showIncorrectAnswers') === 'on',
      isActive: formData.get('isActive') === 'on'
    };

    await createAssessmentMutation.mutateAsync(payload);
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      await deleteAssessmentMutation.mutateAsync(assessmentId);
    }
  };

  const handleEditAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    // Seed edit state
    setEditName(assessment.title || assessment.name || '');
    setEditDescription(assessment.description || '');
    setEditCompetencyId(assessment.competencyId || assessment.competency_id || '');
    setEditApplyToAll(Boolean(assessment.applyToAll ?? assessment.apply_to_all ?? (assessment.competencyId === null)));
    setEditNumQuestions(assessment.numberOfQuestions ?? assessment.num_questions ?? 10);
    setEditIsActive(Boolean(assessment.isActive ?? assessment.is_active ?? true));
    setEditShuffleQuestions(Boolean(assessment.shuffleQuestions ?? assessment.shuffle_questions ?? true));
    setEditAllowMultipleAttempts(Boolean(assessment.allowMultipleAttempts ?? assessment.allow_multiple_attempts ?? true));
    setEditMaxAttempts(assessment.maxAttempts ?? assessment.max_attempts ?? 3);
    setEditShowTimer(Boolean(assessment.showTimer ?? assessment.show_timer ?? true));
    setEditTimeLimitMinutes(assessment.timeLimit ?? assessment.time_limit ?? 30);
    setEditForceTimeLimit(Boolean(assessment.forceTimeLimit ?? assessment.force_time_limit ?? false));
    setEditShowDashboard(Boolean(assessment.showDashboard ?? assessment.show_dashboard ?? true));
    setEditShowCorrectAnswers(Boolean(assessment.showCorrectAnswers ?? assessment.show_correct_answers ?? true));
    setEditShowIncorrectAnswers(Boolean(assessment.showIncorrectAnswers ?? assessment.show_incorrect_answers ?? true));
    setShowEditAssessment(true);
  };

  // View questions removed in simplified flow

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load assessments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Management</h1>
            <p className="text-gray-600 mt-2">Create and manage competency assessments</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => window.open('/question-bank', '_blank')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <BookOpen className="h-4 w-4" />
              <span>Question Bank</span>
            </Button>
            <Button
              onClick={() => setShowAddAssessment(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Assessment</span>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Assessments</p>
                  <p className="text-2xl font-semibold text-gray-900">{assessments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Assessments</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {assessments.filter(a => a.isActive ?? a.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Competencies</p>
                  <p className="text-2xl font-semibold text-gray-900">{competencies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Questions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {assessments.reduce((sum, a) => sum + (a.questionCount ?? a.question_count ?? 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search Assessments</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name, description, or competency..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="competency">Competency</Label>
                <select
                  id="competency"
                  value={selectedCompetency}
                  onChange={(e) => setSelectedCompetency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">All Competencies</option>
                  {competencies.map(competency => (
                    <option key={competency.id} value={competency.id}>
                      {competency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first assessment.</p>
              <Button onClick={() => setShowAddAssessment(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{assessment.title}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (assessment.isActive ?? assessment.is_active) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(assessment.isActive ?? assessment.is_active) ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {assessment.numberOfQuestions ?? assessment.num_questions ?? assessment.questionCount ?? assessment.question_count ?? 0} Questions
                        </span>
                      </div>
                      {assessment.description && (
                        <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Target className="h-3 w-3 mr-1" />
                          {assessment.competency_name}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {assessment.timeLimit ?? assessment.time_limit ?? 0} min
                        </span>
                        <span className="flex items-center">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {assessment.maxAttempts ?? assessment.max_attempts ?? 0} attempts
                        </span>
                        {assessment.shuffle_questions && (
                          <span className="flex items-center">
                            <Shuffle className="h-3 w-3 mr-1" />
                            Shuffled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* View questions action removed in simplified flow */}
                    <button 
                      onClick={() => handleEditAssessment(assessment)}
                      className="text-gray-400 hover:text-green-600" 
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAssessment(assessment.id)}
                      className="text-gray-400 hover:text-red-600" 
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Create Assessment Modal */}
      {showAddAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-blue-600" />
                  Create New Assessment
                </span>
                <button 
                  onClick={() => setShowAddAssessment(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAssessment} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-600">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Assessment Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Enter assessment name"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="competencyId" className="mr-4">Competency {applyToAll ? '' : '*'} </Label>
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            id="applyToAllTop"
                            checked={applyToAll}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setApplyToAll(checked);
                              if (checked) {
                                setNewAssessmentCompetencyId('');
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>Apply to All Competencies</span>
                        </label>
                      </div>
                      <select
                        id="competencyId"
                        name="competencyId"
                        value={newAssessmentCompetencyId}
                        required={!applyToAll}
                        disabled={applyToAll}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${applyToAll ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                        onChange={(e) => {
                          setNewAssessmentCompetencyId(e.target.value);
                        }}
                      >
                        <option value="">Select Competency</option>
                        {competencies.map(competency => (
                          <option key={competency.id} value={competency.id}>
                            {competency.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter assessment description"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Assessment Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assessment Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="numQuestions">Number of Questions</Label>
                      <Input
                        id="numQuestions"
                        name="numQuestions"
                        type="number"
                        min="1"
                        max="100"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Randomly selected from the question bank.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="shuffleQuestions"
                          name="shuffleQuestions"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="shuffleQuestions" className="flex items-center">
                          <Shuffle className="h-4 w-4 mr-1" />
                          Shuffle Questions
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowMultipleAttempts"
                          name="allowMultipleAttempts"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="allowMultipleAttempts" className="flex items-center">
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Allow Multiple Attempts
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="showTimer"
                          name="showTimer"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="showTimer" className="flex items-center">
                          <Timer className="h-4 w-4 mr-1" />
                          Show Timer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="forceTimeLimit"
                          name="forceTimeLimit"
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="forceTimeLimit" className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Force Time Limit
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="applyToAll"
                          name="applyToAll"
                          checked={applyToAll}
                          onChange={(e) => setApplyToAll(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="applyToAll" className="flex items-center">
                          Apply to All Competencies
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="showDashboard"
                          name="showDashboard"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="showDashboard" className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Show Dashboard
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="showCorrectAnswers"
                          name="showCorrectAnswers"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="showCorrectAnswers" className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Show Correct Answers
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="showIncorrectAnswers"
                          name="showIncorrectAnswers"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="showIncorrectAnswers" className="flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Show Incorrect Answers
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          defaultChecked
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="isActive" className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Active Assessment
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="maxAttempts">Max Attempts</Label>
                      <Input
                        id="maxAttempts"
                        name="maxAttempts"
                        type="number"
                        min="1"
                        max="10"
                        defaultValue="3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeLimitMinutes">Time Limit (minutes)</Label>
                      <Input
                        id="timeLimitMinutes"
                        name="timeLimitMinutes"
                        type="number"
                        min="5"
                        max="180"
                        defaultValue="30"
                      />
                    </div>
                  </div>
                </div>

                {/* Simplified selection: number only */}

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddAssessment(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssessmentMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createAssessmentMutation.isPending ? 'Creating...' : 'Create Assessment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {showEditAssessment && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Edit className="h-5 w-5 mr-2 text-green-600" />
                  Edit Assessment
                </span>
                <button
                  onClick={() => { setShowEditAssessment(false); setSelectedAssessment(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = {
                    title: editName,
                    description: editDescription,
                    competencyId: editApplyToAll ? null : editCompetencyId,
                    isActive: editIsActive,
                    shuffleQuestions: editShuffleQuestions,
                    allowMultipleAttempts: editAllowMultipleAttempts,
                    maxAttempts: editMaxAttempts,
                    showTimer: editShowTimer,
                    timeLimit: editTimeLimitMinutes,
                    forceTimeLimit: editForceTimeLimit,
                    showDashboard: editShowDashboard,
                    showCorrectAnswers: editShowCorrectAnswers,
                    showIncorrectAnswers: editShowIncorrectAnswers,
                    numberOfQuestions: editNumQuestions,
                    applyToAll: editApplyToAll,
                  };
                  updateAssessmentMutation.mutate({ id: selectedAssessment.id, data });
                }}
                className="space-y-6"
              >
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editName">Assessment Name *</Label>
                      <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="editCompetencyId" className="mr-4">Competency {editApplyToAll ? '' : '*'} </Label>
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            id="editApplyToAll"
                            checked={editApplyToAll}
                            onChange={(e) => { setEditApplyToAll(e.target.checked); if (e.target.checked) setEditCompetencyId(''); }}
                            className="rounded border-gray-300"
                          />
                          <span>Apply to All Competencies</span>
                        </label>
                      </div>
                      <select
                        id="editCompetencyId"
                        value={editCompetencyId}
                        onChange={(e) => setEditCompetencyId(e.target.value)}
                        required={!editApplyToAll}
                        disabled={editApplyToAll}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${editApplyToAll ? 'bg-gray-100 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                      >
                        <option value="">Select Competency</option>
                        {competencies.map(competency => (
                          <option key={competency.id} value={competency.id}>{competency.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea id="editDescription" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assessment Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="editNumQuestions">Number of Questions</Label>
                      <Input id="editNumQuestions" type="number" min="1" max="100" value={editNumQuestions} onChange={(e) => setEditNumQuestions(parseInt(e.target.value) || 1)} className="mt-1" />
                      <p className="text-xs text-gray-500 mt-1">Randomly selected from the question bank.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editShuffleQuestions" checked={editShuffleQuestions} onChange={(e) => setEditShuffleQuestions(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editShuffleQuestions">Shuffle Questions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editAllowMultipleAttempts" checked={editAllowMultipleAttempts} onChange={(e) => setEditAllowMultipleAttempts(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editAllowMultipleAttempts">Allow Multiple Attempts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editShowTimer" checked={editShowTimer} onChange={(e) => setEditShowTimer(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editShowTimer">Show Timer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editForceTimeLimit" checked={editForceTimeLimit} onChange={(e) => setEditForceTimeLimit(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editForceTimeLimit">Force Time Limit</Label>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editShowDashboard" checked={editShowDashboard} onChange={(e) => setEditShowDashboard(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editShowDashboard">Show Dashboard</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editShowCorrectAnswers" checked={editShowCorrectAnswers} onChange={(e) => setEditShowCorrectAnswers(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editShowCorrectAnswers">Show Correct Answers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editShowIncorrectAnswers" checked={editShowIncorrectAnswers} onChange={(e) => setEditShowIncorrectAnswers(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editShowIncorrectAnswers">Show Incorrect Answers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="editIsActive" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="rounded border-gray-300" />
                        <Label htmlFor="editIsActive">Active Assessment</Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="editMaxAttempts">Max Attempts</Label>
                      <Input id="editMaxAttempts" type="number" min="1" max="10" value={editMaxAttempts} onChange={(e) => setEditMaxAttempts(parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label htmlFor="editTimeLimitMinutes">Time Limit (minutes)</Label>
                      <Input id="editTimeLimitMinutes" type="number" min="5" max="180" value={editTimeLimitMinutes} onChange={(e) => setEditTimeLimitMinutes(parseInt(e.target.value) || 5)} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowEditAssessment(false); setSelectedAssessment(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateAssessmentMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    {updateAssessmentMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NewAssessments;
