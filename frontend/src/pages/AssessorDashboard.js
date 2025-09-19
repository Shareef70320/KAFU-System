import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { 
  Calendar, 
  Clock, 
  User, 
  Award, 
  BookOpen,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Play,
  FileText,
  Target,
  TrendingUp
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { useUser } from '../contexts/UserContext';
import api from '../lib/api';

const AssessorDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    currentLevel: '',
    managerSelectedLevel: '',
    assessorAssignedLevel: '',
    assessmentScore: '',
    assessmentPercentage: '',
    lastAssessmentDate: '',
    assessorComments: '',
    strengths: '',
    gaps: '',
    recommendations: '',
    developmentPlan: '',
    nextReviewDate: '',
    gapsList: [],
    recommendationsList: []
  });

  // Fetch assessor's review requests
  const { data: reviewRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['assessor-review-requests', currentSid],
    queryFn: async () => {
      const response = await api.get(`/performance-reviews/requests?assessorId=${currentSid}`);
      return response.data;
    },
    enabled: !!currentSid
  });

  // Fetch assessor's completed reviews
  const { data: completedReviewsData, isLoading: completedLoading } = useQuery({
    queryKey: ['assessor-completed-reviews', currentSid],
    queryFn: async () => {
      const response = await api.get(`/performance-reviews/requests?assessorId=${currentSid}&status=COMPLETED`);
      return response.data;
    },
    enabled: !!currentSid
  });

  // Start review mutation
  const startReviewMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await api.put(`/performance-reviews/requests/${requestId}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessor-review-requests']);
      toast({
        title: "Success",
        description: "Review started successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start review",
        variant: "destructive",
      });
    }
  });

  // Complete review mutation
  const completeReviewMutation = useMutation({
    mutationFn: async ({ requestId, reviewData }) => {
      const response = await api.post(`/performance-reviews/requests/${requestId}/complete`, reviewData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessor-review-requests']);
      queryClient.invalidateQueries(['assessor-completed-reviews']);
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewForm({
        currentLevel: '',
        managerSelectedLevel: '',
        assessorAssignedLevel: '',
        assessmentScore: '',
        assessmentPercentage: '',
        lastAssessmentDate: '',
        assessorComments: '',
        strengths: '',
        gaps: '',
        recommendations: '',
        developmentPlan: '',
        nextReviewDate: '',
        gapsList: [],
        recommendationsList: []
      });
      toast({
        title: "Success",
        description: "Review completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to complete review",
        variant: "destructive",
      });
    }
  });

  const handleStartReview = (requestId) => {
    startReviewMutation.mutate(requestId);
  };

  const handleCompleteReview = () => {
    if (!selectedRequest) return;
    
    if (!reviewForm.assessorAssignedLevel) {
      toast({
        title: "Error",
        description: "Please assign a competency level",
        variant: "destructive",
      });
      return;
    }

    completeReviewMutation.mutate({
      requestId: selectedRequest.id,
      reviewData: reviewForm
    });
  };

  const openReviewModal = (request) => {
    setSelectedRequest(request);
    setReviewForm({
      currentLevel: '',
      managerSelectedLevel: '',
      assessorAssignedLevel: '',
      assessmentScore: '',
      assessmentPercentage: '',
      lastAssessmentDate: '',
      assessorComments: '',
      strengths: '',
      gaps: '',
      recommendations: '',
      developmentPlan: '',
      nextReviewDate: '',
      gapsList: [],
      recommendationsList: []
    });
    setShowReviewModal(true);
  };

  const addGap = () => {
    setReviewForm(prev => ({
      ...prev,
      gapsList: [...prev.gapsList, { description: '', category: '', priority: 'MEDIUM', notes: '' }]
    }));
  };

  const updateGap = (index, field, value) => {
    setReviewForm(prev => ({
      ...prev,
      gapsList: prev.gapsList.map((gap, i) => 
        i === index ? { ...gap, [field]: value } : gap
      )
    }));
  };

  const removeGap = (index) => {
    setReviewForm(prev => ({
      ...prev,
      gapsList: prev.gapsList.filter((_, i) => i !== index)
    }));
  };

  const addRecommendation = () => {
    setReviewForm(prev => ({
      ...prev,
      recommendationsList: [...prev.recommendationsList, { 
        recommendation: '', 
        type: '', 
        priority: 'MEDIUM', 
        targetDate: '', 
        notes: '' 
      }]
    }));
  };

  const updateRecommendation = (index, field, value) => {
    setReviewForm(prev => ({
      ...prev,
      recommendationsList: prev.recommendationsList.map((rec, i) => 
        i === index ? { ...rec, [field]: value } : rec
      )
    }));
  };

  const removeRecommendation = (index) => {
    setReviewForm(prev => ({
      ...prev,
      recommendationsList: prev.recommendationsList.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'REQUESTED': return 'bg-yellow-100 text-yellow-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const pendingRequests = reviewRequestsData?.requests?.filter(r => 
    ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(r.status)
  ) || [];
  const completedReviews = completedReviewsData?.requests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assessor Dashboard</h1>
        <p className="text-gray-600">Manage competency reviews and assessments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingRequests.length}</div>
            <p className="text-sm text-gray-500">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Completed Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedReviews.length}</div>
            <p className="text-sm text-gray-500">Reviews completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
              Competencies Evaluated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {new Set(completedReviews.map(r => r.competency_id)).size}
            </div>
            <p className="text-sm text-gray-500">Unique competencies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {completedReviews.length > 0 ? 
                Math.round(completedReviews.reduce((sum, r) => sum + (r.assessment_percentage || 0), 0) / completedReviews.length) : 
                0}%
            </div>
            <p className="text-sm text-gray-500">Assessment average</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Review Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Pending Review Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No pending review requests</p>
              <p className="text-sm">New requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.competency_name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(request.requested_level)}`}>
                          {request.requested_level}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Employee:</span>
                          <div>{request.employee_first_name} {request.employee_last_name}</div>
                          <div className="text-xs text-gray-500">{request.employee_job_title}</div>
                        </div>
                        <div>
                          <span className="font-medium">Division:</span>
                          <div>{request.employee_division}</div>
                        </div>
                        <div>
                          <span className="font-medium">Requested:</span>
                          <div>{formatDate(request.requested_date)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Scheduled:</span>
                          <div>{formatDate(request.scheduled_date)}</div>
                        </div>
                      </div>
                      {request.notes && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Notes:</span>
                          <p className="text-sm text-gray-600">{request.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {request.status === 'SCHEDULED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartReview(request.id)}
                          disabled={startReviewMutation.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start Review
                        </Button>
                      )}
                      {request.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          onClick={() => openReviewModal(request)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Complete Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed Reviews */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Recent Completed Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : completedReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No completed reviews yet</p>
              <p className="text-sm">Your completed reviews will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedReviews.slice(0, 5).map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.competency_name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(request.requested_level)}`}>
                          {request.requested_level}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Employee:</span>
                          <div>{request.employee_first_name} {request.employee_last_name}</div>
                        </div>
                        <div>
                          <span className="font-medium">Completed:</span>
                          <div>{formatDate(request.completed_date)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Assessment Score:</span>
                          <div>{request.assessment_percentage ? `${request.assessment_percentage}%` : 'N/A'}</div>
                        </div>
                        <div>
                          <span className="font-medium">Assigned Level:</span>
                          <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(request.assessor_assigned_level)}`}>
                            {request.assessor_assigned_level || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Complete Performance Review</h2>
            
            {/* Employee Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Review Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Employee:</span>
                  <div>{selectedRequest.employee_first_name} {selectedRequest.employee_last_name}</div>
                </div>
                <div>
                  <span className="font-medium">Competency:</span>
                  <div>{selectedRequest.competency_name}</div>
                </div>
                <div>
                  <span className="font-medium">Requested Level:</span>
                  <div>{selectedRequest.requested_level}</div>
                </div>
                <div>
                  <span className="font-medium">Division:</span>
                  <div>{selectedRequest.employee_division}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Level Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Level</label>
                  <Select value={reviewForm.currentLevel} onValueChange={(value) => setReviewForm({...reviewForm, currentLevel: value})}>
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
                <div>
                  <label className="text-sm font-medium text-gray-700">Manager Selected Level</label>
                  <Select value={reviewForm.managerSelectedLevel} onValueChange={(value) => setReviewForm({...reviewForm, managerSelectedLevel: value})}>
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
                <div>
                  <label className="text-sm font-medium text-gray-700">Assessor Assigned Level *</label>
                  <Select value={reviewForm.assessorAssignedLevel} onValueChange={(value) => setReviewForm({...reviewForm, assessorAssignedLevel: value})}>
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

              {/* Assessment Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Assessment Score</label>
                  <Input
                    type="number"
                    value={reviewForm.assessmentScore}
                    onChange={(e) => setReviewForm({...reviewForm, assessmentScore: e.target.value})}
                    placeholder="Score"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Assessment Percentage</label>
                  <Input
                    type="number"
                    value={reviewForm.assessmentPercentage}
                    onChange={(e) => setReviewForm({...reviewForm, assessmentPercentage: e.target.value})}
                    placeholder="Percentage"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Assessment Date</label>
                  <Input
                    type="date"
                    value={reviewForm.lastAssessmentDate}
                    onChange={(e) => setReviewForm({...reviewForm, lastAssessmentDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="text-sm font-medium text-gray-700">Assessor Comments</label>
                <Textarea
                  value={reviewForm.assessorComments}
                  onChange={(e) => setReviewForm({...reviewForm, assessorComments: e.target.value})}
                  placeholder="Provide detailed feedback on the employee's competency level..."
                  rows={4}
                />
              </div>

              {/* Strengths */}
              <div>
                <label className="text-sm font-medium text-gray-700">Strengths</label>
                <Textarea
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({...reviewForm, strengths: e.target.value})}
                  placeholder="Identify key strengths demonstrated..."
                  rows={3}
                />
              </div>

              {/* Gaps */}
              <div>
                <label className="text-sm font-medium text-gray-700">Gaps</label>
                <Textarea
                  value={reviewForm.gaps}
                  onChange={(e) => setReviewForm({...reviewForm, gaps: e.target.value})}
                  placeholder="Identify areas for improvement..."
                  rows={3}
                />
              </div>

              {/* Detailed Gaps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Detailed Gaps</label>
                  <Button type="button" variant="outline" size="sm" onClick={addGap}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Gap
                  </Button>
                </div>
                {reviewForm.gapsList.map((gap, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Description</label>
                        <Input
                          value={gap.description}
                          onChange={(e) => updateGap(index, 'description', e.target.value)}
                          placeholder="Gap description"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Category</label>
                        <Select value={gap.category} onValueChange={(value) => updateGap(index, 'category', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KNOWLEDGE">Knowledge</SelectItem>
                            <SelectItem value="SKILL">Skill</SelectItem>
                            <SelectItem value="BEHAVIOR">Behavior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Priority</label>
                        <Select value={gap.priority} onValueChange={(value) => updateGap(index, 'priority', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <Textarea
                        value={gap.notes}
                        onChange={(e) => updateGap(index, 'notes', e.target.value)}
                        placeholder="Additional notes"
                        rows={2}
                        className="flex-1 mr-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeGap(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div>
                <label className="text-sm font-medium text-gray-700">Recommendations</label>
                <Textarea
                  value={reviewForm.recommendations}
                  onChange={(e) => setReviewForm({...reviewForm, recommendations: e.target.value})}
                  placeholder="Provide recommendations for development..."
                  rows={3}
                />
              </div>

              {/* Detailed Recommendations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Detailed Recommendations</label>
                  <Button type="button" variant="outline" size="sm" onClick={addRecommendation}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Recommendation
                  </Button>
                </div>
                {reviewForm.recommendationsList.map((rec, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Recommendation</label>
                        <Input
                          value={rec.recommendation}
                          onChange={(e) => updateRecommendation(index, 'recommendation', e.target.value)}
                          placeholder="Recommendation"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Type</label>
                        <Select value={rec.type} onValueChange={(value) => updateRecommendation(index, 'type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRAINING">Training</SelectItem>
                            <SelectItem value="MENTORING">Mentoring</SelectItem>
                            <SelectItem value="PROJECT">Project</SelectItem>
                            <SelectItem value="COURSE">Course</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Priority</label>
                        <Select value={rec.priority} onValueChange={(value) => updateRecommendation(index, 'priority', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex-1 mr-2">
                        <label className="text-xs font-medium text-gray-600">Target Date</label>
                        <Input
                          type="date"
                          value={rec.targetDate}
                          onChange={(e) => updateRecommendation(index, 'targetDate', e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRecommendation(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Development Plan */}
              <div>
                <label className="text-sm font-medium text-gray-700">Development Plan</label>
                <Textarea
                  value={reviewForm.developmentPlan}
                  onChange={(e) => setReviewForm({...reviewForm, developmentPlan: e.target.value})}
                  placeholder="Outline a development plan..."
                  rows={3}
                />
              </div>

              {/* Next Review Date */}
              <div>
                <label className="text-sm font-medium text-gray-700">Next Review Date</label>
                <Input
                  type="date"
                  value={reviewForm.nextReviewDate}
                  onChange={(e) => setReviewForm({...reviewForm, nextReviewDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowReviewModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteReview}
                disabled={completeReviewMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {completeReviewMutation.isPending ? 'Completing...' : 'Complete Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessorDashboard;
