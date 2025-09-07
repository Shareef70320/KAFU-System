import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  XCircle
} from 'lucide-react';

const Jobs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [showAddJob, setShowAddJob] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);

  // Filter options from stats
  const [jobUnits, setJobUnits] = useState([]);
  const [jobDivisions, setJobDivisions] = useState([]);
  const [jobDepartments, setJobDepartments] = useState([]);

  // Fetch jobs from API
  const { data: jobsData, isLoading, isError, error } = useQuery({
    queryKey: ['jobs', searchTerm, selectedUnit, selectedDivision, selectedDepartment, selectedSection],
    queryFn: async () => {
      const response = await api.get('/jobs', {
        params: {
          search: searchTerm,
          unit: selectedUnit,
          division: selectedDivision,
          department: selectedDepartment,
          section: selectedSection,
          page: 1,
          limit: 1000
        }
      });
      return response.data;
    },
    keepPreviousData: true,
  });

  // Fetch job statistics
  const { data: statsData } = useQuery({
    queryKey: ['job-stats'],
    queryFn: async () => {
      const response = await api.get('/jobs/stats/overview');
      return response.data;
    }
  });

  const jobs = jobsData?.jobs || [];
  const stats = statsData || {};

  // Populate filter options from stats data
  useEffect(() => {
    if (stats.units && stats.divisions && stats.departments) {
      setJobUnits(stats.units.map(u => u.name));
      setJobDivisions(stats.divisions.map(d => d.name));
      setJobDepartments(stats.departments.map(d => d.name));
    }
  }, [stats]);

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
      section: formData.get('section')
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
                  <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
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
                  <p className="text-sm font-medium text-gray-500">Active Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.active || 0}</p>
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
                  <p className="text-sm font-medium text-gray-500">Units</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.units?.length || 0}</p>
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
                  <p className="text-sm font-medium text-gray-500">Departments</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.departments?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search Jobs</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by title, code, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={selectedUnit}
                  onValueChange={setSelectedUnit}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Units</option>
                  {jobUnits.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="division">Division</Label>
                <Select
                  value={selectedDivision}
                  onValueChange={setSelectedDivision}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Divisions</option>
                  {jobDivisions.map(division => (
                    <option key={division} value={division}>{division}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Departments</option>
                  {jobDepartments.map(department => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </Select>
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
          {jobs.length === 0 ? (
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
            jobs.map((job) => (
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
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {job.code}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            job.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {job.isActive ? 'Active' : 'Inactive'}
                          </span>
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
                        onClick={() => {/* TODO: Implement edit */}}
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
                            <div><span className="font-medium">Unit:</span> {job.unit || 'Not specified'}</div>
                            <div><span className="font-medium">Division:</span> {job.division || 'Not specified'}</div>
                            <div><span className="font-medium">Department:</span> {job.department || 'Not specified'}</div>
                            <div><span className="font-medium">Section:</span> {job.section || 'Not specified'}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Status & Dates</h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="font-medium">Status:</span> 
                              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                job.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {job.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
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
                      <Label htmlFor="unit">Unit</Label>
                      <Input
                        id="unit"
                        name="unit"
                        placeholder="Enter unit"
                      />
                    </div>
                    <div>
                      <Label htmlFor="division">Division</Label>
                      <Input
                        id="division"
                        name="division"
                        placeholder="Enter division"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        placeholder="Enter department"
                      />
                    </div>
                    <div>
                      <Label htmlFor="section">Section</Label>
                      <Input
                        id="section"
                        name="section"
                        placeholder="Enter section"
                      />
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
      </div>
    </div>
  );
};

export default Jobs;
