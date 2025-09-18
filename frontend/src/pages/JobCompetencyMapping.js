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
  ChevronUp,
  Target,
  X,
  Info,
  Star,
  Award,
  TrendingUp
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
  
  // State for competency details modal
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);

  // Fetch jobs - get all jobs without pagination
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs?limit=1000');
      return response.data;
    }
  });

  // Fetch competencies - get all competencies without pagination
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies?limit=1000');
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

  // Group mappings by job to create job profiles
  const jobProfiles = React.useMemo(() => {
    const profiles = {};
    
    mappings.forEach(mapping => {
      const jobId = mapping.job?.id;
      if (!jobId) return;
      
      if (!profiles[jobId]) {
        profiles[jobId] = {
          job: mapping.job,
          competencies: []
        };
      }
      
      profiles[jobId].competencies.push({
        id: mapping.id,
        competency: mapping.competency,
        requiredLevel: mapping.requiredLevel,
        isRequired: mapping.isRequired
      });
    });
    
    return Object.values(profiles);
  }, [mappings]);

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

  // Filter job profiles based on search and filters
  const filteredJobProfiles = jobProfiles.filter(profile => {
    const job = profile.job;
    const matchesSearch = !searchTerm || 
      job?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.competencies.some(comp => 
        comp.competency?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesJob = jobFilter === 'all' || job?.id === jobFilter;
    const matchesCompetency = competencyFilter === 'all' || 
      profile.competencies.some(comp => comp.competency?.id === competencyFilter);
    const matchesLevel = levelFilter === 'all' || 
      profile.competencies.some(comp => comp.requiredLevel === levelFilter);
    
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
    if (window.confirm('Are you sure you want to delete this competency from the job profile?')) {
      deleteMappingMutation.mutate(mappingId);
    }
  };

  // Handle competency click to show details
  const handleCompetencyClick = async (competency, requiredLevel) => {
    try {
      // Fetch competency levels to get detailed information
      const response = await api.get(`/competencies/${competency.id}`);
      const competencyData = response.data;
      
      // Find the specific level details
      const levelDetails = competencyData.levels?.find(level => level.level === requiredLevel);
      
      setSelectedCompetency({
        ...competency,
        requiredLevel,
        levelDetails,
        allLevels: competencyData.levels || []
      });
      setShowCompetencyModal(true);
    } catch (error) {
      console.error('Error fetching competency details:', error);
      // Fallback to basic info if API fails
      setSelectedCompetency({
        ...competency,
        requiredLevel,
        levelDetails: null,
        allLevels: []
      });
      setShowCompetencyModal(true);
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
          <p className="text-gray-600">Loading job profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading job profiles: {error.message}</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Job Competency Profiles</h1>
                <p className="text-gray-600 mt-1">Manage job profiles with their required competencies and levels</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/add-mapping')}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Job Profile</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Job Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">{jobProfiles.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <LinkIcon className="h-6 w-6 text-green-600" />
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unique Competencies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.uniqueCompetencies}</p>
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
                  <p className="text-sm font-medium text-gray-600">Avg Competencies/Job</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {jobProfiles.length > 0 ? Math.round(stats.total / jobProfiles.length) : 0}
                  </p>
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
                  placeholder="Search by job title, code, or competency name..."
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

        {/* Job Profiles List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <span>Job Competency Profiles ({filteredJobProfiles.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredJobProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No job profiles found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || jobFilter !== 'all' || competencyFilter !== 'all' || levelFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first job competency profile'
                  }
                </p>
                <Button onClick={() => navigate('/add-mapping')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Job Profile
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredJobProfiles.map((profile) => (
                  <div
                    key={profile.job.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Job Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Building2 className="h-6 w-6 text-blue-600" />
                          <h3 className="text-xl font-semibold text-gray-900">{profile.job.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {profile.job.code}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-2">{profile.job.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {profile.job.unit}
                          </span>
                          <span>{profile.job.division}</span>
                          <span>{profile.job.department}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit-job-profile/${profile.job.id}`)}
                          className="flex items-center space-x-1"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit Profile</span>
                        </Button>
                      </div>
                    </div>

                    {/* Competencies List */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Required Competencies ({profile.competencies.length})
                        </h4>
                      </div>
                      
                      {profile.competencies.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No competencies assigned to this job</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {profile.competencies.map((comp) => (
                            <div
                              key={comp.id}
                              onClick={() => handleCompetencyClick(comp.competency, comp.requiredLevel)}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 group"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <BookOpen className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                                    {comp.competency.name}
                                  </span>
                                  <Info className="h-3 w-3 text-gray-400 group-hover:text-blue-500" />
                                </div>
                                <Badge className={`text-xs ${getLevelColor(comp.requiredLevel)}`}>
                                  {comp.requiredLevel}
                                </Badge>
                              </div>
                              <div className="text-gray-400 group-hover:text-blue-500">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competency Details Modal */}
        {showCompetencyModal && selectedCompetency && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedCompetency.name}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedCompetency.family}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCompetencyModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Competency Information */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Competency Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Definition</label>
                        <p className="text-gray-900 mt-1">{selectedCompetency.definition}</p>
                      </div>
                      {selectedCompetency.description && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Description</label>
                          <p className="text-gray-900 mt-1">{selectedCompetency.description}</p>
                        </div>
                      )}
                      <div className="flex items-center space-x-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Type</label>
                          <Badge className={`mt-1 ${
                            selectedCompetency.type === 'TECHNICAL' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {selectedCompetency.type === 'TECHNICAL' ? 'Technical' : 'Non-Technical'}
                          </Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Family</label>
                          <Badge className="mt-1 bg-gray-100 text-gray-800">
                            {selectedCompetency.family}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Required Level Details */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Required Level Details</h4>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Required Level</span>
                        </div>
                        <Badge className={`${getLevelColor(selectedCompetency.requiredLevel)}`}>
                          {selectedCompetency.requiredLevel}
                        </Badge>
                      </div>
                      
                      {selectedCompetency.levelDetails ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-blue-700">Level Title</label>
                            <p className="text-blue-900 font-medium">{selectedCompetency.levelDetails.title}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-blue-700">Description</label>
                            <p className="text-blue-900">{selectedCompetency.levelDetails.description}</p>
                          </div>
                          {selectedCompetency.levelDetails.indicators && selectedCompetency.levelDetails.indicators.length > 0 && (
                            <div>
                              <label className="text-sm font-medium text-blue-700">Key Indicators</label>
                              <ul className="mt-2 space-y-1">
                                {selectedCompetency.levelDetails.indicators.map((indicator, index) => (
                                  <li key={index} className="flex items-start space-x-2 text-blue-900">
                                    <Star className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">{indicator}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <AlertCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                          <p className="text-blue-700">Level details not available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* All Available Levels */}
                  {selectedCompetency.allLevels && selectedCompetency.allLevels.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">All Available Levels</h4>
                      <div className="space-y-2">
                        {selectedCompetency.allLevels.map((level) => (
                          <div
                            key={level.id}
                            className={`p-3 rounded-lg border ${
                              level.level === selectedCompetency.requiredLevel
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge className={`text-xs ${getLevelColor(level.level)}`}>
                                  {level.level}
                                </Badge>
                                <span className="font-medium text-gray-900">{level.title}</span>
                                {level.level === selectedCompetency.requiredLevel && (
                                  <Badge className="bg-blue-100 text-blue-800">Required</Badge>
                                )}
                              </div>
                              <TrendingUp className="h-4 w-4 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600 mt-1 ml-16">{level.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowCompetencyModal(false)}
                  >
                    Close
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

export default JobCompetencyMapping;