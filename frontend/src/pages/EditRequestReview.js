import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { useUser } from '../contexts/UserContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Target,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const EditRequestReview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  const [expandedRequests, setExpandedRequests] = useState({});
  const [reviewNotes, setReviewNotes] = useState({});
  const [filterStatus, setFilterStatus] = useState('PENDING'); // PENDING, APPROVED, REJECTED, ALL

  // Fetch all edit requests
  const { data: editRequests, isLoading } = useQuery({
    queryKey: ['competency-edit-requests', filterStatus],
    queryFn: async () => {
      const params = filterStatus === 'ALL' ? {} : { status: filterStatus };
      const response = await api.get('/competency-edit-requests', { params });
      return response.data;
    }
  });

  // Fetch competencies for display
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies?limit=2000');
      return response.data;
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      const response = await api.post(`/competency-edit-requests/${id}/approve`, {
        reviewedBy: currentSid,
        reviewNotes: notes || ''
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Edit Request Approved',
        description: 'Changes have been applied to the competency.',
        variant: 'default'
      });
      queryClient.invalidateQueries(['competency-edit-requests']);
      queryClient.invalidateQueries(['competencies']);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve edit request',
        variant: 'destructive'
      });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      const response = await api.post(`/competency-edit-requests/${id}/reject`, {
        reviewedBy: currentSid,
        reviewNotes: notes || ''
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Edit Request Rejected',
        description: 'The edit request has been rejected.',
        variant: 'default'
      });
      queryClient.invalidateQueries(['competency-edit-requests']);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject edit request',
        variant: 'destructive'
      });
    }
  });

  const getEditTypeLabel = (type) => {
    const labels = {
      DEFINITION: 'Competency Definition',
      LEVEL_DESCRIPTION: 'Level Description',
      LEVEL_INDICATORS: 'Level Indicators',
      ELEMENT_ADD: 'Add Element',
      ELEMENT_EDIT: 'Edit Element',
      ELEMENT_DELETE: 'Delete Element',
      INDICATOR_ADD: 'Add Indicator',
      INDICATOR_EDIT: 'Edit Indicator',
      INDICATOR_DELETE: 'Delete Indicator'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const variants = {
      PENDING: { variant: 'default', icon: Clock, color: 'text-yellow-600' },
      APPROVED: { variant: 'default', icon: CheckCircle2, color: 'text-green-600' },
      REJECTED: { variant: 'destructive', icon: XCircle, color: 'text-red-600' }
    };
    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getCompetencyName = (competencyId) => {
    const comp = competenciesData?.competencies?.find(c => c.id === competencyId);
    return comp ? comp.name : `Competency ${competencyId}`;
  };

  const filteredRequests = editRequests || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading edit requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Edit Request Review</h1>
          
          {/* Filter */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-semibold">Filter by Status:</Label>
            <div className="flex gap-2">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="text-sm">
                {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Edit Requests List */}
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No edit requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const isExpanded = expandedRequests[request.id];
              const changes = request.changes || {};
              
              return (
                <Card key={request.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(request.status)}
                          <CardTitle className="text-lg">
                            {getEditTypeLabel(request.editType)}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">{getCompetencyName(request.competencyId)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{request.requestedByName || request.requestedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRequests(prev => ({
                          ...prev,
                          [request.id]: !prev[request.id]
                        }))}
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="space-y-4">
                      {/* Changes Preview */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h4 className="font-semibold text-gray-900">Changes:</h4>
                        
                        {request.editType === 'DEFINITION' && (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-500">Old Value:</Label>
                              <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                                {changes.oldValue || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">New Value:</Label>
                              <p className="text-sm text-gray-900 bg-blue-50 p-2 rounded border border-blue-200">
                                {changes.newValue || 'N/A'}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {(request.editType === 'LEVEL_DESCRIPTION' || request.editType === 'LEVEL_INDICATORS') && (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-500">Level ID:</Label>
                              <p className="text-sm text-gray-700">{changes.levelId}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Old Value:</Label>
                              <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                                {Array.isArray(changes.oldValue) 
                                  ? changes.oldValue.join(', ') 
                                  : (changes.oldValue || 'N/A')}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">New Value:</Label>
                              <p className="text-sm text-gray-900 bg-blue-50 p-2 rounded border border-blue-200">
                                {Array.isArray(changes.newValue) 
                                  ? changes.newValue.join(', ') 
                                  : (changes.newValue || 'N/A')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {(request.editType === 'ELEMENT_ADD' || request.editType === 'ELEMENT_EDIT') && (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-500">Element Name:</Label>
                              <p className="text-sm text-gray-900">{changes.name || changes.newValue?.name || 'N/A'}</p>
                            </div>
                            {changes.description && (
                              <div>
                                <Label className="text-xs text-gray-500">Description:</Label>
                                <p className="text-sm text-gray-700">{changes.description || changes.newValue?.description || 'N/A'}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {request.editType === 'ELEMENT_DELETE' && (
                          <div>
                            <Label className="text-xs text-gray-500">Element to Delete:</Label>
                            <p className="text-sm text-gray-700">{changes.elementName || 'N/A'}</p>
                          </div>
                        )}
                        
                        {(request.editType === 'INDICATOR_ADD' || request.editType === 'INDICATOR_EDIT') && (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-500">Action:</Label>
                              <p className="text-sm text-gray-900">{changes.action || changes.newValue || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                        
                        {request.editType === 'INDICATOR_DELETE' && (
                          <div>
                            <Label className="text-xs text-gray-500">Indicator to Delete:</Label>
                            <p className="text-sm text-gray-700">{changes.indicatorAction || 'N/A'}</p>
                          </div>
                        )}
                      </div>

                      {/* Review Notes */}
                      {request.status === 'PENDING' && (
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Review Notes (Optional):</Label>
                          <Textarea
                            value={reviewNotes[request.id] || ''}
                            onChange={(e) => setReviewNotes(prev => ({
                              ...prev,
                              [request.id]: e.target.value
                            }))}
                            placeholder="Add notes about your decision..."
                            className="min-h-[80px]"
                          />
                        </div>
                      )}

                      {/* Review Status */}
                      {request.status !== 'PENDING' && request.reviewNotes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <Label className="text-xs text-gray-500">Review Notes:</Label>
                          <p className="text-sm text-gray-700 mt-1">{request.reviewNotes}</p>
                          {request.reviewedBy && (
                            <p className="text-xs text-gray-500 mt-2">
                              Reviewed by: {request.reviewedBy} on {new Date(request.reviewedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            onClick={() => approveMutation.mutate({
                              id: request.id,
                              notes: reviewNotes[request.id] || ''
                            })}
                            disabled={approveMutation.isPending}
                            className="flex-1"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({
                              id: request.id,
                              notes: reviewNotes[request.id] || ''
                            })}
                            disabled={rejectMutation.isPending}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditRequestReview;

