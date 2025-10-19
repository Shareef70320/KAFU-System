import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Briefcase,
  BookOpen,
  Target,
  Building2,
  ArrowLeft,
  Plus,
  X,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddMapping = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State for search and filters
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [competencySearchTerm, setCompetencySearchTerm] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedCompetencyType, setSelectedCompetencyType] = useState('');
  const [selectedCompetencyFamily, setSelectedCompetencyFamily] = useState('');

  // State for selected job and its competencies
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobCompetencies, setJobCompetencies] = useState([]); // Array of {competency, level}
  const [existingJobCompetencies, setExistingJobCompetencies] = useState([]); // Array of existing mappings

  // Fetch jobs - get all jobs without pagination
  const { data: jobsData, error: jobsError } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs?limit=1000').then(res => res.data), // Get all jobs
    retry: 1,
  });

  // Fetch competencies - get all competencies without pagination
  const { data: competenciesData, error: competenciesError } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => api.get('/competencies?limit=1000').then(res => res.data), // Get all competencies
    retry: 1,
  });

  // Fetch existing job competency mappings
  const { data: mappingsData, error: mappingsError } = useQuery({
    queryKey: ['jobCompetencies'],
    queryFn: () => api.get('/job-competencies').then(res => res.data),
    retry: 1,
  });

  const jobs = jobsData?.jobs || [];
  const competencies = competenciesData?.competencies || [];
  const mappings = mappingsData?.mappings || [];

  // Function to get existing competencies for a job
  const getExistingJobCompetencies = (jobId) => {
    return mappings.filter(mapping => mapping.jobId === jobId);
  };

  // Handle job selection
  const handleJobSelection = (job) => {
    setSelectedJob(job);
    
    // Get existing competencies for this job
    const existing = getExistingJobCompetencies(job.id);
    setExistingJobCompetencies(existing);
    
    // Clear any manually added competencies when selecting a new job
    setJobCompetencies([]);
    
    if (existing.length > 0) {
      toast({
        title: "Existing Profile Found",
        description: `This job already has ${existing.length} competency mappings. You can add more competencies below.`,
      });
    }
  };

  // Calculate stats from jobs data
  const jobStats = React.useMemo(() => {
    if (!jobs.length) return { units: [], divisions: [], departments: [] };
    
    // Filter jobs based on selected job type (unit, division, or department)
    let filteredJobs = jobs;
    if (selectedJobType) {
      filteredJobs = jobs.filter(job => 
        job.unit === selectedJobType || 
        job.division === selectedJobType || 
        job.department === selectedJobType
      );
    }
    
    const units = [...new Set(filteredJobs.map(job => job.unit).filter(Boolean))].map(unit => ({ 
      name: unit, 
      count: filteredJobs.filter(job => job.unit === unit).length 
    }));
    const divisions = [...new Set(filteredJobs.map(job => job.division).filter(Boolean))].map(division => ({ 
      name: division, 
      count: filteredJobs.filter(job => job.division === division).length 
    }));
    const departments = [...new Set(filteredJobs.map(job => job.department).filter(Boolean))].map(department => ({ 
      name: department, 
      count: filteredJobs.filter(job => job.department === department).length 
    }));
    
    return { units, divisions, departments };
  }, [jobs, selectedJobType]);

  // Calculate stats from competencies data
  const competencyStats = React.useMemo(() => {
    if (!competencies.length) return { types: [], families: [] };
    
    const types = [...new Set(competencies.map(comp => comp.type).filter(Boolean))].map(type => ({ name: type, count: competencies.filter(comp => comp.type === type).length }));
    
    // Filter families based on selected type
    let filteredCompetencies = competencies;
    if (selectedCompetencyType) {
      filteredCompetencies = competencies.filter(comp => comp.type === selectedCompetencyType);
    }
    
    const families = [...new Set(filteredCompetencies.map(comp => comp.family).filter(Boolean))].map(family => ({ 
      name: family, 
      count: filteredCompetencies.filter(comp => comp.family === family).length 
    }));
    
    return { types, families };
  }, [competencies, selectedCompetencyType]);

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = jobSearchTerm === '' || 
      job.title.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
      job.code.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(jobSearchTerm.toLowerCase());
    
    const matchesType = selectedJobType === '' || 
      job.unit === selectedJobType ||
      job.division === selectedJobType ||
      job.department === selectedJobType;
    
    return matchesSearch && matchesType;
  });

  // Filter competencies based on search and filters
  const filteredCompetencies = competencies.filter(competency => {
    const matchesSearch = competencySearchTerm === '' || 
      competency.name.toLowerCase().includes(competencySearchTerm.toLowerCase()) ||
      competency.definition.toLowerCase().includes(competencySearchTerm.toLowerCase()) ||
      competency.family.toLowerCase().includes(competencySearchTerm.toLowerCase());
    
    const matchesType = selectedCompetencyType === '' || competency.type === selectedCompetencyType;
    const matchesFamily = selectedCompetencyFamily === '' || competency.family === selectedCompetencyFamily;
    
    return matchesSearch && matchesType && matchesFamily;
  });

  // Check if a competency is already linked to the selected job
  const isCompetencyLinked = (competencyId) => {
    if (!selectedJob) return false;
    
    // Check if it's in existing competencies
    const existsInExisting = existingJobCompetencies.some(mapping => mapping.competency.id === competencyId);
    if (existsInExisting) return true;
    
    // Check if it's in newly added competencies
    const existsInNew = jobCompetencies.some(comp => comp.competency.id === competencyId);
    if (existsInNew) return true;
    
    return false;
  };

  // Add competency to job profile
  const addCompetencyToJob = (competency, level) => {
    // Check if competency already exists in newly added competencies
    const existsInNew = jobCompetencies.some(comp => comp.competency.id === competency.id);
    if (existsInNew) {
      toast({
        title: "Competency Already Added",
        description: `${competency.name} is already in the new competencies list`,
        variant: "destructive",
      });
      return;
    }

    // Check if competency already exists in existing job competencies
    const existsInExisting = existingJobCompetencies.some(mapping => mapping.competency.id === competency.id);
    if (existsInExisting) {
      toast({
        title: "Competency Already Linked",
        description: `${competency.name} is already linked to this job profile`,
        variant: "destructive",
      });
      return;
    }

    setJobCompetencies([...jobCompetencies, { competency, level }]);
    toast({
      title: "Competency Added",
      description: `${competency.name} (${level}) added to job profile`,
    });
  };

  // Remove competency from job profile
  const removeCompetencyFromJob = (competencyId) => {
    setJobCompetencies(jobCompetencies.filter(comp => comp.competency.id !== competencyId));
  };

  // Create job profile with all competencies
  const addMappingMutation = useMutation({
    mutationFn: async (mappingData) => {
      // Create multiple mappings for each competency
      const promises = mappingData.competencies.map(comp => 
        api.post('/job-competencies', {
          jobId: mappingData.jobId,
          competencyId: comp.competency.id,
          requiredLevel: comp.level,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: existingJobCompetencies.length > 0 ? "Competencies Added" : "Job Profile Created",
        description: existingJobCompetencies.length > 0 
          ? `${jobCompetencies.length} new competencies added to existing profile`
          : `Job profile with ${jobCompetencies.length} competencies created successfully`,
      });
      queryClient.invalidateQueries(['jobCompetencies']);
      // Reset selections
      setSelectedJob(null);
      setJobCompetencies([]);
      setExistingJobCompetencies([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create job profile",
        variant: "destructive",
      });
    },
  });

  const handleCreateJobProfile = () => {
    if (!selectedJob || jobCompetencies.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a job and add at least one competency",
        variant: "destructive",
      });
      return;
    }

    addMappingMutation.mutate({
      jobId: selectedJob.id,
      competencies: jobCompetencies,
    });
  };

  const getFamilyColor = (family) => {
    const colors = {
      'Commercial': 'bg-blue-100 text-blue-800',
      'Technical Services': 'bg-green-100 text-green-800',
      'Human Resources': 'bg-purple-100 text-purple-800',
      'Finance': 'bg-yellow-100 text-yellow-800',
      'Operations': 'bg-red-100 text-red-800',
      'Customer Service': 'bg-indigo-100 text-indigo-800',
      'Information Technology': 'bg-pink-100 text-pink-800',
      'Quality Assurance': 'bg-orange-100 text-orange-800',
      'Safety & Security': 'bg-teal-100 text-teal-800',
      'Legal & Compliance': 'bg-gray-100 text-gray-800',
    };
    return colors[family] || 'bg-gray-100 text-gray-800';
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

  // Show error if any API calls failed
  if (jobsError || competenciesError || mappingsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
          <p className="text-gray-600 mb-4">There was an error loading the required data:</p>
          <div className="space-y-2 text-sm text-gray-500">
            {jobsError && <p>Jobs: {jobsError.message}</p>}
            {competenciesError && <p>Competencies: {competenciesError.message}</p>}
            {mappingsError && <p>Job Competencies: {mappingsError.message}</p>}
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
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
                variant="outline"
                size="sm"
                onClick={() => navigate('/job-competency-mapping')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Job Profiles</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Job Competency Profile</h1>
                <p className="text-gray-600 mt-1">Select a job and add multiple competencies with their required levels</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Selection */}
          <div className="lg:col-span-1">
            <Card className="loyverse-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <span>Select Job</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Job Filters */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="job-search">Search Jobs</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="job-search"
                        placeholder="Search by title, code, or description..."
                        value={jobSearchTerm}
                        onChange={(e) => setJobSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="job-type">Filter by Unit/Division/Department</Label>
                    <select
                      value={selectedJobType}
                      onChange={(e) => {
                        setSelectedJobType(e.target.value);
                        // Clear any selected job when filter changes
                        setSelectedJob(null);
                      }}
                      className="loyverse-input mt-1 w-full"
                    >
                      <option value="">All Units/Divisions/Departments</option>
                      {jobStats.units?.map(unit => (
                        <option key={unit.name} value={unit.name}>{unit.name} ({unit.count})</option>
                      ))}
                      {jobStats.divisions?.map(division => (
                        <option key={division.name} value={division.name}>{division.name} ({division.count})</option>
                      ))}
                      {jobStats.departments?.map(department => (
                        <option key={department.name} value={department.name}>{department.name} ({department.count})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setJobSearchTerm('');
                        setSelectedJobType('');
                        setSelectedJob(null);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Jobs List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleJobSelection(job)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedJob?.id === job.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{job.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-1" />
                              {job.unit}
                            </span>
                            <span>{job.division}</span>
                            <span>{job.department}</span>
                          </div>
                        </div>
                        {selectedJob?.id === job.id && (
                          <div className="ml-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Competencies Selection */}
          <div className="lg:col-span-1">
            <Card className="loyverse-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  <span>Add Competencies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Competency Filters */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="competency-search">Search Competencies</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="competency-search"
                        placeholder="Search by name, definition, or family..."
                        value={competencySearchTerm}
                        onChange={(e) => setCompetencySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="competency-type">Type</Label>
                      <select
                        value={selectedCompetencyType}
                        onChange={(e) => {
                          setSelectedCompetencyType(e.target.value);
                          // Clear family filter when type changes
                          setSelectedCompetencyFamily('');
                        }}
                        className="loyverse-input mt-1 w-full"
                      >
                        <option value="">All Types</option>
                        <option value="TECHNICAL">Technical</option>
                        <option value="NON_TECHNICAL">Non-Technical</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="competency-family">Family</Label>
                      <select
                        value={selectedCompetencyFamily}
                        onChange={(e) => setSelectedCompetencyFamily(e.target.value)}
                        className="loyverse-input mt-1 w-full"
                      >
                        <option value="">All Families</option>
                        {competencyStats.families?.map(family => (
                          <option key={family.name} value={family.name}>{family.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompetencySearchTerm('');
                        setSelectedCompetencyType('');
                        setSelectedCompetencyFamily('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>


                {/* Competencies List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredCompetencies.map((competency) => {
                    const isLinked = isCompetencyLinked(competency.id);
                    return (
                      <div
                        key={competency.id}
                        className={`p-4 border rounded-lg ${
                          isLinked 
                            ? 'border-gray-300 bg-gray-100 opacity-75' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{competency.name}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFamilyColor(competency.family)}`}>
                              {competency.family}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{competency.definition}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              competency.type === 'TECHNICAL' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {competency.type === 'TECHNICAL' ? 'Technical' : 'Non-Technical'}
                            </span>
                            <span className="flex items-center">
                              <Target className="h-3 w-3 mr-1" />
                              {competency.levels?.length || 0} Levels
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Level Selection and Add Button */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {isLinked ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-gray-600">Already linked to this job</span>
                            </div>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Linked
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  addCompetencyToJob(competency, e.target.value);
                                  e.target.value = ''; // Reset selection
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Level</option>
                              <option value="BASIC">Basic</option>
                              <option value="INTERMEDIATE">Intermediate</option>
                              <option value="ADVANCED">Advanced</option>
                              <option value="MASTERY">Mastery</option>
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const level = prompt('Enter level (BASIC, INTERMEDIATE, ADVANCED, MASTERY):');
                                if (level && ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'].includes(level.toUpperCase())) {
                                  addCompetencyToJob(competency, level.toUpperCase());
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Job Profile Preview */}
          <div className="lg:col-span-1">
            <Card className="loyverse-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span>Job Profile Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedJob ? (
                  <div className="space-y-4">
                    {/* Selected Job */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Selected Job</h4>
                      <h5 className="font-medium text-gray-900">{selectedJob.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">{selectedJob.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{selectedJob.unit}</span>
                        <span>{selectedJob.division}</span>
                        <span>{selectedJob.department}</span>
                      </div>
                    </div>

                    {/* Existing Competencies */}
                    {existingJobCompetencies.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                          Existing Competencies ({existingJobCompetencies.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {existingJobCompetencies.map((mapping) => (
                            <div
                              key={mapping.id}
                              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <BookOpen className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-sm text-gray-900">
                                    {mapping.competency.name}
                                  </span>
                                </div>
                                <Badge className={`text-xs ${getLevelColor(mapping.requiredLevel)}`}>
                                  {mapping.requiredLevel}
                                </Badge>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                Existing
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Competencies */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Plus className="h-4 w-4 mr-2 text-green-600" />
                        New Competencies ({jobCompetencies.length})
                      </h4>
                      {jobCompetencies.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">
                          {existingJobCompetencies.length > 0 
                            ? 'Add additional competencies below' 
                            : 'No competencies added yet'
                          }
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {jobCompetencies.map((comp, index) => (
                            <div
                              key={`${comp.competency.id}-${index}`}
                              className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <BookOpen className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-sm text-gray-900">
                                    {comp.competency.name}
                                  </span>
                                </div>
                                <Badge className={`text-xs ${getLevelColor(comp.level)}`}>
                                  {comp.level}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  New
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCompetencyFromJob(comp.competency.id)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Create Profile Button */}
                    <Button
                      onClick={handleCreateJobProfile}
                      disabled={addMappingMutation.isPending || jobCompetencies.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {addMappingMutation.isPending 
                        ? 'Adding Competencies...' 
                        : existingJobCompetencies.length > 0 
                          ? `Add ${jobCompetencies.length} New Competencies`
                          : `Create Job Profile (${jobCompetencies.length} competencies)`
                      }
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a job to start creating the competency profile</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMapping;