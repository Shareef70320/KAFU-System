import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Briefcase,
  BookOpen,
  Target,
  Building2,
  ArrowLeft
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

  // State for selected items
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('');

  // Fetch jobs
  const { data: jobsData, error: jobsError } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs').then(res => res.data),
    retry: 1,
  });

  // Fetch competencies
  const { data: competenciesData, error: competenciesError } = useQuery({
    queryKey: ['competencies'],
    queryFn: () => api.get('/competencies').then(res => res.data),
    retry: 1,
  });

  const jobs = jobsData?.jobs || [];
  const competencies = competenciesData?.competencies || [];

  // Calculate stats from jobs data
  const jobStats = React.useMemo(() => {
    if (!jobs.length) return { units: [], divisions: [], departments: [] };
    
    const units = [...new Set(jobs.map(job => job.unit).filter(Boolean))].map(unit => ({ name: unit, count: jobs.filter(job => job.unit === unit).length }));
    const divisions = [...new Set(jobs.map(job => job.division).filter(Boolean))].map(division => ({ name: division, count: jobs.filter(job => job.division === division).length }));
    const departments = [...new Set(jobs.map(job => job.department).filter(Boolean))].map(department => ({ name: department, count: jobs.filter(job => job.department === department).length }));
    
    return { units, divisions, departments };
  }, [jobs]);

  // Calculate stats from competencies data
  const competencyStats = React.useMemo(() => {
    if (!competencies.length) return { types: [], families: [] };
    
    const types = [...new Set(competencies.map(comp => comp.type).filter(Boolean))].map(type => ({ name: type, count: competencies.filter(comp => comp.type === type).length }));
    const families = [...new Set(competencies.map(comp => comp.family).filter(Boolean))].map(family => ({ name: family, count: competencies.filter(comp => comp.family === family).length }));
    
    return { types, families };
  }, [competencies]);

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

  // Create mapping mutation
  const addMappingMutation = useMutation({
    mutationFn: (mappingData) => api.post('/job-competencies', mappingData),
    onSuccess: () => {
      toast({
        title: "Mapping Created",
        description: "Job-competency mapping has been created successfully.",
      });
      queryClient.invalidateQueries(['jobCompetencies']);
      // Reset selections
      setSelectedJob(null);
      setSelectedCompetency(null);
      setSelectedLevel('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create mapping",
        variant: "destructive",
      });
    },
  });

  const handleCreateMapping = () => {
    if (!selectedJob || !selectedCompetency || !selectedLevel) {
      toast({
        title: "Missing Information",
        description: "Please select a job, competency, and required level",
        variant: "destructive",
      });
      return;
    }

    addMappingMutation.mutate({
      jobId: selectedJob.id,
      competencyId: selectedCompetency.id,
      requiredLevel: selectedLevel,
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

  // Show error if any API calls failed
  if (jobsError || competenciesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
          <p className="text-gray-600 mb-4">There was an error loading the required data:</p>
          <div className="space-y-2 text-sm text-gray-500">
            {jobsError && <p>Jobs: {jobsError.message}</p>}
            {competenciesError && <p>Competencies: {competenciesError.message}</p>}
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
                <span>Back to Mappings</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Add Job-Competency Mapping</h1>
                <p className="text-gray-600 mt-1">Link jobs to competencies with required proficiency levels</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Jobs */}
          <div className="space-y-6">
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
                      onChange={(e) => setSelectedJobType(e.target.value)}
                      className="loyverse-input mt-1 w-full"
                    >
                      <option value="">All Units/Divisions/Departments</option>
                      {jobStats.units?.map(unit => (
                        <option key={unit.name} value={unit.name}>{unit.name}</option>
                      ))}
                      {jobStats.divisions?.map(division => (
                        <option key={division.name} value={division.name}>{division.name}</option>
                      ))}
                      {jobStats.departments?.map(department => (
                        <option key={department.name} value={department.name}>{department.name}</option>
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
                      onClick={() => setSelectedJob(job)}
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
                              <span className="text-white text-xs">✓</span>
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

          {/* Right Column - Competencies */}
          <div className="space-y-6">
            <Card className="loyverse-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  <span>Select Competency</span>
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
                        onChange={(e) => setSelectedCompetencyType(e.target.value)}
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
                  {filteredCompetencies.map((competency) => (
                    <div
                      key={competency.id}
                      onClick={() => setSelectedCompetency(competency)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedCompetency?.id === competency.id
                          ? 'border-green-500 bg-green-50'
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
                        {selectedCompetency?.id === competency.id && (
                          <div className="ml-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
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
        </div>

        {/* Selection Summary and Level Selection */}
        {selectedJob && selectedCompetency && (
          <div className="mt-8">
            <Card className="loyverse-card border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <Target className="h-5 w-5" />
                  <span>Create Mapping</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Selected Job</h4>
                    <div className="p-3 bg-white rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-gray-900">{selectedJob.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">{selectedJob.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{selectedJob.unit}</span>
                        <span>{selectedJob.division}</span>
                        <span>{selectedJob.department}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Selected Competency</h4>
                    <div className="p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="font-semibold text-gray-900">{selectedCompetency.name}</h5>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFamilyColor(selectedCompetency.family)}`}>
                          {selectedCompetency.family}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{selectedCompetency.definition}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedCompetency.type === 'TECHNICAL' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedCompetency.type === 'TECHNICAL' ? 'Technical' : 'Non-Technical'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="level-select" className="text-blue-800">Required Level: *</Label>
                      <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="loyverse-input mt-1 w-48"
                        required
                      >
                        <option value="">Select Level</option>
                        <option value="BASIC">Basic</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                        <option value="MASTERY">Mastery</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleCreateMapping}
                      disabled={addMappingMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {addMappingMutation.isPending ? 'Creating...' : 'Create Mapping'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddMapping;