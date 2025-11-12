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
  Check,
  AlertTriangle
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

  // State for selected jobs and competencies
  const [selectedJobs, setSelectedJobs] = useState([]); // array of job objects
  const [jcpCode, setJcpCode] = useState('');
  const [jobCompetencies, setJobCompetencies] = useState([]); // Array of {competency, level}
  const [existingJobCompetencies, setExistingJobCompetencies] = useState([]); // For preview: based on first selected job

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

  // Fetch existing job competency mappings - get all mappings without pagination
  const { data: mappingsData, error: mappingsError } = useQuery({
    queryKey: ['jobCompetencies'],
    queryFn: () => api.get('/job-competencies?limit=10000').then(res => res.data),
    retry: 1,
  });

  const jobs = jobsData?.jobs || [];
  const competencies = competenciesData?.competencies || [];
  const mappings = mappingsData?.mappings || [];

  // Function to get existing competencies for a job
  const getExistingJobCompetencies = (jobId) => {
    return mappings.filter(mapping => mapping.jobId === jobId);
  };
  
  // Check if a job already has a profile (has mappings)
  const jobHasProfile = (jobId) => {
    return mappings.some(mapping => mapping.jobId === jobId);
  };

  // Handle job toggle selection
  const handleJobSelection = (job) => {
    setSelectedJobs(prev => {
      const exists = prev.find(j => j.id === job.id);
      if (exists) {
        const next = prev.filter(j => j.id !== job.id);
        // Update existing preview based on first remaining job
        const first = next[0];
        setExistingJobCompetencies(first ? getExistingJobCompetencies(first.id) : []);
        return next;
      } else {
        const next = [...prev, job];
        const first = next[0] || job;
        setExistingJobCompetencies(getExistingJobCompetencies(first.id));
        // If only one job selected, prefill JCP code with its job code
        if (next.length === 1 && !jcpCode) {
          setJcpCode(job.code || '');
        }
        return next;
      }
    });
    // Clear any manually added competencies when selection changes for the first time
    setJobCompetencies([]);
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

  // Check if a competency is already linked to the first selected job (for guidance)
  const isCompetencyLinked = (competencyId) => {
    if (selectedJobs.length === 0) return false;
    // Check if it's in existing competencies for preview job
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

  // Create job profiles with all competencies for selected jobs (bulk)
  const addMappingMutation = useMutation({
    mutationFn: async ({ jobIds, competencies, jcpCode }) => {
      // First, delete existing mappings for all selected jobs (override behavior)
      for (const jobId of jobIds) {
        try {
          // Fetch all existing mappings for this job
          const response = await api.get(`/job-competencies?jobId=${jobId}&limit=1000`);
          const existingMappings = response.data?.mappings || response.data || [];
          if (existingMappings.length > 0) {
            // Delete each existing mapping
            for (const mapping of existingMappings) {
              try {
                await api.delete(`/job-competencies/${mapping.id}`);
              } catch (deleteError) {
                console.warn(`Failed to delete existing mapping ${mapping.id}:`, deleteError);
                // Continue even if deletion fails - the bulk endpoint will handle duplicates
              }
            }
          }
        } catch (error) {
          console.warn(`Error fetching/deleting existing mappings for job ${jobId}:`, error);
          // Continue - we'll try to create new mappings anyway
        }
      }
      
      // Build bulk payload for all jobs
      const allMappings = [];
      for (const jobId of jobIds) {
        for (const comp of competencies) {
          allMappings.push({
            jobId,
            competencyId: comp.competency.id,
            requiredLevel: comp.level,
            isRequired: true
          });
        }
      }
      // Send in batches to avoid request size/timeouts and to surface granular errors
      const batchSize = 100;
      const aggregateErrors = [];
      let hasSuccess = false;
      for (let i = 0; i < allMappings.length; i += batchSize) {
        const batch = allMappings.slice(i, i + batchSize);
        // eslint-disable-next-line no-await-in-loop
        const res = await api.post('/job-competencies/bulk', { mappings: batch }).catch((err) => {
          // Capture any unexpected server error
          aggregateErrors.push(err?.response?.data?.message || err.message || 'Unknown error');
          return null;
        });
        if (res?.data) {
          if (res.data.success > 0) {
            hasSuccess = true;
          }
          if (res.data.errors > 0 && Array.isArray(res.data.errors)) {
            aggregateErrors.push(...res.data.errors.map(e => e?.error || 'Unknown mapping error'));
          }
        }
      }
      
      // Set JCP code for all selected jobs, if provided - ALWAYS try to set it even if there were mapping errors
      if (jcpCode && jcpCode.trim().length > 0) {
        try {
          await api.post('/jobs/set-jcp-code', { jobIds, jcpCode: jcpCode.trim() });
        } catch (jcpError) {
          // Bulk failed; attempt per-job fallback to ensure JCP is applied
          try {
            for (const jobId of jobIds) {
              // eslint-disable-next-line no-await-in-loop
              await api.post('/jobs/set-jcp-code', { jobIds: [jobId], jcpCode: jcpCode.trim() });
            }
          } catch (perJobError) {
            console.error('Error setting JCP code (per-job fallback):', perJobError);
            aggregateErrors.push(`Failed to set JCP code: ${perJobError?.response?.data?.message || perJobError.message || 'Unknown error'}`);
          }
        }
      }
      
      // If there were errors but also some success, treat as partial success
      if (aggregateErrors.length > 0) {
        if (hasSuccess) {
          const message = `Mappings created with some errors (${aggregateErrors.length}). First error: ${aggregateErrors[0]}`;
          const error = new Error(message);
          error._partial = true;
          throw error;
        } else {
          // All failed
          throw new Error(`All mappings failed. First error: ${aggregateErrors[0]}`);
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Job Profiles Updated",
        description: `Applied ${jobCompetencies.length} competencies to ${selectedJobs.length} job(s)` + (jcpCode ? ` with JCP code "${jcpCode}"` : ''),
      });
      queryClient.invalidateQueries(['jobCompetencies']);
      queryClient.invalidateQueries(['jobs']);
      // Reset selections
      setSelectedJobs([]);
      setJcpCode('');
      setJobCompetencies([]);
      setExistingJobCompetencies([]);
    },
    onError: (error) => {
      const partial = error && error._partial;
      toast({
        title: partial ? "Partial Success" : "Error",
        description: error.response?.data?.message || error.message || "Failed to create job profile",
        variant: partial ? "default" : "destructive",
      });
    },
  });

  const handleCreateJobProfile = () => {
    if (selectedJobs.length === 0 || jobCompetencies.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one job and add at least one competency",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for JCP code uniqueness is handled on DB uniqueness if we enforce later; here we just pass through
    addMappingMutation.mutate({
      jobIds: selectedJobs.map(j => j.id),
      competencies: jobCompetencies,
      jcpCode
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
                        setSelectedJobs([]);
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
                        setSelectedJobs([]);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Jobs List (multi-select) */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleJobSelection(job)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedJobs.some(j => j.id === job.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{job.title}</h3>
                            {job.code && (
                              <Badge variant="outline" className="text-xs">{job.code}</Badge>
                            )}
                            {jobHasProfile(job.id) && (
                              <Badge className="text-xs bg-amber-100 text-amber-800 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Has Profile
                              </Badge>
                            )}
                          </div>
                          {jobHasProfile(job.id) && (
                            <p className="text-xs text-amber-700 mt-1 italic">
                              This job already has a profile. Creating a new one will replace it.
                            </p>
                          )}
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
                        {selectedJobs.some(j => j.id === job.id) && (
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
                {selectedJobs.length > 0 ? (
                  <div className="space-y-4">
                    {/* JCP Code Input */}
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Label htmlFor="jcp-code">JCP Code (applied to all selected jobs)</Label>
                      <Input
                        id="jcp-code"
                        placeholder="Enter JCP code (e.g., use a representative job code)"
                        value={jcpCode}
                        onChange={(e) => setJcpCode(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        Tip: If creating a shared profile for multiple jobs, use the source job code as the common JCP code.
                      </p>
                    </div>

                    {/* Selected Jobs */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Selected Jobs ({selectedJobs.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedJobs.map(job => (
                          <div key={job.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-900">{job.title}</span>
                            <Badge variant="outline" className="text-xs">{job.code}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Existing Competencies */}
                    {existingJobCompetencies.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                          Existing Competencies (from first selected job) ({existingJobCompetencies.length})
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
                      disabled={addMappingMutation.isPending || jobCompetencies.length === 0 || selectedJobs.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {addMappingMutation.isPending 
                        ? 'Adding Competencies...' 
                        : `Apply ${jobCompetencies.length} Competencies to ${selectedJobs.length} Job(s)`
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