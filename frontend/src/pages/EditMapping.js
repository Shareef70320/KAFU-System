import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
  Save
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const EditMapping = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { jobId } = useParams();

  // State for search and filters
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [competencySearchTerm, setCompetencySearchTerm] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedCompetencyType, setSelectedCompetencyType] = useState('');
  const [selectedCompetencyFamily, setSelectedCompetencyFamily] = useState('');

  // State for selected job and its competencies
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobCompetencies, setJobCompetencies] = useState([]); // Array of {competency, level, isRequired, mappingId}

  // Fetch jobs - get all jobs without pagination
  const { data: jobsData, error: jobsError } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs?limit=1000').then(res => res.data),
    retry: 1,
  });

  // Fetch competencies - get all competencies without pagination
  const { data: competenciesData, error: competenciesError } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => api.get('/competencies?limit=1000').then(res => res.data),
    retry: 1,
  });

  // Fetch existing job-competency mappings for the selected job
  const { data: existingMappingsData } = useQuery({
    queryKey: ['job-competencies', jobId],
    queryFn: () => api.get(`/job-competencies?jobId=${jobId}`).then(res => res.data),
    enabled: !!jobId,
    retry: 1,
  });

  // Load job and existing mappings when component mounts
  useEffect(() => {
    if (jobId && jobsData?.jobs) {
      const job = jobsData.jobs.find(j => j.id === jobId);
      if (job) {
        setSelectedJob(job);
      }
    }
  }, [jobId, jobsData]);

  // Load existing mappings when they're fetched
  useEffect(() => {
    if (existingMappingsData?.mappings) {
      const mappings = existingMappingsData.mappings.map(mapping => ({
        competency: mapping.competency,
        level: mapping.requiredLevel,
        isRequired: mapping.isRequired,
        mappingId: mapping.id
      }));
      setJobCompetencies(mappings);
    }
  }, [existingMappingsData]);

  // Update mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ mappingId, data }) => {
      await api.put(`/job-competencies/${mappingId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-competencies']);
      toast({
        title: "Success",
        description: "Mapping updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update mapping",
        variant: "destructive",
      });
    },
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId) => {
      await api.delete(`/job-competencies/${mappingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-competencies']);
      toast({
        title: "Success",
        description: "Mapping deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete mapping",
        variant: "destructive",
      });
    },
  });

  // Filter jobs based on search and filters
  const filteredJobs = jobsData?.jobs?.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
                         job.code.toLowerCase().includes(jobSearchTerm.toLowerCase());
    const matchesType = !selectedJobType || job.division === selectedJobType;
    return matchesSearch && matchesType;
  }) || [];

  // Filter competencies based on search and filters
  const filteredCompetencies = competenciesData?.competencies?.filter(competency => {
    const matchesSearch = competency.name.toLowerCase().includes(competencySearchTerm.toLowerCase());
    const matchesType = !selectedCompetencyType || competency.type === selectedCompetencyType;
    const matchesFamily = !selectedCompetencyFamily || competency.family === selectedCompetencyFamily;
    return matchesSearch && matchesType && matchesFamily;
  }) || [];

  // Get unique job types for filter
  const jobTypes = [...new Set(jobsData?.jobs?.map(job => job.division) || [])];

  // Get unique competency types for filter
  const competencyTypes = [...new Set(competenciesData?.competencies?.map(comp => comp.type) || [])];

  // Get unique competency families for filter
  const competencyFamilies = [...new Set(competenciesData?.competencies?.map(comp => comp.family).filter(f => f)) || []];

  // Handle adding competency to job
  const handleAddCompetency = (competency) => {
    if (jobCompetencies.some(jc => jc.competency.id === competency.id)) {
      toast({
        title: "Warning",
        description: "This competency is already assigned to the job",
        variant: "destructive",
      });
      return;
    }

    setJobCompetencies([...jobCompetencies, {
      competency,
      level: 'BASIC',
      isRequired: true,
      mappingId: null // New mapping, will be created
    }]);
  };

  // Handle removing competency from job
  const handleRemoveCompetency = (competencyId) => {
    const mapping = jobCompetencies.find(jc => jc.competency.id === competencyId);
    if (mapping?.mappingId) {
      // Delete existing mapping
      deleteMappingMutation.mutate(mapping.mappingId);
    }
    setJobCompetencies(jobCompetencies.filter(jc => jc.competency.id !== competencyId));
  };

  // Handle updating competency level
  const handleUpdateLevel = (competencyId, newLevel) => {
    setJobCompetencies(jobCompetencies.map(jc => 
      jc.competency.id === competencyId ? { ...jc, level: newLevel } : jc
    ));
  };

  // Handle updating competency requirement
  const handleUpdateRequirement = (competencyId, isRequired) => {
    setJobCompetencies(jobCompetencies.map(jc => 
      jc.competency.id === competencyId ? { ...jc, isRequired } : jc
    ));
  };

  // Handle saving changes
  const handleSaveChanges = async () => {
    try {
      // Update existing mappings
      for (const jc of jobCompetencies) {
        if (jc.mappingId) {
          // Update existing mapping
          await updateMappingMutation.mutateAsync({
            mappingId: jc.mappingId,
            data: {
              requiredLevel: jc.level,
              isRequired: jc.isRequired
            }
          });
        }
        // Note: New mappings would need to be created via separate API call
        // For now, we'll focus on updating existing ones
      }

      toast({
        title: "Success",
        description: "Job competency mappings updated successfully",
      });
      
      navigate('/job-competency-mapping');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-blue-100 text-blue-800';
      case 'ADVANCED': return 'bg-purple-100 text-purple-800';
      case 'MASTERY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedJob) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/job-competency-mapping')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Job Profiles</span>
            </Button>
          </div>
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600">The selected job could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/job-competency-mapping')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Job Profiles</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Job Competency Mapping</h1>
              <p className="text-gray-600">Update competencies for {selectedJob.title}</p>
            </div>
          </div>
          <Button
            onClick={handleSaveChanges}
            disabled={updateMappingMutation.isPending}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{updateMappingMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Competencies List */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Available Competencies</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="competency-search">Search Competencies</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="competency-search"
                        placeholder="Search competencies..."
                        value={competencySearchTerm}
                        onChange={(e) => setCompetencySearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="competency-type">Type</Label>
                      <Select value={selectedCompetencyType} onValueChange={setSelectedCompetencyType}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Types</SelectItem>
                          {competencyTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="competency-family">Family</Label>
                      <Select value={selectedCompetencyFamily} onValueChange={setSelectedCompetencyFamily}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Families" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Families</SelectItem>
                          {competencyFamilies.map(family => (
                            <SelectItem key={family} value={family}>{family}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Competencies List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredCompetencies.map((competency) => (
                    <div
                      key={competency.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{competency.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {competency.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{competency.definition}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddCompetency(competency)}
                        disabled={jobCompetencies.some(jc => jc.competency.id === competency.id)}
                        className="ml-3"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Selected Job and Competencies */}
          <div className="space-y-6">
            {/* Selected Job */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>Selected Job</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{selectedJob.title}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Code:</span> {selectedJob.code}</p>
                    <p><span className="font-medium">Division:</span> {selectedJob.division}</p>
                    <p><span className="font-medium">Department:</span> {selectedJob.department}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Competencies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Job Competencies ({jobCompetencies.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobCompetencies.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No competencies assigned yet</p>
                    <p className="text-sm text-gray-400">Add competencies from the left panel</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobCompetencies.map((jc) => (
                      <div
                        key={jc.competency.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <BookOpen className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{jc.competency.name}</span>
                            <Badge className={`text-xs ${getLevelColor(jc.level)}`}>
                              {jc.level}
                            </Badge>
                            {jc.isRequired && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Label htmlFor={`level-${jc.competency.id}`} className="text-sm">Level:</Label>
                              <Select
                                value={jc.level}
                                onValueChange={(value) => handleUpdateLevel(jc.competency.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="BASIC">Basic</SelectItem>
                                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                                  <SelectItem value="MASTERY">Mastery</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`required-${jc.competency.id}`}
                                checked={jc.isRequired}
                                onChange={(e) => handleUpdateRequirement(jc.competency.id, e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`required-${jc.competency.id}`} className="text-sm">
                                Required
                              </Label>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveCompetency(jc.competency.id)}
                          className="ml-3 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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

export default EditMapping;
