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
  Calendar, 
  Clock, 
  User, 
  Award, 
  BookOpen,
  Plus,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';

const PerformanceReviews = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [requestNotes, setRequestNotes] = useState('');

  // Fetch user's competencies with assessment data
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

  const competencies = competenciesData?.competencies || [];
  const reviewRequests = reviewRequestsData?.requests || [];
  const reviewHistory = reviewHistoryData?.reviews || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Reviews</h1>
          <p className="text-gray-600">Request competency reviews and track your progress</p>
        </div>
        <Button onClick={() => setShowRequestModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Request Review
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      </div>

      {/* Current Review Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Current Review Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Review History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Review History
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                        <h3 className="font-semibold text-gray-900">{review.competency_name}</h3>
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
        </CardContent>
      </Card>

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

export default PerformanceReviews;
