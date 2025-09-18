import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  X
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const Assessments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(''); // Search input for client-side filtering
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [showEditAssessment, setShowEditAssessment] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const searchInputRef = useRef(null);

  // No debouncing needed - client-side filtering is instant

  // Maintain focus after re-renders
  useEffect(() => {
    if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
      const wasSearching = searchInput.length > 0;
      if (wasSearching) {
        searchInputRef.current.focus();
      }
    }
  });

  // Fetch all assessments from API (no filtering on server side)
  const { data: assessmentsData, isLoading, error } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => api.get('/assessments?page=1&limit=1000').then(res => res.data),
    retry: 1,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch competencies for filtering
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => api.get('/competencies?page=1&limit=1000').then(res => res.data),
    retry: 1,
  });

  // Fetch competency levels
  const { data: levelsData } = useQuery({
    queryKey: ['competency-levels'],
    queryFn: () => api.get('/competency-levels').then(res => res.data),
    retry: 1,
  });

  const assessments = assessmentsData?.assessments || [];
  const competencies = competenciesData?.competencies || [];
  const levels = levelsData?.levels || [];

  // Client-side filtering for instant search
  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    
    let filtered = assessments;
    
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
    
    // Level filter
    if (selectedLevel) {
      filtered = filtered.filter(assessment => assessment.competency_level_id === selectedLevel);
    }
    
    return filtered;
  }, [assessments, searchInput, selectedCompetency, selectedLevel]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!assessments) return { total: 0, active: 0, byCompetency: {}, byLevel: {} };
    
    const total = assessments.length;
    const active = assessments.filter(a => a.isActive).length;
    
    const byCompetency = {};
    const byLevel = {};
    
    assessments.forEach(assessment => {
      byCompetency[assessment.competency_name] = (byCompetency[assessment.competency_name] || 0) + 1;
      byLevel[assessment.level_name] = (byLevel[assessment.level_name] || 0) + 1;
    });
    
    return { total, active, byCompetency, byLevel };
  }, [assessments]);

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: (id) => api.delete(`/assessments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments']);
      toast({
        title: "Success",
        description: "Assessment deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAssessment = (id) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      deleteAssessmentMutation.mutate(id);
    }
  };

  const handleEditAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    setShowEditAssessment(true);
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const getLevelColor = (level) => {
    const colorMap = {
      'BASIC': 'text-blue-600 bg-blue-100',
      'INTERMEDIATE': 'text-yellow-600 bg-yellow-100',
      'ADVANCED': 'text-orange-600 bg-orange-100',
      'MASTERY': 'text-purple-600 bg-purple-100'
    };
    return colorMap[level] || 'text-gray-600 bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
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
            <p className="text-gray-600 mt-2">Manage competency assessments and question banks</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => navigate('/question-bank')}
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
              <span>Add Assessment</span>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Competencies</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCompetency).length}</p>
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
                  <p className="text-sm font-medium text-gray-600">Levels Covered</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byLevel).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                id="search"
                key="search-input"
                placeholder="Search assessments by title, description, or competency..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Competency Filter */}
          <div className="md:w-64">
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Competencies</option>
              {competencies.map(competency => (
                <option key={competency.id} value={competency.id}>
                  {competency.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="md:w-48">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              {levels.map(level => (
                <option key={level.id} value={level.id}>
                  {level.level} - {level.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Assessments ({filteredAssessments.length})</h2>
        </div>

        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first assessment</p>
              <Button onClick={() => setShowAddAssessment(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{assessment.title}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 mb-3">
                        {assessment.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAssessment(assessment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssessment(assessment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Competency Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Competency</span>
                      <span className="text-sm text-gray-600">{assessment.competency_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Level</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(assessment.level_name)}`}>
                        {assessment.level_name}
                      </span>
                    </div>
                  </div>

                  {/* Assessment Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium">{assessment.question_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Time Limit:</span>
                      <span className="font-medium">
                        {assessment.time_limit ? `${assessment.time_limit} min` : 'No limit'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Passing Score:</span>
                      <span className="font-medium">{assessment.passing_score}%</span>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assessment.isActive)}`}>
                      {assessment.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/assessments/${assessment.id}/questions`)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/assessments/${assessment.id}/take`)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Take
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Assessment Modal - Placeholder */}
      {showAddAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Create New Assessment</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddAssessment(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Assessment creation form will be implemented here.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessments;
