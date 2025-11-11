import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
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
  X,
  Check,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Info,
  Star,
  Award,
  TrendingUp
} from 'lucide-react';
import api from '../lib/api';

const JobCompetencyMapping = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [competencyFilter, setCompetencyFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // State for competency details modal
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  
  // State for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  
  // State for job profile edit modal (matching Create page structure)
  const [showJobProfileModal, setShowJobProfileModal] = useState(false);
  const [editingJobProfile, setEditingJobProfile] = useState(null);
  const [editJobSearchTerm, setEditJobSearchTerm] = useState('');
  const [editSelectedJobType, setEditSelectedJobType] = useState('');
  const [editCompetencySearchTerm, setEditCompetencySearchTerm] = useState('');
  const [editSelectedCompetencyType, setEditSelectedCompetencyType] = useState('');
  const [editSelectedCompetencyFamily, setEditSelectedCompetencyFamily] = useState('');
  const [editSelectedJobs, setEditSelectedJobs] = useState([]);
  const [editJcpCode, setEditJcpCode] = useState('');
  const [editJobCompetencies, setEditJobCompetencies] = useState([]); // New competencies to add
  
  // Group Apply JCP state
  const [showGroupApplyModal, setShowGroupApplyModal] = useState(false);
  const [sourceJobId, setSourceJobId] = useState('');
  const [targetJobIds, setTargetJobIds] = useState([]);
  const [jobSearchSource, setJobSearchSource] = useState('');
  const [jobSearchTargets, setJobSearchTargets] = useState('');
  const [replaceTargets, setReplaceTargets] = useState(true);

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

  // Fetch job-competency mappings - get all mappings without pagination
  const { data: mappingsData, isLoading, error } = useQuery({
    queryKey: ['jobCompetencies'],
    queryFn: async () => {
      const response = await api.get('/job-competencies?limit=10000');
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
    if (!mappings.length) return { total: 0, active: 0, uniqueJobs: 0, jobsWithJcp: 0 };
    
    const activeMappings = mappings.filter(m => m.isActive);
    const uniqueJobs = [...new Set(mappings.map(m => m.job?.id).filter(Boolean))].length;
    // Count jobs that have a JCP code
    const jobsWithJcp = jobs.filter(job => {
      const jcpCode = job.jcpCode || job.jcp_code;
      return jcpCode && jcpCode.trim().length > 0;
    }).length;
    
    return {
      total: mappings.length,
      active: activeMappings.length,
      uniqueJobs,
      jobsWithJcp
    };
  }, [mappings, jobs]);

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

  // Group Apply mutation
  const groupApplyMutation = useMutation({
    mutationFn: async ({ sourceJobId, targetJobIds, replace }) => {
      const payload = { sourceJobId, targetJobIds, replace };
      const res = await api.post('/job-competencies/group-apply', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobCompetencies']);
      setShowGroupApplyModal(false);
      // Reset state
      setSourceJobId('');
      setTargetJobIds([]);
      setJobSearchSource('');
      setJobSearchTargets('');
      // Optional: show toast if available (reusing alert as fallback)
      // eslint-disable-next-line no-alert
      window.alert(`Applied JCP to ${data.targetJobIds.length} job(s). Suggested JCP code: ${data.suggestedJcpCode || 'N/A'}`);
    }
  });

  const filteredJobsBySearch = (search) => {
    const s = (search || '').toLowerCase();
    if (!s) return jobs;
    return jobs.filter(j =>
      j.title?.toLowerCase().includes(s) ||
      j.code?.toLowerCase().includes(s)
    );
  };

  const toggleTargetJob = (id) => {
    setTargetJobIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Update mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await api.put(`/job-competencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobCompetencies']);
      setShowEditModal(false);
      setEditingMapping(null);
    }
  });

  // Create mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data) => {
      await api.post('/job-competencies', data);
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

  // Handle delete from job profile edit modal
  const handleDeleteFromJobProfile = (mappingId) => {
    if (window.confirm('Are you sure you want to delete this competency from the job profile?')) {
      deleteMappingMutation.mutate(mappingId, {
        onSuccess: () => {
          // Update the local state to remove the deleted competency
          if (editingJobProfile) {
            const updatedCompetencies = editingJobProfile.competencies.filter(comp => comp.id !== mappingId);
            setEditingJobProfile({
              ...editingJobProfile,
              competencies: updatedCompetencies
            });
            
            // Also update available competencies to include the deleted one
            const deletedMapping = editingJobProfile.competencies.find(comp => comp.id === mappingId);
            if (deletedMapping) {
              // No-op: available list is derived dynamically in the Edit modal design
            }
          }
        }
      });
    }
  };

  const handleEditMapping = (mapping) => {
    setEditingMapping(mapping);
    setShowEditModal(true);
  };

  const handleUpdateMapping = (e) => {
    e.preventDefault();
    if (editingMapping) {
      updateMappingMutation.mutate({
        id: editingMapping.id,
        data: {
          requiredLevel: editingMapping.requiredLevel,
          isRequired: editingMapping.isRequired
        }
      });
    }
  };

  // Handle job profile editing - initialize with Create page structure
  const handleEditJobProfile = (profile) => {
    setEditingJobProfile(profile);
    
    // Find all jobs with the same JCP code (if exists)
    const jcpCode = profile.job.jcpCode || profile.job.jcp_code;
    let relatedJobs = [profile.job];
    if (jcpCode) {
      relatedJobs = jobs.filter(j => (j.jcpCode || j.jcp_code) === jcpCode);
    }
    
    setEditSelectedJobs(relatedJobs);
    setEditJcpCode(jcpCode || profile.job.code || '');
    setEditJobCompetencies([]); // Start with empty new competencies
    setEditJobSearchTerm('');
    setEditSelectedJobType('');
    setEditCompetencySearchTerm('');
    setEditSelectedCompetencyType('');
    setEditSelectedCompetencyFamily('');
    
    setShowJobProfileModal(true);
  };

  // Handle adding new competency to job profile (for Edit modal - add to new list)
  const handleAddCompetencyToEditProfile = (competency, level) => {
    // Check if already in new competencies list
    const existsInNew = editJobCompetencies.some(comp => comp.competency.id === competency.id);
    if (existsInNew) {
      toast({
        title: "Competency Already Added",
        description: `${competency.name} is already in the new competencies list`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if already in existing competencies
    if (editingJobProfile) {
      const existsInExisting = editingJobProfile.competencies.some(comp => comp.competency.id === competency.id);
      if (existsInExisting) {
        toast({
          title: "Competency Already Linked",
          description: `${competency.name} is already linked to this job profile`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setEditJobCompetencies([...editJobCompetencies, { competency, level }]);
    toast({
      title: "Competency Added",
      description: `${competency.name} (${level}) added to job profile`,
    });
  };
  
  // Remove competency from new list
  const handleRemoveCompetencyFromEditProfile = (competencyId) => {
    setEditJobCompetencies(editJobCompetencies.filter(comp => comp.competency.id !== competencyId));
  };
  
  // Handle job selection in edit modal
  const handleEditJobSelection = (job) => {
    setEditSelectedJobs(prev => {
      const exists = prev.find(j => j.id === job.id);
      if (exists) {
        return prev.filter(j => j.id !== job.id);
      } else {
        return [...prev, job];
      }
    });
  };

  // Handle updating competency level in job profile
  const handleUpdateCompetencyLevel = (mappingId, newLevel) => {
    updateMappingMutation.mutate({
      id: mappingId,
      data: {
        requiredLevel: newLevel,
        isRequired: true
      }
    }, {
      onSuccess: () => {
        // Update local state to reflect the level change
        if (editingJobProfile) {
          const updatedCompetencies = editingJobProfile.competencies.map(comp => 
            comp.id === mappingId 
              ? { ...comp, requiredLevel: newLevel }
              : comp
          );
          setEditingJobProfile({
            ...editingJobProfile,
            competencies: updatedCompetencies
          });
        }
      }
    });
  };
  
  // Save changes from edit modal
  const handleSaveEditProfile = () => {
    if (editSelectedJobs.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one job",
        variant: "destructive",
      });
      return;
    }
    
    // Add new competencies to all selected jobs
    if (editJobCompetencies.length > 0) {
      const jobIds = editSelectedJobs.map(j => j.id);
      const mappings = [];
      for (const jobId of jobIds) {
        for (const comp of editJobCompetencies) {
          mappings.push({
            jobId,
            competencyId: comp.competency.id,
            requiredLevel: comp.level,
            isRequired: true
          });
        }
      }
      
      // Create mappings in bulk
      api.post('/job-competencies/bulk', { mappings })
        .then(() => {
          // Update JCP code if changed
          if (editJcpCode && editJcpCode.trim().length > 0) {
            return api.post('/jobs/set-jcp-code', { 
              jobIds, 
              jcpCode: editJcpCode.trim() 
            });
          }
        })
        .then(() => {
          toast({
            title: "Job Profile Updated",
            description: `Applied ${editJobCompetencies.length} new competencies to ${editSelectedJobs.length} job(s)`,
          });
          queryClient.invalidateQueries(['jobCompetencies']);
          queryClient.invalidateQueries(['jobs']);
          setShowJobProfileModal(false);
          setEditingJobProfile(null);
          setEditSelectedJobs([]);
          setEditJcpCode('');
          setEditJobCompetencies([]);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: error.response?.data?.message || "Failed to update job profile",
            variant: "destructive",
          });
        });
    } else {
      // Just update JCP code if no new competencies
      if (editJcpCode && editJcpCode.trim().length > 0) {
        const jobIds = editSelectedJobs.map(j => j.id);
        api.post('/jobs/set-jcp-code', { 
          jobIds, 
          jcpCode: editJcpCode.trim() 
        })
        .then(() => {
          toast({
            title: "JCP Code Updated",
            description: `Updated JCP code for ${editSelectedJobs.length} job(s)`,
          });
          queryClient.invalidateQueries(['jobs']);
          setShowJobProfileModal(false);
          setEditingJobProfile(null);
          setEditSelectedJobs([]);
          setEditJcpCode('');
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: error.response?.data?.message || "Failed to update JCP code",
            variant: "destructive",
          });
        });
      } else {
        // No changes, just close
        setShowJobProfileModal(false);
        setEditingJobProfile(null);
        setEditSelectedJobs([]);
        setEditJcpCode('');
        setEditJobCompetencies([]);
      }
    }
  };
  
  // Calculate stats for edit modal (similar to AddMapping)
  const editJobStats = React.useMemo(() => {
    if (!jobs.length) return { units: [], divisions: [], departments: [] };
    
    let filteredJobs = jobs;
    if (editSelectedJobType) {
      filteredJobs = jobs.filter(job => 
        job.unit === editSelectedJobType || 
        job.division === editSelectedJobType || 
        job.department === editSelectedJobType
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
  }, [jobs, editSelectedJobType]);
  
  const editCompetencyStats = React.useMemo(() => {
    if (!competencies.length) return { types: [], families: [] };
    
    const types = [...new Set(competencies.map(comp => comp.type).filter(Boolean))].map(type => ({ 
      name: type, 
      count: competencies.filter(comp => comp.type === type).length 
    }));
    
    let filteredCompetencies = competencies;
    if (editSelectedCompetencyType) {
      filteredCompetencies = competencies.filter(comp => comp.type === editSelectedCompetencyType);
    }
    
    const families = [...new Set(filteredCompetencies.map(comp => comp.family).filter(Boolean))].map(family => ({ 
      name: family, 
      count: filteredCompetencies.filter(comp => comp.family === family).length 
    }));
    
    return { types, families };
  }, [competencies, editSelectedCompetencyType]);
  
  // Filter jobs and competencies for edit modal
  const editFilteredJobs = jobs.filter(job => {
    const matchesSearch = editJobSearchTerm === '' || 
      job.title.toLowerCase().includes(editJobSearchTerm.toLowerCase()) ||
      job.code.toLowerCase().includes(editJobSearchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(editJobSearchTerm.toLowerCase());
    
    const matchesType = editSelectedJobType === '' || 
      job.unit === editSelectedJobType ||
      job.division === editSelectedJobType ||
      job.department === editSelectedJobType;
    
    return matchesSearch && matchesType;
  });
  
  const editFilteredCompetencies = competencies.filter(competency => {
    const matchesSearch = editCompetencySearchTerm === '' || 
      competency.name.toLowerCase().includes(editCompetencySearchTerm.toLowerCase()) ||
      competency.definition.toLowerCase().includes(editCompetencySearchTerm.toLowerCase()) ||
      competency.family.toLowerCase().includes(editCompetencySearchTerm.toLowerCase());
    
    const matchesType = editSelectedCompetencyType === '' || competency.type === editSelectedCompetencyType;
    const matchesFamily = editSelectedCompetencyFamily === '' || competency.family === editSelectedCompetencyFamily;
    
    return matchesSearch && matchesType && matchesFamily;
  });
  
  // Check if competency is already linked
  const isEditCompetencyLinked = (competencyId) => {
    if (!editingJobProfile) return false;
    
    // Check existing competencies
    const existsInExisting = editingJobProfile.competencies.some(mapping => mapping.competency.id === competencyId);
    if (existsInExisting) return true;
    
    // Check new competencies
    const existsInNew = editJobCompetencies.some(comp => comp.competency.id === competencyId);
    if (existsInNew) return true;
    
    return false;
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
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowGroupApplyModal(true)}
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Group Apply JCP</span>
              </Button>
              <Button
                onClick={() => navigate('/add-mapping')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Job Profile</span>
              </Button>
            </div>
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
                  <p className="text-sm font-medium text-gray-600">Jobs with JCP</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.jobsWithJcp}</p>
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
                          onClick={() => handleEditJobProfile(profile)}
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
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 group"
                            >
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => handleCompetencyClick(comp.competency, comp.requiredLevel)}
                              >
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
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMapping(comp);
                                  }}
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <div 
                                  className="text-gray-400 group-hover:text-blue-500 cursor-pointer"
                                  onClick={() => handleCompetencyClick(comp.competency, comp.requiredLevel)}
                                >
                                  <Eye className="h-4 w-4" />
                                </div>
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
        {/* Group Apply Modal */}
        {showGroupApplyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Group Apply JCP</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowGroupApplyModal(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Source Job */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Source Job (profile to copy)</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search job by title or code..."
                        value={jobSearchSource}
                        onChange={(e) => setJobSearchSource(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {filteredJobsBySearch(jobSearchSource).map(job => (
                        <div
                          key={job.id}
                          className={`px-3 py-2 cursor-pointer flex items-center justify-between ${sourceJobId === job.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          onClick={() => setSourceJobId(job.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{job.title}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{job.code}</Badge>
                        </div>
                      ))}
                    </div>
                    {sourceJobId && (
                      <p className="text-xs text-green-700 mt-1">Selected source job set.</p>
                    )}
                  </div>

                  {/* Target Jobs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Jobs (apply to)</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search target jobs..."
                        value={jobSearchTargets}
                        onChange={(e) => setJobSearchTargets(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto border rounded-md">
                      {filteredJobsBySearch(jobSearchTargets)
                        .filter(j => j.id !== sourceJobId)
                        .map(job => {
                          const selected = targetJobIds.includes(job.id);
                          return (
                            <div
                              key={job.id}
                              className={`px-3 py-2 cursor-pointer flex items-center justify-between ${selected ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                              onClick={() => toggleTargetJob(job.id)}
                            >
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" readOnly checked={selected} className="rounded border-gray-300" />
                                <span className="text-sm">{job.title}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{job.code}</Badge>
                            </div>
                          );
                        })}
                    </div>
                    {targetJobIds.length > 0 && (
                      <p className="text-xs text-green-700 mt-1">{targetJobIds.length} job(s) selected.</p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="replaceTargets"
                      checked={replaceTargets}
                      onChange={(e) => setReplaceTargets(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="replaceTargets" className="text-sm text-gray-700">
                      Replace existing mappings on target jobs
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setShowGroupApplyModal(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        if (!sourceJobId) {
                          // eslint-disable-next-line no-alert
                          window.alert('Please select a source job.');
                          return;
                        }
                        if (targetJobIds.length === 0) {
                          // eslint-disable-next-line no-alert
                          window.alert('Please select at least one target job.');
                          return;
                        }
                        groupApplyMutation.mutate({ sourceJobId, targetJobIds, replace: replaceTargets });
                      }}
                      disabled={groupApplyMutation.isPending}
                    >
                      {groupApplyMutation.isPending ? 'Applying...' : 'Apply JCP to Selected Jobs'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Mapping Modal */}
        {showEditModal && editingMapping && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">Edit Competency Mapping</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMapping(null);
                  }}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="p-6">
                <form onSubmit={handleUpdateMapping} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Competency
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          {editingMapping.competency.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Level
                    </label>
                    <Select
                      value={editingMapping.requiredLevel}
                      onValueChange={(value) => setEditingMapping({
                        ...editingMapping,
                        requiredLevel: value
                      })}
                    >
                      <SelectTrigger>
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
                      id="isRequired"
                      checked={editingMapping.isRequired}
                      onChange={(e) => setEditingMapping({
                        ...editingMapping,
                        isRequired: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isRequired" className="text-sm font-medium text-gray-700">
                      Required Competency
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingMapping(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMappingMutation.isPending}
                    >
                      {updateMappingMutation.isPending ? 'Updating...' : 'Update Mapping'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Job Profile Edit Modal - Matching Create Page Design */}
        {showJobProfileModal && editingJobProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold">Edit Job Competency Profile</h2>
                    <p className="text-sm text-gray-600">Update job profile with competencies and levels</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowJobProfileModal(false);
                    setEditingJobProfile(null);
                    setEditSelectedJobs([]);
                    setEditJcpCode('');
                    setEditJobCompetencies([]);
                    setEditJobSearchTerm('');
                    setEditSelectedJobType('');
                    setEditCompetencySearchTerm('');
                    setEditSelectedCompetencyType('');
                    setEditSelectedCompetencyFamily('');
                  }}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              {/* Content - Three Column Layout */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Job Selection */}
                  <div>
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
                            <Label htmlFor="edit-job-search">Search Jobs</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="edit-job-search"
                                placeholder="Search by title, code, or description..."
                                value={editJobSearchTerm}
                                onChange={(e) => setEditJobSearchTerm(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="edit-job-type">Filter by Unit/Division/Department</Label>
                            <select
                              value={editSelectedJobType}
                              onChange={(e) => {
                                setEditSelectedJobType(e.target.value);
                              }}
                              className="loyverse-input mt-1 w-full"
                            >
                              <option value="">All Units/Divisions/Departments</option>
                              {editJobStats.units?.map(unit => (
                                <option key={unit.name} value={unit.name}>{unit.name} ({unit.count})</option>
                              ))}
                              {editJobStats.divisions?.map(division => (
                                <option key={division.name} value={division.name}>{division.name} ({division.count})</option>
                              ))}
                              {editJobStats.departments?.map(department => (
                                <option key={department.name} value={department.name}>{department.name} ({department.count})</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditJobSearchTerm('');
                                setEditSelectedJobType('');
                              }}
                            >
                              Clear Filters
                            </Button>
                          </div>
                        </div>

                        {/* Jobs List (multi-select) */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {editFilteredJobs.map((job) => (
                            <div
                              key={job.id}
                              onClick={() => handleEditJobSelection(job)}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                editSelectedJobs.some(j => j.id === job.id)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                    {job.code && (
                                      <Badge variant="outline" className="text-xs">{job.code}</Badge>
                                    )}
                                  </div>
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
                                {editSelectedJobs.some(j => j.id === job.id) && (
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
                  <div>
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
                            <Label htmlFor="edit-competency-search">Search Competencies</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="edit-competency-search"
                                placeholder="Search by name, definition, or family..."
                                value={editCompetencySearchTerm}
                                onChange={(e) => setEditCompetencySearchTerm(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-competency-type">Type</Label>
                              <select
                                value={editSelectedCompetencyType}
                                onChange={(e) => {
                                  setEditSelectedCompetencyType(e.target.value);
                                  setEditSelectedCompetencyFamily('');
                                }}
                                className="loyverse-input mt-1 w-full"
                              >
                                <option value="">All Types</option>
                                {editCompetencyStats.types?.map(type => (
                                  <option key={type.name} value={type.name}>{type.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="edit-competency-family">Family</Label>
                              <select
                                value={editSelectedCompetencyFamily}
                                onChange={(e) => setEditSelectedCompetencyFamily(e.target.value)}
                                className="loyverse-input mt-1 w-full"
                              >
                                <option value="">All Families</option>
                                {editCompetencyStats.families?.map(family => (
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
                                setEditCompetencySearchTerm('');
                                setEditSelectedCompetencyType('');
                                setEditSelectedCompetencyFamily('');
                              }}
                            >
                              Clear Filters
                            </Button>
                          </div>
                        </div>

                        {/* Competencies List */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {editFilteredCompetencies.map((competency) => {
                            const isLinked = isEditCompetencyLinked(competency.id);
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
                                            handleAddCompetencyToEditProfile(competency, e.target.value);
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
                                            handleAddCompetencyToEditProfile(competency, level.toUpperCase());
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
                  <div>
                    <Card className="loyverse-card">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Target className="h-5 w-5 text-purple-600" />
                          <span>Job Profile Preview</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {editSelectedJobs.length > 0 ? (
                          <div className="space-y-4">
                            {/* JCP Code Input */}
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                              <Label htmlFor="edit-jcp-code">JCP Code (applied to all selected jobs)</Label>
                              <Input
                                id="edit-jcp-code"
                                placeholder="Enter JCP code"
                                value={editJcpCode}
                                onChange={(e) => setEditJcpCode(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            {/* Selected Jobs */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-800 mb-2">Selected Jobs ({editSelectedJobs.length})</h4>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {editSelectedJobs.map(job => (
                                  <div key={job.id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-900">{job.title}</span>
                                    <Badge variant="outline" className="text-xs">{job.code}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Existing Competencies */}
                            {editingJobProfile.competencies.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                                  <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                                  Existing Competencies ({editingJobProfile.competencies.length})
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {editingJobProfile.competencies.map((mapping) => (
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
                                        <div className="flex items-center space-x-2">
                                          <Badge className={`text-xs ${getLevelColor(mapping.requiredLevel)}`}>
                                            {mapping.requiredLevel}
                                          </Badge>
                                          <Select
                                            value={mapping.requiredLevel}
                                            onValueChange={(newLevel) => handleUpdateCompetencyLevel(mapping.id, newLevel)}
                                          >
                                            <SelectTrigger className="w-24 h-6 text-xs">
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
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                                          Existing
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteFromJobProfile(mapping.id)}
                                          className="text-red-600 hover:text-red-700 p-1"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* New Competencies */}
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                                <Plus className="h-4 w-4 mr-2 text-green-600" />
                                New Competencies ({editJobCompetencies.length})
                              </h4>
                              {editJobCompetencies.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">
                                  {editingJobProfile.competencies.length > 0 
                                    ? 'Add additional competencies below' 
                                    : 'No competencies added yet'
                                  }
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {editJobCompetencies.map((comp, index) => (
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
                                          onClick={() => handleRemoveCompetencyFromEditProfile(comp.competency.id)}
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

                            {/* Save Button */}
                            <Button
                              onClick={handleSaveEditProfile}
                              disabled={editSelectedJobs.length === 0}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              {editJobCompetencies.length > 0
                                ? `Save ${editJobCompetencies.length} New Competencies to ${editSelectedJobs.length} Job(s)`
                                : `Update JCP Code for ${editSelectedJobs.length} Job(s)`
                              }
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Select a job to start editing the competency profile</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
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