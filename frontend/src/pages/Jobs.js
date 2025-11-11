import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmployeePhoto from '../components/EmployeePhoto';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Building2,
  Users,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Mail,
  Phone,
  MapPin,
  User,
  UserCheck,
  Layers,
  BookOpen,
  Clock
} from 'lucide-react';

const Jobs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for search and filters
  const [searchInput, setSearchInput] = useState(''); // Single search input state
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showAddJob, setShowAddJob] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobEmployees, setJobEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employeesWithoutJob, setEmployeesWithoutJob] = useState([]);
  const [loadingEmployeesWithoutJob, setLoadingEmployeesWithoutJob] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const [assignFilters, setAssignFilters] = useState({ department: '', division: '', location: '', unit: '' });
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const [showJcpModal, setShowJcpModal] = useState(false);
  const [jcpForJob, setJcpForJob] = useState({ job: null, mappings: [] });

  // Fetch jobs from API - single call without search parameters
  const { data: jobsData, isLoading, isError, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs?page=1&limit=10000');
      return response.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch job statistics (fixed, not affected by filters)
  const { data: statsData } = useQuery({
    queryKey: ['job-stats'],
    queryFn: () => api.get('/jobs/stats').then(res => res.data),
    retry: 1,
  });

  // Fetch filter options - divisions from jobs, locations from employees (same as Employee page)
  const { data: jobFilterData } = useQuery({
    queryKey: ['job-filters'],
    queryFn: () => api.get('/jobs/filters').then(res => res.data),
    retry: 1,
  });

  const { data: employeeFilterData } = useQuery({
    queryKey: ['employee-filters'],
    queryFn: () => api.get('/employees/filters').then(res => res.data),
    retry: 1,
  });
  
  // Count jobs without JCP code
  const withoutJcpCount = useMemo(() => {
    const list = jobsData?.jobs || [];
    return list.filter(job => {
      const code = job.jcpCode || job.jcp_code;
      return !code || code.trim().length === 0;
    }).length;
  }, [jobsData?.jobs]);

  // Client-side filtering with useMemo
  const filteredJobs = useMemo(() => {
    if (!jobsData?.jobs) return [];
    
    let filtered = jobsData.jobs;
    
    // Search filter
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(searchLower) ||
        job.code?.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.unit?.toLowerCase().includes(searchLower) ||
        job.division?.toLowerCase().includes(searchLower) ||
        job.department?.toLowerCase().includes(searchLower) ||
        job.section?.toLowerCase().includes(searchLower)
      );
    }
    
    // Division filter
    if (selectedDivision) {
      filtered = filtered.filter(job => job.division === selectedDivision);
    }
    
    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter(job => job.location === selectedLocation);
    }
    
    return filtered;
  }, [jobsData?.jobs, searchInput, selectedDivision, selectedLocation]);
  
  // Get filter options - divisions from jobs, locations from employees (same as Employee page)
  const divisions = jobFilterData?.divisions || [];
  const locations = employeeFilterData?.locations || [];

  // Add job mutation
  const addJobMutation = useMutation({
    mutationFn: async (jobData) => {
      const response = await api.post('/jobs', jobData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['job-stats']);
      toast({
        title: 'Success',
        description: 'Job created successfully!',
        variant: 'default'
      });
      setShowAddJob(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create job',
        variant: 'destructive'
      });
    }
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId) => {
      await api.delete(`/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['job-stats']);
      toast({
        title: 'Success',
        description: 'Job deleted successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete job',
        variant: 'destructive'
      });
    }
  });

  const handleAddJob = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const jobData = {
      title: formData.get('title'),
      description: formData.get('description'),
      code: formData.get('code'),
      unit: formData.get('unit'),
      division: formData.get('division'),
      department: formData.get('department'),
      section: formData.get('section'),
      location: formData.get('location'),
      // JD fields
      budgetaryControl: formData.get('budgetaryControl') === 'on',
      externalInterfaces: formData.get('externalInterfaces') || null,
      internalInterfaces: formData.get('internalInterfaces') || null,
      jobScope: formData.get('jobScope') || null,
      accountabilities: formData.get('accountabilities') || null,
      qualificationsExperience: formData.get('qualificationsExperience') || null,
      restrictions: formData.get('restrictions') || null,
      authority: formData.get('authority') || null,
      demands: formData.get('demands') || null
    };

    await addJobMutation.mutateAsync(jobData);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      await deleteJobMutation.mutateAsync(jobId);
    }
  };

  const toggleJob = (jobId) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  const fetchEmployeesByJob = async (jobCode) => {
    try {
      setLoadingEmployees(true);
      const response = await api.get('/employees', {
        params: {
          jobCode: jobCode,
          limit: 1000
        }
      });
      setJobEmployees(response.data.employees || response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch employees for this job',
        variant: 'destructive'
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleViewEmployees = async (job) => {
    setSelectedJob(job);
    setShowEmployeesModal(true);
    await fetchEmployeesByJob(job.code);
  };

  const handleViewJcp = async (job) => {
    try {
      const resp = await api.get(`/job-competencies?jobId=${job.id}&limit=1000`);
      const mappings = resp.data.mappings || resp.data || [];
      setJcpForJob({ job, mappings });
      setShowJcpModal(true);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load competency profile', variant: 'destructive' });
    }
  };

  const handleAssignJob = async (job) => {
    setSelectedJob(job);
    setSelectedEmployeeIds(new Set());
    setAssignFilters({ department: '', division: '', location: '', unit: '' });
    setAssignSearchTerm('');
    setShowAssignModal(true);
  };

  const fetchEmployeesWithoutJob = useCallback(async () => {
    try {
      setLoadingEmployeesWithoutJob(true);
      const params = new URLSearchParams();
      if (assignFilters.department) params.append('department', assignFilters.department);
      if (assignFilters.division) params.append('division', assignFilters.division);
      if (assignFilters.location) params.append('location', assignFilters.location);
      if (assignFilters.unit) params.append('unit', assignFilters.unit);
      params.append('limit', '200');

      const response = await api.get(`/jobs/employees-without-job?${params.toString()}`);
      setEmployeesWithoutJob(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees without job:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch employees without job',
        variant: 'destructive'
      });
    } finally {
      setLoadingEmployeesWithoutJob(false);
    }
  }, [assignFilters, toast]);

  const assignJobMutation = useMutation({
    mutationFn: async ({ jobId, employeeIds, filters }) => {
      const response = await api.post(`/jobs/${jobId}/assign-to-employees`, {
        employeeIds: employeeIds.length > 0 ? Array.from(employeeIds) : undefined,
        filters: employeeIds.length === 0 ? filters : undefined
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['employees']);
      toast({
        title: 'Success',
        description: data.message || `Job assigned to ${data.employeesUpdated} employee(s)`,
        variant: 'default'
      });
      setShowAssignModal(false);
      setSelectedEmployeeIds(new Set());
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign job',
        variant: 'destructive'
      });
    }
  });

  const handleAssignConfirm = async () => {
    if (!selectedJob) return;
    
    const employeeIds = Array.from(selectedEmployeeIds);
    await assignJobMutation.mutateAsync({
      jobId: selectedJob.id,
      employeeIds,
      filters: employeeIds.length === 0 ? assignFilters : undefined
    });
  };

  const toggleEmployeeSelection = (employeeId) => {
    const newSelection = new Set(selectedEmployeeIds);
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId);
    } else {
      newSelection.add(employeeId);
    }
    setSelectedEmployeeIds(newSelection);
  };

  const selectAllEmployees = () => {
    const allIds = new Set(employeesWithoutJob.map(emp => emp.id));
    setSelectedEmployeeIds(allIds);
  };

  const clearSelection = () => {
    setSelectedEmployeeIds(new Set());
  };

  // Filter employees by search term (client-side filtering)
  const filteredEmployeesWithoutJob = useMemo(() => {
    if (!assignSearchTerm.trim()) {
      return employeesWithoutJob;
    }

    const searchLower = assignSearchTerm.toLowerCase();
    return employeesWithoutJob.filter(employee => 
      employee.first_name?.toLowerCase().includes(searchLower) ||
      employee.last_name?.toLowerCase().includes(searchLower) ||
      employee.sid?.toLowerCase().includes(searchLower) ||
      employee.email?.toLowerCase().includes(searchLower) ||
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchLower)
    );
  }, [employeesWithoutJob, assignSearchTerm]);

  // Fetch employees without job when modal opens or filters change
  useEffect(() => {
    if (showAssignModal) {
      fetchEmployeesWithoutJob();
    }
  }, [showAssignModal, fetchEmployeesWithoutJob]);

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

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading jobs: {error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Jobs Management</h1>
          <p className="text-gray-600 mt-2">Manage job positions and organizational structure</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">{statsData?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">With JCP</p>
                  <p className="text-2xl font-semibold text-gray-900">{statsData?.withJcp || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Without JCP</p>
                  <p className="text-2xl font-semibold text-gray-900">{withoutJcpCount}</p>
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
                  <p className="text-sm font-medium text-gray-500">Divisions</p>
                  <p className="text-2xl font-semibold text-gray-900">{statsData?.divisions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search Jobs</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by title, code, or description..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="division">Division</Label>
                <select
                  id="division"
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Divisions</option>
                  {divisions.map(division => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => setShowAddJob(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Job
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first job position.</p>
                <Button onClick={() => setShowAddJob(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {job.code}
                          </span>
                          {(job.jcp_code || job.jcpCode) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {job.jcp_code || job.jcpCode}
                            </span>
                          )}
                          {typeof job.jcp_count === 'number' && job.jcp_count > 0 && (
                            <button
                              type="button"
                              onClick={() => handleViewJcp(job)}
                              title="Click to view JCP details"
                              className="ml-2 flex items-center hover:bg-green-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              <BookOpen className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-xs text-green-600 font-medium">JCP</span>
                            </button>
                          )}
                          {job.grade && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Grade {job.grade}
                            </span>
                          )}
                        </div>
                        {job.description && (
                          <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {job.unit && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {job.unit}
                            </span>
                          )}
                          {typeof job.jcp_count === 'number' && job.jcp_count > 0 && (
                            <span className="flex items-center cursor-pointer hover:text-blue-600" onClick={() => handleViewJcp(job)} title="View Competency Profile">
                              <Layers className="h-3 w-3 mr-1" />
                              {job.jcp_count} competencies
                            </span>
                          )}
                          {job.division && (
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {job.division}
                            </span>
                          )}
                          {job.department && (
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              {job.department}
                            </span>
                          )}
                          {job.section && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {job.section}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => navigate(`/jobs/view/${job.id}`)}
                        className="text-gray-400 hover:text-blue-600" 
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleViewEmployees(job)}
                        className="text-gray-400 hover:text-green-600" 
                        title="View Employees"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleAssignJob(job)}
                        className="text-gray-400 hover:text-purple-600" 
                        title="Assign to Employees Without Job"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => navigate(`/jobs/edit/${job.id}`)}
                        className="text-gray-400 hover:text-blue-600" 
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-gray-400 hover:text-red-600" 
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => toggleJob(job.id)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Expand"
                      >
                        {expandedJob === job.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedJob === job.id && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Job Details</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Code:</span> {job.code}</div>
                            {(job.jcp_code || job.jcpCode) && (
                              <div>
                                <span className="font-medium">JCP Code:</span>{' '}
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  {job.jcp_code || job.jcpCode}
                                </span>
                              </div>
                            )}
                            <div><span className="font-medium">Grade:</span> {job.grade || 'Not specified'}</div>
                            <div><span className="font-medium">Unit:</span> {job.unit || 'Not specified'}</div>
                            <div><span className="font-medium">Division:</span> {job.division || 'Not specified'}</div>
                            <div><span className="font-medium">Department:</span> {job.department || 'Not specified'}</div>
                            <div><span className="font-medium">Section:</span> {job.section || 'Not specified'}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Dates</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Created:</span> {new Date(job.createdAt).toLocaleDateString()}</div>
                            <div><span className="font-medium">Updated:</span> {new Date(job.updatedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                      {job.description && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                          <p className="text-sm text-gray-600">{job.description}</p>
                        </div>
                      )}
                      
                      {/* Job Description (JD) Section */}
                      {(job.budgetaryControl !== undefined || job.externalInterfaces || job.internalInterfaces || 
                        job.jobScope || job.accountabilities || job.qualificationsExperience || 
                        job.restrictions || job.authority || job.demands) && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-green-600" />
                            Job Description (JD)
                          </h4>
                          
                          {/* Dimensions */}
                          {(job.budgetaryControl !== undefined || job.externalInterfaces || job.internalInterfaces) && (
                            <div className="mb-4">
                              <h5 className="text-xs font-medium text-gray-500 mb-2">Dimensions</h5>
                              <div className="space-y-1 text-sm">
                                {job.budgetaryControl !== undefined && (
                                  <div><span className="font-medium">Budgetary Control:</span> {job.budgetaryControl ? 'Yes' : 'No'}</div>
                                )}
                                {job.externalInterfaces && (
                                  <div>
                                    <span className="font-medium">External Interfaces:</span>
                                    <ul className="list-disc list-inside ml-2 text-gray-600">
                                      {job.externalInterfaces.split(',').map((item, idx) => (
                                        <li key={idx}>{item.trim()}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {job.internalInterfaces && (
                                  <div><span className="font-medium">Internal Interfaces:</span> <span className="text-gray-600">{job.internalInterfaces}</span></div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Core JD Fields */}
                          {(job.jobScope || job.accountabilities || job.qualificationsExperience) && (
                            <div className="mb-4 space-y-3">
                              {job.jobScope && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 mb-1">Job Scope</h5>
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.jobScope}</p>
                                </div>
                              )}
                              {job.accountabilities && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 mb-1">Accountabilities</h5>
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.accountabilities}</p>
                                </div>
                              )}
                              {job.qualificationsExperience && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 mb-1">Qualifications and Experience</h5>
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.qualificationsExperience}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Special Conditions */}
                          {(job.restrictions || job.authority || job.demands) && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-500 mb-2">Special Conditions That May Apply</h5>
                              <div className="space-y-2 text-sm">
                                {job.restrictions && (
                                  <div>
                                    <span className="font-medium">Restrictions:</span> <span className="text-gray-600 whitespace-pre-wrap">{job.restrictions}</span>
                                  </div>
                                )}
                                {job.authority && (
                                  <div>
                                    <span className="font-medium">Authority:</span> <span className="text-gray-600 whitespace-pre-wrap">{job.authority}</span>
                                  </div>
                                )}
                                {job.demands && (
                                  <div>
                                    <span className="font-medium">Demands:</span> <span className="text-gray-600 whitespace-pre-wrap">{job.demands}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Add Job Modal */}
        {showAddJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-blue-600" />
                    Add New Job
                  </span>
                  <button 
                    onClick={() => setShowAddJob(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddJob} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Enter job title"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Job Code *</Label>
                      <Input
                        id="code"
                        name="code"
                        placeholder="Enter job code"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      name="description"
                      placeholder="Enter job description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="division">Division</Label>
                      <Input
                        id="division"
                        name="division"
                        placeholder="Enter division"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        name="unit"
                        placeholder="Enter unit"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        placeholder="Enter department"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="section">Section</Label>
                      <Input
                        id="section"
                        name="section"
                        placeholder="Enter section"
                      />
                    </div>
                  </div>

                  {/* Job Description (JD) Section - Optional */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Job Description (JD) - Optional
                    </h4>

                    {/* Dimensions */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-500 mb-2">Dimensions</h5>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="add-budgetaryControl"
                            name="budgetaryControl"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <Label htmlFor="add-budgetaryControl" className="text-sm font-medium text-gray-700">
                            Budgetary Control
                          </Label>
                        </div>
                        <div>
                          <Label htmlFor="add-externalInterfaces" className="text-xs">External Interfaces (comma-separated)</Label>
                          <Input
                            id="add-externalInterfaces"
                            name="externalInterfaces"
                            placeholder="e.g., Customers, Suppliers, Partners"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="add-internalInterfaces" className="text-xs">Internal Interfaces</Label>
                          <textarea
                            id="add-internalInterfaces"
                            name="internalInterfaces"
                            placeholder="Describe internal interfaces..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Core JD Fields */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <Label htmlFor="add-jobScope" className="text-xs">Job Scope</Label>
                        <textarea
                          id="add-jobScope"
                          name="jobScope"
                          placeholder="Describe the job scope..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add-accountabilities" className="text-xs">Accountabilities</Label>
                        <textarea
                          id="add-accountabilities"
                          name="accountabilities"
                          placeholder="List key accountabilities..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="add-qualificationsExperience" className="text-xs">Qualifications and Experience</Label>
                        <textarea
                          id="add-qualificationsExperience"
                          name="qualificationsExperience"
                          placeholder="Required qualifications and experience..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Special Conditions */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-500 mb-2">Special Conditions That May Apply</h5>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="add-restrictions" className="text-xs">Restrictions</Label>
                          <textarea
                            id="add-restrictions"
                            name="restrictions"
                            placeholder="Any restrictions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="add-authority" className="text-xs">Authority</Label>
                          <textarea
                            id="add-authority"
                            name="authority"
                            placeholder="Authority levels and limits..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="add-demands" className="text-xs">Demands</Label>
                          <textarea
                            id="add-demands"
                            name="demands"
                            placeholder="Physical, mental, or other demands..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 text-sm"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddJob(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addJobMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {addJobMutation.isPending ? 'Creating...' : 'Create Job'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assign Job to Employees Modal */}
        {showAssignModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Assign Job: {selectedJob.title} ({selectedJob.code})
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Select employees without job codes to assign this job
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedEmployeeIds(new Set());
                    setAssignFilters({ department: '', division: '', location: '', unit: '' });
                    setAssignSearchTerm('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Search Bar */}
                <div className="mb-4">
                  <Label htmlFor="assign-search" className="text-sm font-medium">Search Employees</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="assign-search"
                      value={assignSearchTerm}
                      onChange={(e) => setAssignSearchTerm(e.target.value)}
                      placeholder="Search by name, SID, or email..."
                      className="pl-10"
                    />
                  </div>
                  {assignSearchTerm && (
                    <p className="text-xs text-gray-500 mt-1">
                      Showing {filteredEmployeesWithoutJob.length} of {employeesWithoutJob.length} employees
                    </p>
                  )}
                </div>

                {/* Filters */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="filter-department" className="text-xs">Department</Label>
                    <Input
                      id="filter-department"
                      value={assignFilters.department}
                      onChange={(e) => {
                        setAssignFilters({ ...assignFilters, department: e.target.value });
                      }}
                      placeholder="Filter by department"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-division" className="text-xs">Division</Label>
                    <Input
                      id="filter-division"
                      value={assignFilters.division}
                      onChange={(e) => {
                        setAssignFilters({ ...assignFilters, division: e.target.value });
                      }}
                      placeholder="Filter by division"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-location" className="text-xs">Location</Label>
                    <Input
                      id="filter-location"
                      value={assignFilters.location}
                      onChange={(e) => {
                        setAssignFilters({ ...assignFilters, location: e.target.value });
                      }}
                      placeholder="Filter by location"
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssignFilters({ department: '', division: '', location: '', unit: '' });
                        fetchEmployeesWithoutJob();
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Selection Actions */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = new Set(filteredEmployeesWithoutJob.map(emp => emp.id));
                        setSelectedEmployeeIds(allIds);
                      }}
                    >
                      Select All ({filteredEmployeesWithoutJob.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedEmployeeIds.size > 0 ? (
                      <span className="font-semibold text-blue-600">
                        {selectedEmployeeIds.size} employee(s) selected
                      </span>
                    ) : (
                      <span>No selection - will assign to all {filteredEmployeesWithoutJob.length} filtered employee(s)</span>
                    )}
                  </div>
                </div>

                {loadingEmployeesWithoutJob ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading employees...</span>
                  </div>
                ) : filteredEmployeesWithoutJob.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Found</h3>
                    <p className="text-gray-500">
                      {assignSearchTerm 
                        ? `No employees match your search "${assignSearchTerm}"`
                        : 'No employees without job codes match your filters.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployeesWithoutJob.map((employee) => (
                      <div 
                        key={employee.id} 
                        className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                          selectedEmployeeIds.has(employee.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleEmployeeSelection(employee.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedEmployeeIds.has(employee.id)}
                              onChange={() => toggleEmployeeSelection(employee.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {employee.first_name} {employee.last_name}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono">{employee.sid}</p>
                            {employee.email && (
                              <p className="text-xs text-gray-600 mt-1 truncate">{employee.email}</p>
                            )}
                            <div className="mt-2 space-y-1">
                              {employee.department && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <FileText className="h-3 w-3 mr-1" />
                                  <span className="truncate">{employee.department}</span>
                                </div>
                              )}
                              {employee.division && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Users className="h-3 w-3 mr-1" />
                                  <span className="truncate">{employee.division}</span>
                                </div>
                              )}
                              {employee.location && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span className="truncate">{employee.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  {selectedEmployeeIds.size > 0 ? (
                    <span>Will assign to <strong>{selectedEmployeeIds.size}</strong> selected employee(s)</span>
                  ) : (
                    <span>Will assign to <strong>all {filteredEmployeesWithoutJob.length}</strong> filtered employee(s)</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedEmployeeIds(new Set());
                      setAssignFilters({ department: '', division: '', location: '', unit: '' });
                      setAssignSearchTerm('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignConfirm}
                    disabled={assignJobMutation.isPending || filteredEmployeesWithoutJob.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {assignJobMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Assign Job
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Competency Profile Modal */}
        {showJcpModal && jcpForJob.job && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Competency Profile — {jcpForJob.job.title} ({jcpForJob.job.code})
                </h3>
                <button
                  onClick={() => setShowJcpModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Job Information block to match style */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Job Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Title:</span>
                        <span className="text-gray-700">{jcpForJob.job.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">Code:</span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{jcpForJob.job.code}</span>
                      </div>
                      {(jcpForJob.job.jcp_code || jcpForJob.job.jcpCode) && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">JCP Code:</span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {jcpForJob.job.jcp_code || jcpForJob.job.jcpCode}
                          </span>
                        </div>
                      )}
                      {jcpForJob.job.grade && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Grade:</span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{jcpForJob.job.grade}</span>
                        </div>
                      )}
                      {jcpForJob.job.division && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Division:</span>
                          <span className="text-gray-700">{jcpForJob.job.division}</span>
                        </div>
                      )}
                      {jcpForJob.job.department && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Department:</span>
                          <span className="text-gray-700">{jcpForJob.job.department}</span>
                        </div>
                      )}
                      {jcpForJob.job.unit && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Unit:</span>
                          <span className="text-gray-700">{jcpForJob.job.unit}</span>
                        </div>
                      )}
                      {jcpForJob.job.section && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">Section:</span>
                          <span className="text-gray-700">{jcpForJob.job.section}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      Competency Profile
                    </h4>
                    {jcpForJob.mappings.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">No competencies mapped.</div>
                    ) : (
                      <div className="space-y-3">
                        {jcpForJob.mappings.map((m) => (
                          <div key={m.id || `${m.jobId}-${m.competencyId}`} className="border rounded-md p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900">{m.competency_name || m.competency?.name || `Competency ${m.competencyId}`}</div>
                                {m.competency_family && (
                                  <div className="text-xs text-gray-500">{m.competency_family}</div>
                                )}
                              </div>
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                Required: {m.requiredLevel || m.required_level || 'N/A'}
                              </span>
                            </div>
                            {m.description && (
                              <div className="mt-2 text-sm text-gray-600 line-clamp-2">{m.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employees Modal */}
        {showEmployeesModal && selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Employees in {selectedJob.title} ({selectedJob.code})
                </h3>
                <button
                  onClick={() => setShowEmployeesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading employees...</span>
                  </div>
                ) : jobEmployees.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Found</h3>
                    <p className="text-gray-500">No employees are currently assigned to this job position.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobEmployees.map((employee) => (
                      <div key={employee.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <EmployeePhoto
                              sid={employee.sid}
                              firstName={employee.first_name}
                              lastName={employee.last_name}
                              size="sm"
                              className="w-12 h-12"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {employee.first_name} {employee.last_name}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono">{employee.sid}</p>
                            <p className="text-xs text-gray-600 mt-1">{employee.job_title}</p>
                            
                            <div className="mt-2 space-y-1">
                              {employee.email && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Mail className="h-3 w-3 mr-1" />
                                  <span className="truncate">{employee.email}</span>
                                </div>
                              )}
                              {employee.phone && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Phone className="h-3 w-3 mr-1" />
                                  <span>{employee.phone}</span>
                                </div>
                              )}
                              {employee.location && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span className="truncate">{employee.location}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                employee.employment_status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {employee.employment_status || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Grade {employee.grade || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
