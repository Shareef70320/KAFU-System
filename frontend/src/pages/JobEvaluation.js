import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Clock
} from 'lucide-react';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';

const JobEvaluation = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [evaluations, setEvaluations] = useState({});
  const [isEditing, setIsEditing] = useState(false);

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
  const { data: evaluationsData } = useQuery({
    queryKey: ['job-evaluations'],
    queryFn: async () => {
      const response = await api.get('/job-evaluations');
      return response.data.evaluations;
    }
  });

  // Convert evaluations data to the format expected by the component
  React.useEffect(() => {
    if (evaluationsData) {
      const evaluationsMap = {};
      evaluationsData.forEach(evaluation => {
        evaluationsMap[evaluation.job_id] = {
          1: evaluation.decision_making_power,
          2: evaluation.risk_of_absence,
          3: evaluation.regulatory_responsibility,
          4: evaluation.revenue_budget_impact,
          5: evaluation.talent_scarcity,
          6: evaluation.number_of_reportees
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

  // Filter jobs based on search
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
    if (score > 4) return 'text-red-600 bg-red-100';
    if (score >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getScoreLabel = (score) => {
    if (score > 4) return 'High';
    if (score >= 3) return 'Medium';
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
          evaluatorId: 'admin', // You can make this dynamic later
          decisionMakingPower: evaluation[1] || 0,
          riskOfAbsence: evaluation[2] || 0,
          regulatoryResponsibility: evaluation[3] || 0,
          revenueBudgetImpact: evaluation[4] || 0,
          talentScarcity: evaluation[5] || 0,
          numberOfReportees: evaluation[6] || 0
        });

        if (response.data.success) {
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
          <h1 className="text-3xl font-bold text-gray-900">Job Criticality Evaluation</h1>
          <p className="text-gray-600 mt-2">
            Evaluate each job against the 6 criticality criteria and calculate weighted scores
          </p>
        </div>

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
            const weightedScore = calculateWeightedScore(job.id);
            const scoreLabel = getScoreLabel(weightedScore);
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

        {/* Evaluation Modal */}
        {isEditing && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
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
                        {calculateWeightedScore(selectedJob.id)} - {getScoreLabel(calculateWeightedScore(selectedJob.id))}
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
    </div>
  );
};

export default JobEvaluation;
