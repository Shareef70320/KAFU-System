import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { 
  CheckCircle, 
  Clock, 
  Star, 
  Target,
  BookOpen,
  Award,
  Calendar,
  AlertCircle,
  FileText,
  BarChart3,
  MessageSquare,
  TrendingUp,
  User,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Eye
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const Reviews = () => {
  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' or 'annual'

  const { currentSid } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data for current SID
  const { data: employeeData } = useQuery({
    queryKey: ['user-profile', String(currentSid || '')],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const normalizedSid = String(currentSid || '').trim();
      return employees.find(emp => String(emp.sid).trim() === normalizedSid);
    },
    enabled: !!currentSid
  });

  // Fetch user's competencies with assessment data for performance reviews
  const { data: competenciesData, isLoading: competenciesLoading } = useQuery({
    queryKey: ['user-competencies-for-reviews', currentSid],
    queryFn: async () => {
      const response = await api.get(`/user-assessments/competencies?userId=${currentSid}`);
      return response.data;
    },
    enabled: !!currentSid
  });

  // Fetch user's review requests
  const { data: reviewRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['user-review-requests', currentSid],
    queryFn: async () => {
      const response = await api.get(`/performance-reviews/requests?employeeId=${currentSid}`);
      return response.data;
    },
    enabled: !!currentSid
  });

  // Fetch user's review history
  const { data: reviewHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['user-review-history', currentSid],
    queryFn: async () => {
      const response = await api.get(`/performance-reviews/employee/${currentSid}`);
      return response.data;
    },
    enabled: !!currentSid
  });

  // Create review request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/performance-reviews/requests', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-review-requests']);
      setShowRequestModal(false);
      setSelectedCompetency('');
      setSelectedLevel('');
      setRequestNotes('');
      toast({
        title: "Success",
        description: "Review request submitted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit review request",
        variant: "destructive",
      });
    }
  });

  const handleRequestReview = () => {
    if (!selectedCompetency || !selectedLevel) {
      toast({
        title: "Error",
        description: "Please select a competency and level",
        variant: "destructive",
      });
      return;
    }

    createRequestMutation.mutate({
      employeeId: currentSid,
      competencyId: selectedCompetency,
      requestedLevel: selectedLevel,
      notes: requestNotes
    });
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

  // Mock review data
  const reviews = [
    {
      id: 1,
      type: "Annual Review",
      status: "COMPLETED",
      period: "2024",
      dueDate: "2024-12-31",
      completedDate: "2024-12-15",
      reviewer: "Ahmed Al-Rashid",
      reviewerTitle: "Head of Learning and Development",
      overallRating: 4.2,
      competencyRating: 4.0,
      goalsRating: 4.5,
      feedback: "Excellent performance in strategic HR initiatives. Strong leadership in learning and development planning. Areas for improvement in government relations.",
      strengths: [
        "Strategic thinking and planning",
        "Team leadership and development",
        "Project management skills"
      ],
      areasForImprovement: [
        "Government relations knowledge",
        "Cross-functional collaboration",
        "Technical skills development"
      ],
      goals: [
        "Complete advanced HR certification",
        "Lead 3 major learning initiatives",
        "Improve government relations score to 4.0"
      ],
      nextReviewDate: "2025-12-31"
    },
    {
      id: 2,
      type: "Mid-Year Review",
      status: "PENDING",
      period: "2024",
      dueDate: "2024-06-30",
      completedDate: null,
      reviewer: "Ahmed Al-Rashid",
      reviewerTitle: "Head of Learning and Development",
      overallRating: null,
      competencyRating: null,
      goalsRating: null,
      feedback: null,
      strengths: [],
      areasForImprovement: [],
      goals: [],
      nextReviewDate: "2024-12-31"
    },
    {
      id: 3,
      type: "Quarterly Review",
      status: "COMPLETED",
      period: "Q3 2024",
      dueDate: "2024-09-30",
      completedDate: "2024-09-25",
      reviewer: "Ahmed Al-Rashid",
      reviewerTitle: "Head of Learning and Development",
      overallRating: 3.8,
      competencyRating: 3.5,
      goalsRating: 4.0,
      feedback: "Good progress on learning and development initiatives. Need to focus more on strategic HR planning.",
      strengths: [
        "Learning program development",
        "Team collaboration",
        "Project execution"
      ],
      areasForImprovement: [
        "Strategic planning",
        "Government relations",
        "Performance management"
      ],
      goals: [
        "Complete strategic HR course",
        "Improve government relations knowledge",
        "Lead Q4 learning initiatives"
      ],
      nextReviewDate: "2024-12-31"
    }
  ];

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowReviewModal(true);
  };

  const completedCount = reviews.filter(r => r.status === 'COMPLETED').length;
  const pendingCount = reviews.filter(r => r.status === 'PENDING').length;
  const totalCount = reviews.length;
  const averageRating = reviews
    .filter(r => r.overallRating)
    .reduce((sum, r) => sum + r.overallRating, 0) / completedCount;

  const competencies = competenciesData?.competencies || [];
  const reviewRequests = reviewRequestsData?.requests || [];
  const reviewHistory = reviewHistoryData?.reviews || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600">Track your performance reviews and feedback</p>
        </div>
        <Button onClick={() => setShowRequestModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Request Review
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Performance Reviews
          </button>
          <button
            onClick={() => setActiveTab('annual')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'annual'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Annual Reviews
          </button>
        </nav>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeTab === 'performance' ? (
          <>
            {/* Available Competencies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Available Competencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{competencies.length}</div>
                <p className="text-sm text-gray-500">Ready for review</p>
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {reviewRequests.filter(r => ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(r.status)).length}
                </div>
                <p className="text-sm text-gray-500">Awaiting review</p>
              </CardContent>
            </Card>

            {/* Completed Reviews */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Completed Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{reviewHistory.length}</div>
                <p className="text-sm text-gray-500">Reviews completed</p>
              </CardContent>
            </Card>

            {/* Current Level */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Award className="h-5 w-5 mr-2 text-purple-600" />
                  Current Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {reviewHistory.length > 0 ? reviewHistory[0].assessor_assigned_level : 'N/A'}
                </div>
                <p className="text-sm text-gray-500">Latest assessment</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Completed Reviews */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{completedCount}</div>
                <p className="text-sm text-gray-500">out of {totalCount} reviews</p>
              </CardContent>
            </Card>

            {/* Pending Reviews */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
                <p className="text-sm text-gray-500">reviews awaiting completion</p>
              </CardContent>
            </Card>

            {/* Average Rating */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-600" />
                  Average Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getRatingColor(averageRating)}`}>
                  {averageRating ? averageRating.toFixed(1) : 'N/A'}
                </div>
                <p className="text-sm text-gray-500">out of 5.0</p>
              </CardContent>
            </Card>

            {/* Next Review */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Next Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600">Dec 31</div>
                <p className="text-sm text-gray-500">Annual Review 2024</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-green-600" />
            {activeTab === 'performance' ? 'Performance Review History' : 'Review History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'performance' ? (
            <div className="space-y-6">
              {/* Current Review Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Current Review Requests
                </h3>
                {requestsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : reviewRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No review requests yet</p>
                    <p className="text-sm">Request a competency review to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{request.competency_name}</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(request.requested_level)}`}>
                                {request.requested_level}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                                {request.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Requested:</span>
                                <div>{formatDate(request.requested_date)}</div>
                              </div>
                              <div>
                                <span className="font-medium">Scheduled:</span>
                                <div>{formatDate(request.scheduled_date)}</div>
                              </div>
                              <div>
                                <span className="font-medium">Assessor:</span>
                                <div>
                                  {request.assessor_first_name ? 
                                    `${request.assessor_first_name} ${request.assessor_last_name}` : 
                                    'Not assigned'
                                  }
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Completed:</span>
                                <div>{formatDate(request.completed_date)}</div>
                              </div>
                            </div>
                            {request.notes && (
                              <div className="mt-2">
                                <span className="text-sm font-medium text-gray-700">Notes:</span>
                                <p className="text-sm text-gray-600">{request.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review History */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Review History
                </h3>
                {historyLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : reviewHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No completed reviews yet</p>
                    <p className="text-sm">Your review history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewHistory.map((review) => (
                      <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{review.competency_name}</h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(review.assessor_assigned_level)}`}>
                                {review.assessor_assigned_level}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-medium">Review Date:</span>
                                <div>{formatDate(review.review_date)}</div>
                              </div>
                              <div>
                                <span className="font-medium">Assessor:</span>
                                <div>{review.assessor_first_name} {review.assessor_last_name}</div>
                              </div>
                              <div>
                                <span className="font-medium">Assessment Score:</span>
                                <div>{review.assessment_percentage ? `${review.assessment_percentage}%` : 'N/A'}</div>
                              </div>
                              <div>
                                <span className="font-medium">Next Review:</span>
                                <div>{formatDate(review.next_review_date)}</div>
                              </div>
                            </div>
                            {review.assessor_comments && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-700">Assessor Comments:</span>
                                <p className="text-sm text-gray-600 mt-1">{review.assessor_comments}</p>
                              </div>
                            )}
                            {review.strengths && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-700">Strengths:</span>
                                <p className="text-sm text-gray-600 mt-1">{review.strengths}</p>
                              </div>
                            )}
                            {review.recommendations && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-700">Recommendations:</span>
                                <p className="text-sm text-gray-600 mt-1">{review.recommendations}</p>
                              </div>
                            )}
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
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{review.type}</h3>
                    <p className="text-sm text-gray-600">{review.period}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Reviewer:</span>
                        <span className="text-sm font-medium">{review.reviewer}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Title:</span>
                        <span className="text-sm font-medium">{review.reviewerTitle}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(review.status)}`}>
                      {review.status}
                    </span>
                    {review.status === 'PENDING' && (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>

                {/* Review Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Due:</span>
                    <span className="font-medium">{formatDate(review.dueDate)}</span>
                  </div>
                  {review.completedDate && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Completed:</span>
                      <span className="font-medium">{formatDate(review.completedDate)}</span>
                    </div>
                  )}
                  {review.overallRating && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Rating:</span>
                      <span className={`font-medium ${getRatingColor(review.overallRating)}`}>
                        {review.overallRating}/5.0
                      </span>
                    </div>
                  )}
                </div>

                {/* Rating Breakdown */}
                {review.overallRating && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{review.overallRating}</div>
                      <div className="text-sm text-gray-500">Overall</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{review.competencyRating}</div>
                      <div className="text-sm text-gray-500">Competencies</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{review.goalsRating}</div>
                      <div className="text-sm text-gray-500">Goals</div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleViewReview(review)}
                    variant="outline"
                    size="sm"
                  >
                    {review.status === 'COMPLETED' ? 'View Details' : 'Complete Review'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {showReviewModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedReview.type}</h3>
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Review Content */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <p className="font-medium">{selectedReview.period}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reviewer:</span>
                    <p className="font-medium">{selectedReview.reviewer}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <p className="font-medium">{formatDate(selectedReview.dueDate)}</p>
                  </div>
                  {selectedReview.completedDate && (
                    <div>
                      <span className="text-gray-500">Completed:</span>
                      <p className="font-medium">{formatDate(selectedReview.completedDate)}</p>
                    </div>
                  )}
                </div>

                {/* Ratings */}
                {selectedReview.overallRating && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{selectedReview.overallRating}</div>
                      <div className="text-sm text-gray-500">Overall Rating</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{selectedReview.competencyRating}</div>
                      <div className="text-sm text-gray-500">Competencies</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">{selectedReview.goalsRating}</div>
                      <div className="text-sm text-gray-500">Goals</div>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {selectedReview.feedback && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Feedback</h4>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedReview.feedback}</p>
                  </div>
                )}

                {/* Strengths */}
                {selectedReview.strengths.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <ThumbsUp className="h-4 w-4 mr-2 text-green-600" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {selectedReview.strengths.map((strength, index) => (
                        <li key={index} className="flex items-center text-gray-700">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {selectedReview.areasForImprovement.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <ThumbsDown className="h-4 w-4 mr-2 text-yellow-600" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-1">
                      {selectedReview.areasForImprovement.map((area, index) => (
                        <li key={index} className="flex items-center text-gray-700">
                          <Target className="h-4 w-4 mr-2 text-yellow-500" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Goals */}
                {selectedReview.goals.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-2 text-purple-600" />
                      Goals
                    </h4>
                    <ul className="space-y-1">
                      {selectedReview.goals.map((goal, index) => (
                        <li key={index} className="flex items-center text-gray-700">
                          <Star className="h-4 w-4 mr-2 text-purple-500" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => setShowReviewModal(false)}
                  className="loyverse-button-primary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Review Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Request Competency Review</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Competency</label>
                <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select competency" />
                  </SelectTrigger>
                  <SelectContent>
                    {competencies.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Requested Level</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
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
                <label className="text-sm font-medium text-gray-700">Notes (Optional)</label>
                <Textarea
                  placeholder="Add any additional notes for the assessor..."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowRequestModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRequestReview}
                disabled={createRequestMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
