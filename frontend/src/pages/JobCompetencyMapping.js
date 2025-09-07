import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  Building2, 
  BookOpen, 
  Link as LinkIcon,
  Trash2,
  Edit,
  Eye,
  Users,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../lib/api';

const JobCompetencyMapping = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [competencyFilter, setCompetencyFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch jobs
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs');
      return response.data;
    }
  });

  // Fetch competencies
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies');
      return response.data;
    }
  });

  // Fetch job-competency mappings
  const { data: mappingsData, isLoading, error } = useQuery({
    queryKey: ['jobCompetencies'],
    queryFn: async () => {
      const response = await api.get('/job-competencies');
      return response.data;
    },
  });

  const jobs = jobsData?.jobs || [];
  const competencies = competenciesData?.competencies || [];
  const mappings = mappingsData?.mappings || [];

  // Calculate statistics locally
  const stats = React.useMemo(() => {
    if (!mappings.length) return { total: 0, active: 0, uniqueJobs: 0, uniqueCompetencies: 0 };
    
    const activeMappings = mappings.filter(m => m.isActive);
    const uniqueJobs = [...new Set(mappings.map(m => m.job?.id).filter(Boolean))].length;
    const uniqueCompetencies = [...new Set(mappings.map(m => m.competency?.id).filter(Boolean))].length;
    
    return {
      total: mappings.length,
      active: activeMappings.length,
      uniqueJobs,
      uniqueCompetencies
    };
  }, [mappings]);

  // Filter mappings based on search and filters
  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = !searchTerm || 
      mapping.job?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.competency?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.requiredLevel?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJob = jobFilter === 'all' || mapping.job?.id === jobFilter;
    const matchesCompetency = competencyFilter === 'all' || mapping.competency?.id === competencyFilter;
    const matchesLevel = levelFilter === 'all' || mapping.requiredLevel === levelFilter;
    
    return matchesSearch && matchesJob && matchesCompetency && matchesLevel;
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId) => {
      await api.delete(`/job-competencies/${mappingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobCompetencies']);
    }
  });

  const handleDeleteMapping = (mappingId) => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      deleteMappingMutation.mutate(mappingId);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-orange-100 text-orange-800';
      case 'MASTERY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mappings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading mappings: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Job-Competency Mapping</h1>
                <p className="text-gray-600 mt-1">Manage relationships between jobs and competencies</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/add-mapping')}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Mapping</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LinkIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Mappings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Mappings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unique Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.uniqueJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unique Competencies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.uniqueCompetencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Search & Filter</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by job title, competency name, or proficiency level..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Job</label>
                    <Select value={jobFilter} onValueChange={setJobFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Competency</label>
                    <Select value={competencyFilter} onValueChange={setCompetencyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select competency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Competencies</SelectItem>
                        {competencies.map((competency) => (
                          <SelectItem key={competency.id} value={competency.id}>
                            {competency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Level</label>
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="BASIC">Basic</SelectItem>
                        <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                        <SelectItem value="ADVANCED">Advanced</SelectItem>
                        <SelectItem value="MASTERY">Mastery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mappings List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Job-Competency Mappings ({filteredMappings.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMappings.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mappings found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || jobFilter !== 'all' || competencyFilter !== 'all' || levelFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first job-competency mapping'
                  }
                </p>
                <Button onClick={() => navigate('/add-mapping')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-gray-900">{mapping.job?.title}</span>
                          </div>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-gray-900">{mapping.competency?.name}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Job Code</p>
                            <p className="font-medium">{mapping.job?.code || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Competency Type</p>
                            <p className="font-medium">{mapping.competency?.type || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Required Level</p>
                            <Badge className={getLevelColor(mapping.requiredLevel)}>
                              {mapping.requiredLevel}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Job Description</p>
                            <p className="text-sm text-gray-900">{mapping.job?.description || 'No description'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Competency Description</p>
                            <p className="text-sm text-gray-900">{mapping.competency?.description || 'No description'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit-mapping/${mapping.id}`)}
                          className="flex items-center space-x-1"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMapping(mapping.id)}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobCompetencyMapping;