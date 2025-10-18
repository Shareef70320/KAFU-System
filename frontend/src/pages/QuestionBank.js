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
  Target,
  Users,
  CheckCircle,
  AlertCircle,
  Play,
  Settings,
  X,
  FileText,
  Award,
  Clock,
  Upload,
  Download
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import CreateQuestionModal from '../components/CreateQuestionModal';
import EditQuestionModal from '../components/EditQuestionModal';

const QuestionBank = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(''); // Search input for client-side filtering
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showEditQuestion, setShowEditQuestion] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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

  // Fetch all questions from API (no filtering on server side)
  const { data: questionsData, isLoading, error } = useQuery({
    queryKey: ['questions'],
    queryFn: () => api.get('/questions?page=1&limit=1000').then(res => res.data),
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

  const questions = questionsData?.questions || [];
  const competencies = competenciesData?.competencies || [];
  
  // Extract competency levels from competencies data
  const levels = competencies.flatMap(comp => 
    comp.levels?.map(level => ({
      id: level.id,
      level: level.level
    })) || []
  ).filter((level, index, self) => 
    index === self.findIndex(l => l.level === level.level)
  );

  // Client-side filtering for instant search
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    
    let filtered = questions;
    
    // Search filter
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(question => 
        question.text?.toLowerCase().includes(searchLower) ||
        question.explanation?.toLowerCase().includes(searchLower) ||
        question.competency_name?.toLowerCase().includes(searchLower) ||
        question.level_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Competency filter
    if (selectedCompetency) {
      filtered = filtered.filter(question => question.competency_id === selectedCompetency);
    }
    
    // Level filter
    if (selectedLevel) {
      filtered = filtered.filter(question => question.competency_level_id === selectedLevel);
    }
    
    // Type filter
    if (selectedType) {
      filtered = filtered.filter(question => question.type === selectedType);
    }
    
    return filtered;
  }, [questions, searchInput, selectedCompetency, selectedLevel, selectedType]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!questions) return { total: 0, active: 0, byCompetency: {}, byLevel: {}, byType: {} };
    
    const total = questions.length;
    const active = questions.filter(q => q.isActive).length;
    
    const byCompetency = {};
    const byLevel = {};
    const byType = {};
    
    questions.forEach(question => {
      byCompetency[question.competency_name] = (byCompetency[question.competency_name] || 0) + 1;
      byLevel[question.level_name] = (byLevel[question.level_name] || 0) + 1;
      byType[question.type] = (byType[question.type] || 0) + 1;
    });
    
    return { total, active, byCompetency, byLevel, byType };
  }, [questions]);

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => api.delete(`/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    },
  });

  const handleDeleteQuestion = (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      deleteQuestionMutation.mutate(id);
    }
  };

  const handleEditQuestion = (question) => {
    setSelectedQuestion(question);
    setShowEditQuestion(true);
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

  const getTypeColor = (type) => {
    const colorMap = {
      'MULTIPLE_CHOICE': 'text-blue-600 bg-blue-100',
      'TRUE_FALSE': 'text-green-600 bg-green-100',
      'SHORT_ANSWER': 'text-orange-600 bg-orange-100',
      'ESSAY': 'text-purple-600 bg-purple-100'
    };
    return colorMap[type] || 'text-gray-600 bg-gray-100';
  };

  // CSV Template Download
  const downloadCsvTemplate = () => {
    const headers = [
      'text',
      'type',
      'competency_name',
      'competency_level', 
      'points',
      'explanation',
      'correct_answer',
      'option_1_text',
      'option_1_is_correct',
      'option_2_text',
      'option_2_is_correct',
      'option_3_text',
      'option_3_is_correct',
      'option_4_text',
      'option_4_is_correct'
    ];

    const sampleData = [
      [
        'What is the capital of France?',
        'MULTIPLE_CHOICE',
        'Communication',
        'BASIC',
        '2',
        'Paris is the capital and largest city of France.',
        '',
        'Paris',
        'true',
        'London',
        'false',
        'Berlin',
        'false',
        'Madrid',
        'false'
      ],
      [
        'The sun rises in the east.',
        'TRUE_FALSE',
        'Analytical Thinking',
        'INTERMEDIATE',
        '1',
        'The sun always rises in the east due to Earth rotation.',
        'true',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'questions_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Upload
  const handleCsvUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/questions/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Successfully uploaded ${result.count} questions`,
        });
        queryClient.invalidateQueries(['questions']);
        setShowCsvUpload(false);
        setCsvFile(null);
      } else {
        toast({
          title: 'Upload Failed',
          description: result.error || 'Failed to upload questions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getTypeLabel = (type) => {
    const labelMap = {
      'MULTIPLE_CHOICE': 'Multiple Choice',
      'TRUE_FALSE': 'True/False',
      'SHORT_ANSWER': 'Short Answer',
      'ESSAY': 'Essay'
    };
    return labelMap[type] || type;
  };

  // Bulk Delete
  const bulkDelete = async (mode) => {
    if (!window.confirm(mode === 'all' ? 'Delete ALL questions? This cannot be undone.' : 'Delete all FILTERED questions? This cannot be undone.')) return;
    try {
      const payload = mode === 'all' ? {} : {
        competencyId: selectedCompetency || undefined,
        competencyLevelId: selectedLevel || undefined,
        type: selectedType || undefined,
        search: searchInput || undefined,
      };
      await api.post('/questions/bulk-delete', payload);
      queryClient.invalidateQueries(['questions']);
      toast({ title: 'Deleted', description: mode === 'all' ? 'All questions deleted' : 'Filtered questions deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Could not delete questions', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load questions</p>
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
            <h1 className="text-3xl font-bold text-red-600">Question Bank</h1>
            <p className="text-gray-600 mt-2">Manage competency questions and assessment content</p>
          </div>
          <div className="flex space-x-3 items-center">
            <Button
              onClick={() => navigate('/assessments')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Target className="h-4 w-4" />
              <span>Assessments</span>
            </Button>
            <Button
              onClick={() => setShowAddQuestion(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question</span>
            </Button>
            
            <Button
              onClick={downloadCsvTemplate}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Template</span>
            </Button>
            
            <Button
              onClick={() => setShowCsvUpload(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload CSV</span>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Questions</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Questions</p>
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
                  <Award className="h-6 w-6 text-orange-600" />
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
                placeholder="Search questions by text, explanation, competency, or level..."
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
                  {level.level}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="md:w-48">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="TRUE_FALSE">True/False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="ESSAY">Essay</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Questions ({filteredQuestions.length})</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => bulkDelete('filtered')} className="text-red-600 border-red-200 hover:bg-red-50">Delete Filtered</Button>
            <Button variant="outline" onClick={() => bulkDelete('all')} className="text-red-700 border-red-300 hover:bg-red-100">Delete All</Button>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first question</p>
              <Button onClick={() => setShowAddQuestion(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <Card key={question.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 line-clamp-2">{question.text}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 mb-3">
                        {question.explanation || 'No explanation provided'}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Question Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Competency Info */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Competency</span>
                        <span className="text-sm text-gray-600">{question.competency_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Level</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(question.level_name)}`}>
                          {question.level_name}
                        </span>
                      </div>
                    </div>

                    {/* Question Type & Points */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Type</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(question.type)}`}>
                          {getTypeLabel(question.type)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Points</span>
                        <span className="text-sm font-medium">{question.points}</span>
                      </div>
                    </div>

                    {/* Options & Status */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Options</span>
                        <span className="text-sm font-medium">{question.option_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Status</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(question.isActive)}`}>
                          {question.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Preview */}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Question Preview:</span> {question.text.length > 150 ? `${question.text.substring(0, 150)}...` : question.text}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddQuestion && (
        <CreateQuestionModal
          isOpen={showAddQuestion}
          onClose={() => setShowAddQuestion(false)}
          competencies={competencies}
          levels={levels}
          onSuccess={() => {
            setShowAddQuestion(false);
            queryClient.invalidateQueries(['questions']);
          }}
        />
      )}

      {/* Edit Question Modal */}
      {showEditQuestion && (
        <EditQuestionModal
          isOpen={showEditQuestion}
          onClose={() => setShowEditQuestion(false)}
          question={selectedQuestion}
          competencies={competencies}
          levels={levels}
          onSuccess={() => {
            setShowEditQuestion(false);
            setSelectedQuestion(null);
            queryClient.invalidateQueries(['questions']);
          }}
        />
      )}

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Upload Questions CSV</h2>
                <p className="text-sm text-gray-600 mt-1">Upload questions from a CSV file</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCsvUpload(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile" className="text-sm font-medium">
                  Select CSV File *
                </Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={isUploading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Download the template first to see the required format
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCsvUpload(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={downloadCsvTemplate}
                  variant="outline"
                  disabled={isUploading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {isUploading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
