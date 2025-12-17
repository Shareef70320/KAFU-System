import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import {
  Target, 
  AlertTriangle,
  Shield,
  DollarSign,
  UserCheck,
  Users,
  Search,
  Edit,
  Save,
  X,
  BarChart3,
  TrendingUp,
  Briefcase,
  CheckCircle,
  Clock,
  UserPlus
} from 'lucide-react';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmployeePhoto from '../components/EmployeePhoto';

const JobEvaluation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tabs
  const [activeTab, setActiveTab] = useState('evaluate'); // 'evaluate' | 'results'

  // Evaluate tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [evaluations, setEvaluations] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Results tab state
  const [resultsSearchTerm, setResultsSearchTerm] = useState('');
  const [selectedCriticality, setSelectedCriticality] = useState('all'); // 'all', 'High', 'Medium', 'Low'
  const [selectedJobForSuccessor, setSelectedJobForSuccessor] = useState(null);
  const [showAssignSuccessorModal, setShowAssignSuccessorModal] = useState(false);
  const [successorForm, setSuccessorForm] = useState({ employeeIds: [], readinessLevel: '', notes: '' });
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

  // Fetch criteria from Job Criticality page
  const { data: criteriaData } = useQuery({
    queryKey: ['job-criticality-criteria'],
    queryFn: async () => {
      const response = await api.get('/job-criticality');
      return response.data.criteria;
    }
  });

  const criteria = criteriaData || [];

  // Fetch existing evaluations
  const { data: evaluationsData, isLoading: evaluationsLoading } = useQuery({
    queryKey: ['job-evaluations'],
    queryFn: async () => {
      const response = await api.get('/job-evaluations');
      return response.data.evaluations || [];
    }
  });

  // Convert evaluations data to the format expected by the Evaluate tab
  React.useEffect(() => {
    if (evaluationsData && Array.isArray(evaluationsData)) {
      const evaluationsMap = {};
      evaluationsData.forEach(evaluation => {
        // Prisma returns camelCase fields based on the JobEvaluation model
        const jobId = evaluation.jobId || evaluation.job_id;
        if (!jobId) return;

        const weightedScore = evaluation.weightedScore ?? evaluation.weighted_score ?? 0;
        const criticalityLabel = getScoreLabel(weightedScore);

        evaluationsMap[jobId] = {
          1: evaluation.decisionMakingPower ?? evaluation.decision_making_power,
          2: evaluation.riskOfAbsence ?? evaluation.risk_of_absence,
          3: evaluation.regulatoryResponsibility ?? evaluation.regulatory_responsibility,
          4: evaluation.revenueBudgetImpact ?? evaluation.revenue_budget_impact,
          5: evaluation.talentScarcity ?? evaluation.talent_scarcity,
          6: evaluation.numberOfReportees ?? evaluation.number_of_reportees,
          criticality_level: criticalityLabel,
          weighted_score: weightedScore
        };
      });
      setEvaluations(evaluationsMap);
    }
  }, [evaluationsData]);

  // Fetch jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs-evaluation'],
    queryFn: async () => {
      const response = await api.get('/jobs?limit=1000');
      return response.data;
    }
  });

  const jobs = jobsData?.jobs || [];

  // Join evaluations with job details for Results tab
  const evaluationsWithJobs = React.useMemo(() => {
    if (!evaluationsData || !Array.isArray(evaluationsData)) return [];
    return evaluationsData.map(evaluation => {
      const jobId = evaluation.jobId || evaluation.job_id;
      const job = jobs.find(j => j.id === jobId);
      return { ...evaluation, job: job || null };
    });
  }, [evaluationsData, jobs]);

  // Filter jobs based on search (Evaluate tab)
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.division?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getScoreColor = (score) => {
    if (score >= 370) return 'text-red-600 bg-red-100';
    if (score > 250) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getScoreLabel = (score) => {
    if (score >= 370) return 'High';
    if (score > 250) return 'Medium';
    return 'Low';
  };

  const calculateWeightedScore = (jobId) => {
    const evaluation = evaluations[jobId];
    if (!evaluation) return 0;

    let totalScore = 0;

    criteria.forEach(criterion => {
      const rating = evaluation[criterion.id] || 0;
      const weight = parseFloat(criterion.weight) || 0; // Ensure weight is parsed as float
      totalScore += (rating * weight);
    });

    return Math.round(totalScore * 100) / 100;
  };

  const handleRatingChange = (jobId, criterionId, value) => {
    const numValue = parseInt(value) || 0;
    const criterion = criteria.find(c => c.id === criterionId);
    
    if (numValue < criterion.min_rating || numValue > criterion.max_rating) {
      toast({
        title: 'Invalid Rating',
        description: `Rating must be between ${criterion.min_rating} and ${criterion.max_rating}`,
        variant: 'destructive'
      });
      return;
    }

    setEvaluations(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [criterionId]: numValue
      }
    }));
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setIsEditing(true);
  };

  const handleSaveEvaluation = async () => {
    if (selectedJob) {
      try {
        const evaluation = evaluations[selectedJob.id];
        if (!evaluation) {
          toast({
            title: 'Error',
            description: 'No evaluation data to save',
            variant: 'destructive'
          });
          return;
        }

        const response = await api.post('/job-evaluations', {
          jobId: selectedJob.id,
          evaluatorId: 'EMP2778', // Default evaluator for job evaluations
          decisionMakingPower: evaluation[1] || 0,
          riskOfAbsence: evaluation[2] || 0,
          regulatoryResponsibility: evaluation[3] || 0,
          revenueBudgetImpact: evaluation[4] || 0,
          talentScarcity: evaluation[5] || 0,
          numberOfReportees: evaluation[6] || 0
        });

        if (response.data.success) {
          // Refresh evaluations so Results & Successors tab reflects the latest data immediately
          await queryClient.invalidateQueries(['job-evaluations']);

          toast({
            title: 'Success',
            description: `Evaluation saved for ${selectedJob.title}`,
            variant: 'default'
          });
          setIsEditing(false);
          setSelectedJob(null);
        }
      } catch (error) {
        console.error('Error saving evaluation:', error);
        toast({
          title: 'Error',
          description: 'Failed to save evaluation',
          variant: 'destructive'
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedJob(null);
  };

  // --- Results & Successors helpers ---

  const getCriticalityBadge = (level) => {
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

  // Assign successor mutation
  const assignSuccessorMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/job-successors', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-successors']);
      queryClient.invalidateQueries(['job-evaluations']);
      toast({
        title: 'Success',
        description: 'Successor(s) assigned successfully!',
        variant: 'default'
      });
      setShowAssignSuccessorModal(false);
      setSuccessorForm({ employeeIds: [], readinessLevel: '', notes: '' });
      setSelectedJobForSuccessor(null);
    },
    onError: (error) => {
      console.error('Error assigning successor:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to assign successor';
      toast({
        title: 'Error',
        description: errorMessage,
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
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove successor',
        variant: 'destructive'
      });
    }
  });

  const handleAssignSuccessor = (jobId) => {
    setSelectedJobForSuccessor(jobId);
    setShowAssignSuccessorModal(true);
  };

  const handleSaveSuccessor = () => {
    if (!successorForm.employeeIds || successorForm.employeeIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one employee',
        variant: 'destructive'
      });
      return;
    }

    assignSuccessorMutation.mutate({
      jobId: selectedJobForSuccessor,
      employeeIds: successorForm.employeeIds,
      readinessLevel: successorForm.readinessLevel || null,
      notes: successorForm.notes || null
    });
  };

  // Base evaluations filtered only by search term (Results tab)
  const searchedEvaluations = React.useMemo(() => {
    if (!evaluationsWithJobs) return [];
    if (!resultsSearchTerm) return evaluationsWithJobs;
    const searchLower = resultsSearchTerm.toLowerCase();
    return evaluationsWithJobs.filter((evaluation) => {
      const job = evaluation.job;
      if (!job) return false;
      return (
        job.title?.toLowerCase().includes(searchLower) ||
        job.code?.toLowerCase().includes(searchLower) ||
        job.department?.toLowerCase().includes(searchLower) ||
        job.division?.toLowerCase().includes(searchLower)
      );
    });
  }, [evaluationsWithJobs, resultsSearchTerm]);

  // Counts per level based on searched evaluations (independent of selectedCriticality)
  const resultsCounts = React.useMemo(() => {
    const totals = { all: 0, High: 0, Medium: 0, Low: 0 };
    if (!searchedEvaluations) return totals;

    searchedEvaluations.forEach((evaluation) => {
      const score = evaluation.weightedScore ?? evaluation.weighted_score ?? 0;
      const level = getScoreLabel(score);
      totals.all += 1;
      if (level === 'High') totals.High += 1;
      else if (level === 'Medium') totals.Medium += 1;
      else totals.Low += 1;
    });

    return totals;
  }, [searchedEvaluations]);

  // Final filtered evaluations based on selected criticality
  const filteredEvaluations = searchedEvaluations.filter((evaluation) => {
    const score = evaluation.weightedScore ?? evaluation.weighted_score ?? 0;
    const level = getScoreLabel(score);
    if (selectedCriticality === 'all') return true;
    return level === selectedCriticality;
  });

  const groupedEvaluations = {
    High: filteredEvaluations.filter(
      (evaluation) => getScoreLabel(evaluation.weightedScore ?? evaluation.weighted_score ?? 0) === 'High'
    ),
    Medium: filteredEvaluations.filter(
      (evaluation) => getScoreLabel(evaluation.weightedScore ?? evaluation.weighted_score ?? 0) === 'Medium'
    ),
    Low: filteredEvaluations.filter(
      (evaluation) => getScoreLabel(evaluation.weightedScore ?? evaluation.weighted_score ?? 0) === 'Low'
    ),
  };

  // Filter employees for search (Results tab)
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
  }).slice(0, 20);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-600">Job Evaluation & Succession Planning</h1>
          <p className="text-gray-600 mt-2">
            Evaluate jobs using criticality criteria, then review results and assign successors.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('evaluate')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'evaluate'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Job Evaluation
                </div>
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'results'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Results & Successors
                  {evaluationsWithJobs && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {evaluationsWithJobs.length}
                    </Badge>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Tab 1: Evaluate Jobs */}
            {activeTab === 'evaluate' && (
              <>
                {/* Search */}
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search jobs by title, code, department, or division..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Jobs List */}
                <div className="space-y-4">
                  {filteredJobs.map((job) => {
            const evaluation = evaluations[job.id];
            const weightedScore = calculateWeightedScore(job.id);
            const scoreLabel = evaluation?.criticality_level || getScoreLabel(weightedScore);
            const scoreColor = getScoreColor(weightedScore);

                    return (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {job.code}
                          </span>
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${scoreColor}`}>
                            {scoreLabel} ({weightedScore})
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {job.department && (
                            <span>{job.department}</span>
                          )}
                          {job.division && (
                            <span>• {job.division}</span>
                          )}
                          {job.location && (
                            <span>• {job.location}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditJob(job)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Evaluate
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {criteria.map((criterion) => {
                      const IconComponent = iconMap[criterion.icon] || Target;
                      const rating = evaluations[job.id]?.[criterion.id] || 0;
                      
                      return (
                        <div key={criterion.id} className="text-center">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${getColorClasses(criterion.color).split(' ')[0]}`}>
                            <IconComponent className={`h-5 w-5 ${getColorClasses(criterion.color).split(' ')[1]}`} />
                          </div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">{criterion.name}</h4>
                          <div className="text-lg font-bold text-gray-900">{rating}</div>
                          <div className="text-xs text-gray-500">{criterion.min_rating}-{criterion.max_rating}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
                    );
                  })}
                </div>

                {/* No Results */}
                {filteredJobs.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Found</h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Try adjusting your search criteria' : 'No jobs available for evaluation'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
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
                            value={resultsSearchTerm}
                            onChange={(e) => setResultsSearchTerm(e.target.value)}
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
                          All ({resultsCounts.all})
                        </Button>
                        <Button
                          variant={selectedCriticality === 'High' ? 'default' : 'outline'}
                          size="sm"
                          className="bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => setSelectedCriticality('High')}
                        >
                          High ({resultsCounts.High})
                        </Button>
                        <Button
                          variant={selectedCriticality === 'Medium' ? 'default' : 'outline'}
                          size="sm"
                          className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          onClick={() => setSelectedCriticality('Medium')}
                        >
                          Medium ({resultsCounts.Medium})
                        </Button>
                        <Button
                          variant={selectedCriticality === 'Low' ? 'default' : 'outline'}
                          size="sm"
                          className="bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={() => setSelectedCriticality('Low')}
                        >
                          Low ({resultsCounts.Low})
                        </Button>
                      </div>
                    </div>

                    {/* Results by Criticality Level */}
                    {selectedCriticality === 'all' ? (
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
                                  <JobEvaluationResultCard
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
                                <JobEvaluationResultCard
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

        {/* Evaluation Modal */}
        {isEditing && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-red-600">
                  Evaluate: {selectedJob.title} ({selectedJob.code})
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {criteria.map((criterion) => {
                    const IconComponent = iconMap[criterion.icon] || Target;
                    const rating = evaluations[selectedJob.id]?.[criterion.id] || 0;
                    
                    return (
                      <div key={criterion.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`p-2 rounded-lg ${getColorClasses(criterion.color).split(' ')[0]}`}>
                            <IconComponent className={`h-5 w-5 ${getColorClasses(criterion.color).split(' ')[1]}`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{criterion.name}</h4>
                            <p className="text-sm text-gray-500">Rate from {criterion.min_rating} to {criterion.max_rating}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`rating-${criterion.id}`}>Rating</Label>
                          <Input
                            id={`rating-${criterion.id}`}
                            type="number"
                            min={criterion.min_rating}
                            max={criterion.max_rating}
                            value={rating}
                            onChange={(e) => handleRatingChange(selectedJob.id, criterion.id, e.target.value)}
                            className="text-center text-lg font-semibold"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{criterion.min_rating}</span>
                            <span>{criterion.max_rating}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Score Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Weighted Score</h4>
                      <p className="text-sm text-gray-500">Sum of (Rating × Weight) for all criteria</p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex px-3 py-1 text-lg font-bold rounded-full ${getScoreColor(calculateWeightedScore(selectedJob.id))}`}>
                        {calculateWeightedScore(selectedJob.id)} - {evaluations[selectedJob.id]?.criticality_level || getScoreLabel(calculateWeightedScore(selectedJob.id))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Calculation Details */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {criteria.map(criterion => {
                      const rating = evaluations[selectedJob.id]?.[criterion.id] || 0;
                      const contribution = rating * criterion.weight;
                      return (
                        <div key={criterion.id} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="text-gray-600">{criterion.name}:</span>
                          <span className="font-medium">{rating} × {criterion.weight} = {contribution}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 p-6 border-t">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEvaluation}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Evaluation
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Successor Modal */}
      {showAssignSuccessorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assign Successor</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssignSuccessorModal(false);
                    setSelectedJobForSuccessor(null);
                    setSuccessorForm({ employeeIds: [], readinessLevel: '', notes: '' });
                  }}
                >
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
                    {filteredEmployees.map((emp) => {
                      const isSelected = successorForm.employeeIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                          onClick={() =>
                            setSuccessorForm((prev) => {
                              const current = prev.employeeIds || [];
                              const exists = current.includes(emp.id);
                              const nextIds = exists
                                ? current.filter((id) => id !== emp.id)
                                : [...current, emp.id];
                              return { ...prev, employeeIds: nextIds };
                            })
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Employee photo / avatar */}
                              <EmployeePhoto
                                sid={emp.sid}
                                firstName={emp.first_name}
                                lastName={emp.last_name}
                                size="small"
                                className="h-10 w-10"
                              />

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
                            </div>
                            {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                          </div>
                        </div>
                      );
                    })}
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
                  onChange={(e) =>
                    setSuccessorForm((prev) => ({ ...prev, readinessLevel: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setSuccessorForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
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
                    {successorsData.map((successor) => (
                      <div
                        key={successor.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <EmployeePhoto
                            sid={successor.sid}
                            firstName={successor.first_name}
                            lastName={successor.last_name}
                            size="small"
                            className="h-10 w-10"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {successor.first_name} {successor.last_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {successor.readiness_level || 'No readiness level specified'}
                            </p>
                          </div>
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
                  disabled={
                    !successorForm.employeeIds ||
                    successorForm.employeeIds.length === 0 ||
                    assignSuccessorMutation.isPending
                  }
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
                    setSuccessorForm({ employeeIds: [], readinessLevel: '', notes: '' });
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

// Card used in Results & Successors tab
const JobEvaluationResultCard = ({ evaluation, onAssignSuccessor, successors, onRemoveSuccessor }) => {
  const getLocalScoreLabel = (score) => {
    if (score >= 370) return 'High';
    if (score > 250) return 'Medium';
    return 'Low';
  };

  const jobId = evaluation.jobId || evaluation.job_id;
  const jobSuccessors = successors.filter(s => s.jobId === jobId || s.job_id === jobId);

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
          {getBadge(getLocalScoreLabel(evaluation.weightedScore ?? evaluation.weighted_score ?? 0))}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div>
          <p className="text-xs text-gray-500">Weighted Score</p>
          <p className="text-lg font-semibold text-gray-900">
            {(evaluation.weightedScore ?? evaluation.weighted_score ?? 0).toFixed(1)}
          </p>
        </div>

        {jobSuccessors.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Successors ({jobSuccessors.length})</p>
            <div className="space-y-1">
              {jobSuccessors.slice(0, 2).map(successor => (
                <div key={successor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <EmployeePhoto
                      sid={successor.sid}
                      firstName={successor.first_name}
                      lastName={successor.last_name}
                      size="small"
                      className="h-6 w-6"
                    />
                    <span className="text-gray-700">
                      {successor.first_name} {successor.last_name}
                    </span>
                  </div>
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
          onClick={() => onAssignSuccessor(jobId)}
        >
          <UserPlus className="h-3 w-3 mr-1" />
          {jobSuccessors.length > 0 ? 'Manage Successors' : 'Assign Successor'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default JobEvaluation;
