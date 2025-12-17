import React, { useState, useMemo } from 'react';
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
  Briefcase,
  BookOpen,
} from 'lucide-react';

const EditRequestReview = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  const [expandedRequests, setExpandedRequests] = useState({});
  const [reviewNotes, setReviewNotes] = useState({});
  const [filterStatus, setFilterStatus] = useState('PENDING'); // PENDING, APPROVED, REJECTED, ALL
  const [activeTab, setActiveTab] = useState('COMPETENCY'); // COMPETENCY, JCP

  // Fetch competency edit requests
  const { data: competencyRequests, isLoading: competencyLoading } = useQuery({
    queryKey: ['competency-edit-requests', filterStatus],
    queryFn: async () => {
      const params = filterStatus === 'ALL' ? {} : { status: filterStatus };
      const response = await api.get('/competency-edit-requests', { params });
      return response.data || [];
    }
  });

  // Fetch JCP edit requests
  const { data: jcpRequests, isLoading: jcpLoading } = useQuery({
    queryKey: ['jcp-edit-requests', filterStatus],
    queryFn: async () => {
      const params = filterStatus === 'ALL' ? {} : { status: filterStatus };
      const response = await api.get('/jcp-edit-requests', { params });
      return response.data || [];
    }
  });

  const isLoading = competencyLoading || jcpLoading;

  // Group and filter requests based on active tab and status
  const editRequests = useMemo(() => {
    const requests = activeTab === 'COMPETENCY' ? competencyRequests : jcpRequests;
    let filtered = (requests || []).map(req => ({
      ...req,
      requestType: activeTab
    }));
    
    // Apply status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }
    
    // For competency requests, group by competencyId
    if (activeTab === 'COMPETENCY') {
      const grouped = {};
      filtered.forEach(req => {
        const key = req.competencyId;
        if (!grouped[key]) {
          grouped[key] = {
            competencyId: key,
            requests: [],
            requestedBy: req.requestedBy,
            requestedByName: req.requestedByName,
            createdAt: req.createdAt,
            status: req.status,
            reviewedBy: req.reviewedBy,
            reviewedAt: req.reviewedAt,
            reviewNotes: req.reviewNotes
          };
        }
        grouped[key].requests.push(req);
        // Use the earliest creation date
        if (new Date(req.createdAt) < new Date(grouped[key].createdAt)) {
          grouped[key].createdAt = req.createdAt;
        }
        // If any request is pending, the group is pending
        if (req.status === 'PENDING') {
          grouped[key].status = 'PENDING';
        }
      });
      
      // Convert to array and sort by creation date (newest first)
      return Object.values(grouped).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // For JCP requests, keep as is (no grouping needed)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [competencyRequests, jcpRequests, activeTab, filterStatus]);

  // Fetch competencies for display
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies?limit=2000');
      return response.data;
    }
  });

  // Approve mutation (handles both competency and JCP)
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes, requestType: reqType }) => {
      const endpoint = reqType === 'JCP' 
        ? `/jcp-edit-requests/${id}/approve`
        : `/competency-edit-requests/${id}/approve`;
      const response = await api.post(endpoint, {
        reviewedBy: currentSid,
        reviewNotes: notes || ''
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      const typeLabel = variables.requestType === 'JCP' ? 'JCP' : 'competency';
      toast({
        title: 'Edit Request Approved',
        description: `Changes have been applied to the ${typeLabel}.`,
        variant: 'default'
      });
      queryClient.invalidateQueries(['competency-edit-requests']);
      queryClient.invalidateQueries(['jcp-edit-requests']);
      queryClient.invalidateQueries(['competencies']);
      queryClient.invalidateQueries(['job-competencies']);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve edit request',
        variant: 'destructive'
      });
    }
  });

  // Reject mutation (handles both competency and JCP)
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes, requestType: reqType }) => {
      const endpoint = reqType === 'JCP' 
        ? `/jcp-edit-requests/${id}/reject`
        : `/competency-edit-requests/${id}/reject`;
      const response = await api.post(endpoint, {
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
      queryClient.invalidateQueries(['jcp-edit-requests']);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject edit request',
        variant: 'destructive'
      });
    }
  });

  const getEditTypeLabel = (type, requestType) => {
    if (requestType === 'JCP') {
      const jcpLabels = {
        MAPPING_ADD: 'Add Competency to JCP',
        MAPPING_UPDATE: 'Update Competency Level',
        MAPPING_REMOVE: 'Remove Competency from JCP',
        MAPPING_BULK: 'Bulk JCP Changes'
      };
      return jcpLabels[type] || type;
    }
    
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

  const renderChangeDetails = (request, changes) => {
    const reqType = request.requestType || 'COMPETENCY';
    
    if (request.editType === 'DEFINITION') {
      return (
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
      );
    }
    
    if (request.editType === 'LEVEL_DESCRIPTION' || request.editType === 'LEVEL_INDICATORS') {
      return (
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
      );
    }
    
    if (request.editType === 'ELEMENT_ADD' || request.editType === 'ELEMENT_EDIT') {
      return (
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
      );
    }
    
    if (request.editType === 'ELEMENT_DELETE') {
      return (
        <div>
          <Label className="text-xs text-gray-500">Element to Delete:</Label>
          <p className="text-sm text-gray-700">{changes.elementName || 'N/A'}</p>
        </div>
      );
    }
    
    if (request.editType === 'INDICATOR_ADD' || request.editType === 'INDICATOR_EDIT') {
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-gray-500">Action:</Label>
            <p className="text-sm text-gray-900">{changes.action || changes.newValue || 'N/A'}</p>
          </div>
        </div>
      );
    }
    
    if (request.editType === 'INDICATOR_DELETE') {
      return (
        <div>
          <Label className="text-xs text-gray-500">Indicator to Delete:</Label>
          <p className="text-sm text-gray-700">{changes.indicatorAction || 'N/A'}</p>
        </div>
      );
    }

    // JCP Edit Types
    if (reqType === 'JCP') {
      if (request.editType === 'MAPPING_ADD') {
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-gray-500">Competency ID:</Label>
              <p className="text-sm text-gray-700">{changes.competencyId || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Required Level:</Label>
              <p className="text-sm text-gray-900">{changes.requiredLevel || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Required:</Label>
              <p className="text-sm text-gray-900">{changes.isRequired !== false ? 'Yes' : 'No'}</p>
            </div>
          </div>
        );
      }

      if (request.editType === 'MAPPING_UPDATE') {
        return (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-gray-500">Competency ID:</Label>
              <p className="text-sm text-gray-700">{changes.competencyId || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Old Required Level:</Label>
              <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                {changes.oldRequiredLevel || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">New Required Level:</Label>
              <p className="text-sm text-gray-900 bg-blue-50 p-2 rounded border border-blue-200">
                {changes.newRequiredLevel || 'N/A'}
              </p>
            </div>
          </div>
        );
      }

      if (request.editType === 'MAPPING_REMOVE') {
        return (
          <div>
            <Label className="text-xs text-gray-500">Competency ID to Remove:</Label>
            <p className="text-sm text-gray-700">{changes.competencyId || 'N/A'}</p>
          </div>
        );
      }

      if (request.editType === 'MAPPING_BULK') {
        return (
          <div className="space-y-3">
            {changes.adds && changes.adds.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500 font-semibold">Additions ({changes.adds.length}):</Label>
                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                  {changes.adds.map((add, idx) => (
                    <li key={idx} className="bg-green-50 p-2 rounded">
                      + Competency {add.competencyId} - Level: {add.requiredLevel}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {changes.updates && changes.updates.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500 font-semibold">Updates ({changes.updates.length}):</Label>
                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                  {changes.updates.map((update, idx) => (
                    <li key={idx} className="bg-blue-50 p-2 rounded">
                      ~ Competency {update.competencyId}: {update.oldRequiredLevel} → {update.newRequiredLevel}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {changes.removes && changes.removes.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500 font-semibold">Removals ({changes.removes.length}):</Label>
                <ul className="text-sm text-gray-700 mt-1 space-y-1">
                  {changes.removes.map((remove, idx) => (
                    <li key={idx} className="bg-red-50 p-2 rounded">
                      - Competency {remove.competencyId}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
    }
    
    return null;
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
          
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('COMPETENCY')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'COMPETENCY'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Competencies
                  {competencyRequests && competencyRequests.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {competencyRequests.length}
                    </Badge>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('JCP')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'JCP'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  JCPs
                  {jcpRequests && jcpRequests.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {jcpRequests.length}
                    </Badge>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Status Filter */}
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
                {editRequests.length} request{editRequests.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Edit Requests List */}
        {editRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No edit requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {editRequests.map((requestGroup) => {
              // For competency requests, requestGroup is a grouped object with multiple requests
              // For JCP requests, requestGroup is a single request
              const isGrouped = activeTab === 'COMPETENCY' && requestGroup.requests;
              const requests = isGrouped ? requestGroup.requests : [requestGroup];
              const firstRequest = requests[0];
              const groupId = isGrouped ? `group-${requestGroup.competencyId}` : firstRequest.id;
              const isExpanded = expandedRequests[groupId];
              const reqType = firstRequest.requestType || activeTab;
              const groupStatus = isGrouped ? requestGroup.status : firstRequest.status;
              
              return (
                <Card key={groupId} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(groupStatus)}
                          <CardTitle className="text-lg">
                            {isGrouped 
                              ? `${requests.length} Change${requests.length !== 1 ? 's' : ''} to ${getCompetencyName(requestGroup.competencyId)}`
                              : getEditTypeLabel(firstRequest.editType, reqType)
                            }
                          </CardTitle>
                          <Badge variant="outline" className={reqType === 'JCP' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                            {reqType === 'JCP' ? (
                              <>
                                <Briefcase className="h-3 w-3 mr-1" />
                                JCP
                              </>
                            ) : (
                              <>
                                <BookOpen className="h-3 w-3 mr-1" />
                                Competency
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {reqType === 'COMPETENCY' ? (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">
                                {isGrouped ? getCompetencyName(requestGroup.competencyId) : getCompetencyName(firstRequest.competencyId)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              <span className="font-medium">JCP: {firstRequest.jcpCode}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{isGrouped ? requestGroup.requestedByName || requestGroup.requestedBy : (firstRequest.requestedByName || firstRequest.requestedBy)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(isGrouped ? requestGroup.createdAt : firstRequest.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRequests(prev => ({
                          ...prev,
                          [groupId]: !prev[groupId]
                        }))}
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="space-y-4">
                      {/* Changes Preview */}
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <h4 className="font-semibold text-gray-900">All Changes:</h4>
                        
                        {/* Render all requests in the group */}
                        {requests.map((request, idx) => {
                          const changes = typeof request.changes === 'string' 
                            ? JSON.parse(request.changes || '{}') 
                            : (request.changes || {});
                          return (
                            <div key={request.id} className={idx > 0 ? "border-t pt-3 mt-3" : ""}>
                              <div className="mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {getEditTypeLabel(request.editType, reqType)}
                                </Badge>
                              </div>
                              {renderChangeDetails(request, changes)}
                            </div>
                          );
                        })}
                      </div>

                      {/* Review Notes */}
                      {groupStatus === 'PENDING' && (
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Review Notes (Optional):</Label>
                          <Textarea
                            value={reviewNotes[groupId] || ''}
                            onChange={(e) => setReviewNotes(prev => ({
                              ...prev,
                              [groupId]: e.target.value
                            }))}
                            placeholder="Add notes about your decision..."
                            className="min-h-[80px]"
                          />
                        </div>
                      )}

                      {/* Review Status */}
                      {groupStatus !== 'PENDING' && (isGrouped ? requestGroup.reviewNotes : firstRequest.reviewNotes) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <Label className="text-xs text-gray-500">Review Notes:</Label>
                          <p className="text-sm text-gray-700 mt-1">{isGrouped ? requestGroup.reviewNotes : firstRequest.reviewNotes}</p>
                          {(isGrouped ? requestGroup.reviewedBy : firstRequest.reviewedBy) && (
                            <p className="text-xs text-gray-500 mt-2">
                              Reviewed by: {isGrouped ? requestGroup.reviewedBy : firstRequest.reviewedBy} on {new Date((isGrouped ? requestGroup.reviewedAt : firstRequest.reviewedAt)).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {groupStatus === 'PENDING' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            onClick={async () => {
                              // Approve all requests in the group
                              const notes = reviewNotes[groupId] || '';
                              try {
                                if (isGrouped) {
                                  // Approve all requests in the group sequentially
                                  await Promise.all(
                                    requests.map(req => 
                                      approveMutation.mutateAsync({
                                        id: req.id,
                                        notes,
                                        requestType: reqType
                                      })
                                    )
                                  );
                                } else {
                                  approveMutation.mutate({
                                    id: firstRequest.id,
                                    notes,
                                    requestType: reqType
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Some requests could not be approved',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            disabled={approveMutation.isPending}
                            className="flex-1"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve All
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              // Reject all requests in the group
                              const notes = reviewNotes[groupId] || '';
                              try {
                                if (isGrouped) {
                                  // Reject all requests in the group sequentially
                                  await Promise.all(
                                    requests.map(req => 
                                      rejectMutation.mutateAsync({
                                        id: req.id,
                                        notes,
                                        requestType: reqType
                                      })
                                    )
                                  );
                                } else {
                                  rejectMutation.mutate({
                                    id: firstRequest.id,
                                    notes,
                                    requestType: reqType
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: 'Error',
                                  description: 'Some requests could not be rejected',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            disabled={rejectMutation.isPending}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject All
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
