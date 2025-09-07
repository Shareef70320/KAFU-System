import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Link, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Building2,
  Users,
  Target,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Briefcase,
  BookOpen
} from 'lucide-react';

const JobCompetencyMapping = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);

  // State for add mapping form
  const [selectedJobForMapping, setSelectedJobForMapping] = useState('');
  const [selectedCompetencyForMapping, setSelectedCompetencyForMapping] = useState('');
  const [selectedLevelForMapping, setSelectedLevelForMapping] = useState('BASIC');

  // Fetch jobs for dropdown
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs', { params: { limit: 1000 } });
      return response.data.jobs;
    }
  });

  // Fetch competencies for dropdown
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies', { params: { limit: 1000 } });
      return response.data.competencies;
    }
  });

  // Fetch job-competency mappings
  const { data: mappingsData, isLoading, isError, error } = useQuery({
    queryKey: ['job-competencies', searchTerm, selectedJob, selectedCompetency, selectedLevel],
    queryFn: async () => {
      const response = await api.get('/job-competencies', {
        params: {
          jobId: selectedJob,
          competencyId: selectedCompetency,
          level: selectedLevel,
          limit: 1000
        }
      });
      return response.data;
    },
    keepPreviousData: true,
  });

  // Fetch mapping statistics
  const { data: statsData } = useQuery({
    queryKey: ['job-competency-stats'],
    queryFn: async () => {
      const response = await api.get('/job-competencies/stats/overview');
      return response.data;
    }
  });

  const mappings = mappingsData?.mappings || [];
  const jobs = jobsData || [];
  const competencies = competenciesData || [];
  const stats = statsData || {};

  // Group mappings by job
  const groupedMappings = mappings.reduce((acc, mapping) => {
    const jobId = mapping.job.id;
    if (!acc[jobId]) {
      acc[jobId] = {
        job: mapping.job,
        competencies: []
      };
    }
    acc[jobId].competencies.push(mapping);
    return acc;
  }, {});

  // Add mapping mutation
  const addMappingMutation = useMutation({
    mutationFn: async (mappingData) => {
      const response = await api.post('/job-competencies', mappingData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-competencies']);
      queryClient.invalidateQueries(['job-competency-stats']);
      toast({
        title: 'Success',
        description: 'Competency mapping added successfully!',
        variant: 'default'
      });
      setShowAddMapping(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add competency mapping',
        variant: 'destructive'
      });
    }
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId) => {
      await api.delete(`/job-competencies/${mappingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-competencies']);
      queryClient.invalidateQueries(['job-competency-stats']);
      toast({
        title: 'Success',
        description: 'Competency mapping removed successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove competency mapping',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setSelectedJobForMapping('');
    setSelectedCompetencyForMapping('');
    setSelectedLevelForMapping('BASIC');
  };

  const handleAddMapping = async (e) => {
    e.preventDefault();
    
    if (!selectedJobForMapping || !selectedCompetencyForMapping) {
      toast({
        title: 'Error',
        description: 'Please select both a job and a competency',
        variant: 'destructive'
      });
      return;
    }

    await addMappingMutation.mutateAsync({
      jobId: selectedJobForMapping,
      competencyId: selectedCompetencyForMapping,
      requiredLevel: selectedLevelForMapping,
      isRequired: true
    });
  };

  const handleDeleteMapping = async (mappingId) => {
    if (window.confirm('Are you sure you want to remove this competency mapping?')) {
      await deleteMappingMutation.mutateAsync(mappingId);
    }
  };

  const toggleJob = (jobId) => {
    setExpandedJob(expandedJob === jobId ? null : jobId);
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC':
        return 'bg-gray-100 text-gray-800';
      case 'INTERMEDIATE':
        return 'bg-blue-100 text-blue-800';
      case 'ADVANCED':
        return 'bg-green-100 text-green-800';
      case 'MASTERY':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyColor = (family) => {
    switch (family) {
      case 'Operations':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'Technical Services':
        return 'bg-blue-100 text-blue-800';
      case 'Media':
        return 'bg-purple-100 text-purple-800';
      case 'HR & Admin':
        return 'bg-green-100 text-green-800';
      case 'Certification & Compliance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Fire':
        return 'bg-red-200 text-red-900';
      case 'Security':
        return 'bg-gray-100 text-gray-800';
      case 'Finance & Procurement':
        return 'bg-emerald-100 text-emerald-800';
      case 'Quality':
        return 'bg-indigo-100 text-indigo-800';
      case 'HSE':
        return 'bg-teal-100 text-teal-800';
      case 'ICT':
        return 'bg-cyan-100 text-cyan-800';
      case 'Common':
        return 'bg-slate-100 text-slate-800';
      case 'Legal & Regulatory':
        return 'bg-rose-100 text-rose-800';
      case 'Internal Audit':
        return 'bg-violet-100 text-violet-800';
      case 'Commercial':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mappings...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading mappings: {error?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Job-Competency Mapping</h1>
          <p className="text-gray-600 mt-2">Map competencies and their required levels to job positions</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Link className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Mappings</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Jobs with Competencies</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.jobsWithCompetencies || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Competencies with Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.competenciesWithJobs || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Level Distribution</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.byLevel?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="job">Filter by Job</Label>
                <Select
                  value={selectedJob}
                  onValueChange={setSelectedJob}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Jobs</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="competency">Filter by Competency</Label>
                <Select
                  value={selectedCompetency}
                  onValueChange={setSelectedCompetency}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Competencies</option>
                  {competencies.map(competency => (
                    <option key={competency.id} value={competency.id}>{competency.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Filter by Level</Label>
                <Select
                  value={selectedLevel}
                  onValueChange={setSelectedLevel}
                  className="loyverse-input mt-1"
                >
                  <option value="">All Levels</option>
                  <option value="BASIC">Basic</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="MASTERY">Mastery</option>
                </Select>
              </div>
              <div className="flex items-end space-x-2">
                <Button 
                  onClick={() => navigate('/add-mapping')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
                <Button 
                  onClick={() => setShowAddMapping(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mappings List */}
        <div className="space-y-4">
          {Object.keys(groupedMappings).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mappings found</h3>
                <p className="text-gray-600 mb-4">Start by adding competency mappings to job positions.</p>
                <Button onClick={() => navigate('/add-mapping')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.values(groupedMappings).map((group) => (
              <Card key={group.job.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{group.job.title}</h3>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {group.job.code}
                          </span>
                          {group.job.unit && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {group.job.unit}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Target className="h-3 w-3 mr-1" />
                            {group.competencies.length} Competencies
                          </span>
                          {group.job.department && (
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {group.job.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => toggleJob(group.job.id)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Expand"
                      >
                        {expandedJob === group.job.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedJob === group.job.id && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">Required Competencies</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.competencies.map((mapping) => (
                          <div key={mapping.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{mapping.competency.name}</h5>
                              <button 
                                onClick={() => handleDeleteMapping(mapping.id)}
                                className="text-gray-400 hover:text-red-600" 
                                title="Remove mapping"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(mapping.requiredLevel)}`}>
                                  {mapping.requiredLevel}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFamilyColor(mapping.competency.family)}`}>
                                  {mapping.competency.family}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">{mapping.competency.definition}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Add Mapping Modal */}
        {showAddMapping && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-blue-600" />
                    Add Competency Mapping
                  </span>
                  <button 
                    onClick={() => setShowAddMapping(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMapping} className="space-y-4">
                  <div>
                    <Label htmlFor="job-select">Select Job *</Label>
                    <Select
                      value={selectedJobForMapping}
                      onValueChange={setSelectedJobForMapping}
                      className="loyverse-input mt-1"
                      required
                    >
                      <option value="">Choose a job...</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>{job.title} ({job.code})</option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="competency-select">Select Competency *</Label>
                    <Select
                      value={selectedCompetencyForMapping}
                      onValueChange={setSelectedCompetencyForMapping}
                      className="loyverse-input mt-1"
                      required
                    >
                      <option value="">Choose a competency...</option>
                      {competencies.map(competency => (
                        <option key={competency.id} value={competency.id}>
                          {competency.name} ({competency.family})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="level-select">Required Level *</Label>
                    <Select
                      value={selectedLevelForMapping}
                      onValueChange={setSelectedLevelForMapping}
                      className="loyverse-input mt-1"
                      required
                    >
                      <option value="BASIC">Basic</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="MASTERY">Mastery</option>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddMapping(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addMappingMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {addMappingMutation.isPending ? 'Adding...' : 'Add Mapping'}
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

export default JobCompetencyMapping;
