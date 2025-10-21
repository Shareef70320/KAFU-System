import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Target, 
  Calendar, 
  Clock, 
  BookOpen, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Star,
  User,
  Award,
  BarChart3,
  MessageSquare,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Play,
  Pause,
  RotateCcw,
  Save,
  X,
  Percent
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const MyIDP = () => {
  const { currentSid } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Progress tracking modal state
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedIdp, setSelectedIdp] = useState(null);
  const [progressForm, setProgressForm] = useState({
    progressPercentage: 0,
    progressNotes: '',
    status: 'PLANNED',
    completionDate: '',
    attachments: []
  });

  // Fetch user's IDPs
  const [idps, setIdps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIdps = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/idp/${currentSid}`);
      setIdps(response.data.idps || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching IDPs:', err);
      setError(err.message);
      setIdps([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentSid) {
      fetchIdps();
    }
  }, [currentSid]);

  // Progress tracking functions
  const openProgressModal = (idp) => {
    setSelectedIdp(idp);
    setProgressForm({
      progressPercentage: idp.progress_percentage || 0,
      progressNotes: idp.progress_notes || '',
      status: idp.status || 'PLANNED',
      completionDate: idp.completion_date ? new Date(idp.completion_date).toISOString().split('T')[0] : '',
      attachments: []
    });
    setIsProgressModalOpen(true);
  };

  const closeProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedIdp(null);
    setProgressForm({
      progressPercentage: 0,
      progressNotes: '',
      status: 'PLANNED',
      completionDate: '',
      attachments: []
    });
  };

  const updateProgress = async () => {
    try {
      const formData = new FormData();
      formData.append('progressPercentage', progressForm.progressPercentage);
      formData.append('progressNotes', progressForm.progressNotes);
      formData.append('status', progressForm.status);
      if (progressForm.completionDate) {
        formData.append('completionDate', progressForm.completionDate);
      }
      
      // Add attachments
      progressForm.attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });

      const response = await api.put(`/idp/${selectedIdp.id}/progress`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Refresh the IDPs list
        await fetchIdps();
        closeProgressModal();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert(`Failed to update progress: ${error.response?.data?.error || error.message}`);
    }
  };

  // Filter and sort IDPs
  const filteredIdps = idps
    .filter(idp => {
      const matchesSearch = idp.competency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           idp.intervention_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           idp.custom_intervention_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || idp.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || idp.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'competency_name':
          aValue = a.competency_name || '';
          bValue = b.competency_name || '';
          break;
        case 'target_date':
          aValue = new Date(a.target_date || '9999-12-31');
          bValue = new Date(b.target_date || '9999-12-31');
          break;
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PLANNED': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'HIGH': return <AlertCircle className="h-4 w-4" />;
      case 'MEDIUM': return <Clock className="h-4 w-4" />;
      case 'LOW': return <CheckCircle className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (targetDate, status) => {
    if (!targetDate || status === 'COMPLETED') return false;
    return new Date(targetDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading IDPs</h2>
          <p className="text-gray-600 mb-4">Unable to load your Individual Development Plans.</p>
          <Button onClick={() => fetchIdps()} className="bg-blue-600 hover:bg-blue-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-600" />
                My Individual Development Plan
              </h1>
              <p className="text-gray-600 mt-2">
                Track your professional development goals and learning interventions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {filteredIdps.length} IDP{filteredIdps.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search competencies or interventions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Created</SelectItem>
                    <SelectItem value="target_date">Target Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="competency_name">Competency</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IDP Cards */}
        {filteredIdps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No IDPs Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'No IDPs match your current filters. Try adjusting your search criteria.'
                  : 'You don\'t have any Individual Development Plans assigned yet. Contact your manager to discuss your development goals.'}
              </p>
              {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredIdps.map((idp) => (
              <Card key={idp.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {idp.competency_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(idp.status)}>
                          {idp.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(idp.priority)}>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(idp.priority)}
                            {idp.priority}
                          </div>
                        </Badge>
                        {isOverdue(idp.target_date, idp.status) && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Competency Levels */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">Required</div>
                      <div className="text-lg font-bold text-blue-800">{idp.required_level}</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-600">Current</div>
                      <div className="text-lg font-bold text-green-800">
                        {idp.employee_level || 'Not assessed'}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-600">Manager</div>
                      <div className="text-lg font-bold text-purple-800">
                        {idp.manager_level || 'Not assessed'}
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracking */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">Progress</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openProgressModal(idp)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Update
                      </Button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${idp.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{idp.progress_percentage || 0}% Complete</span>
                      {idp.last_progress_update && (
                        <span>Last updated: {formatDate(idp.last_progress_update)}</span>
                      )}
                    </div>
                    
                    {/* Progress Notes */}
                    {idp.progress_notes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 mb-1">Progress Notes</div>
                        <div className="text-sm text-blue-700">{idp.progress_notes}</div>
                      </div>
                    )}
                    
                    {/* Progress Attachments */}
                    {idp.progress_attachments && idp.progress_attachments.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="text-sm font-medium text-green-800 mb-2">Attachments</div>
                        <div className="space-y-1">
                          {idp.progress_attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <a 
                                href={`http://localhost:3000${attachment}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-green-700 hover:text-green-800 underline"
                              >
                                📎 {idp.attachment_names?.[index] || `Attachment ${index + 1}`}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Learning Intervention */}
                  {(idp.intervention_title || idp.custom_intervention_name) && (
                    <div className="border-t pt-4">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {idp.intervention_title || idp.custom_intervention_name}
                          </div>
                          {idp.intervention_type_name && (
                            <div className="text-sm text-gray-600">
                              Type: {idp.intervention_type_name}
                            </div>
                          )}
                          {idp.intervention_category_name && (
                            <div className="text-sm text-gray-600">
                              Category: {idp.intervention_category_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Date */}
                  {idp.target_date && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">Target Completion</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(idp.target_date)}
                            {isOverdue(idp.target_date, idp.status) && (
                              <span className="text-red-600 ml-2">(Overdue)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {idp.notes && (
                    <div className="border-t pt-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">Action Plan & Notes</div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {idp.notes}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="border-t pt-4 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Created: {formatDate(idp.created_at)}</span>
                      {idp.updated_at !== idp.created_at && (
                        <span>Updated: {formatDate(idp.updated_at)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {filteredIdps.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                IDP Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredIdps.filter(idp => idp.status === 'PLANNED').length}
                  </div>
                  <div className="text-sm text-blue-800">Planned</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredIdps.filter(idp => idp.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="text-sm text-yellow-800">In Progress</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredIdps.filter(idp => idp.status === 'COMPLETED').length}
                  </div>
                  <div className="text-sm text-green-800">Completed</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(filteredIdps.reduce((sum, idp) => sum + (idp.progress_percentage || 0), 0) / filteredIdps.length) || 0}%
                  </div>
                  <div className="text-sm text-purple-800">Avg Progress</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {filteredIdps.filter(idp => isOverdue(idp.target_date, idp.status)).length}
                  </div>
                  <div className="text-sm text-red-800">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Update Modal */}
        {isProgressModalOpen && selectedIdp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Update IDP Progress</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeProgressModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Competency Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Competency
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedIdp.competency_name}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <Select 
                      value={progressForm.status} 
                      onValueChange={(value) => setProgressForm({...progressForm, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Progress Percentage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Progress Percentage
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressForm.progressPercentage}
                        onChange={(e) => setProgressForm({...progressForm, progressPercentage: parseInt(e.target.value)})}
                        className="flex-1"
                      />
                      <div className="w-16 text-center font-semibold text-blue-600">
                        {progressForm.progressPercentage}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Progress Notes
                    </label>
                    <textarea
                      value={progressForm.progressNotes}
                      onChange={(e) => setProgressForm({...progressForm, progressNotes: e.target.value})}
                      placeholder="Add notes about your progress..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments (Optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setProgressForm({...progressForm, attachments: files});
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, JPEG, PNG, GIF (Max 10MB each)
                    </p>
                    
                    {/* Show selected files */}
                    {progressForm.attachments.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700 mb-1">Selected files:</div>
                        {progressForm.attachments.map((file, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-1">
                            📎 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completion Date (only show if status is COMPLETED) */}
                  {progressForm.status === 'COMPLETED' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Completion Date
                      </label>
                      <input
                        type="date"
                        value={progressForm.completionDate}
                        onChange={(e) => setProgressForm({...progressForm, completionDate: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={closeProgressModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={updateProgress}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Progress
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyIDP;
