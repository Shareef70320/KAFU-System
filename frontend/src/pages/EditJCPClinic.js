import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import { getLevelDisplayName } from '../utils/competencyLevels';
import { useUser } from '../contexts/UserContext';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  Target,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Plus,
  X,
  Search,
  Trash2,
  Info,
  List,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react';

const EditJCPClinic = () => {
  const { jcpCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();

  // State for search and filters
  const [competencySearchTerm, setCompetencySearchTerm] = useState('');
  const [selectedCompetencyType, setSelectedCompetencyType] = useState('all');
  const [selectedCompetencyFamily, setSelectedCompetencyFamily] = useState('all');

  // State for current and new mappings
  const [currentMappings, setCurrentMappings] = useState([]); // Original mappings
  const [newMappings, setNewMappings] = useState([]); // Modified mappings
  
  // State for competency details modal
  const [showCompetencyDetailsModal, setShowCompetencyDetailsModal] = useState(false);
  const [selectedCompetencyForDetails, setSelectedCompetencyForDetails] = useState(null);
  const [selectedRequiredLevel, setSelectedRequiredLevel] = useState(null);
  const [expandedElementsInModal, setExpandedElementsInModal] = useState({});
  
  // State for job details modal
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  
  // State for expanded level elements in competency cards
  const [expandedLevelElements, setExpandedLevelElements] = useState({});

  // Fetch all jobs with this JCP code
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-by-jcp', jcpCode],
    queryFn: async () => {
      try {
        const response = await api.get(`/jobs?limit=1000`);
        const jobs = response.data.jobs || response.data || [];
        return jobs.filter(job => {
          const jobJcpCode = job.jcp_code || job.jcpCode;
          return jobJcpCode && jobJcpCode === jcpCode;
        });
      } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
      }
    },
    enabled: !!jcpCode,
  });

  const jobs = jobsData || [];
  const firstJobId = jobs.length > 0 ? jobs[0]?.id : null;

  // Fetch full job details for the primary job
  const { data: primaryJob, isLoading: jobLoading } = useQuery({
    queryKey: ['job-full', firstJobId],
    queryFn: async () => {
      if (!firstJobId) return null;
      const response = await api.get(`/jobs/${firstJobId}`);
      return response.data;
    },
    enabled: !!firstJobId,
  });

  // Fetch current JCP mappings
  const { data: jcpMappingsData, isLoading: mappingsLoading } = useQuery({
    queryKey: ['jcp-mappings', jcpCode, firstJobId],
    queryFn: async () => {
      if (!firstJobId) return { mappings: [] };
      
      try {
        const response = await api.get(`/job-competencies?jobId=${firstJobId}&limit=1000`);
        return response.data;
      } catch (error) {
        console.error('Error fetching JCP mappings:', error);
        return { mappings: [] };
      }
    },
    enabled: !!firstJobId,
  });

  // Initialize mappings when data loads and fetch full competency details
  useEffect(() => {
    const fetchMappingsWithDetails = async () => {
      if (jcpMappingsData?.mappings) {
        const mappings = await Promise.all(
          jcpMappingsData.mappings.map(async (mapping) => {
            const competencyId = mapping.competencyId || mapping.competency?.id;
            let fullCompetency = mapping.competency;
            
            // Fetch full competency details if not already loaded
            if (!fullCompetency?.levels || !fullCompetency?.definition) {
              try {
                const response = await api.get(`/competencies/${competencyId}`);
                fullCompetency = response.data;
              } catch (error) {
                console.error(`Error fetching competency ${competencyId}:`, error);
              }
            }
            
            return {
              competencyId,
              competency: fullCompetency,
              requiredLevel: mapping.requiredLevel || mapping.required_level,
              isRequired: true, // Always required for clinic edits
              mappingId: mapping.id,
            };
          })
        );
        
        setCurrentMappings(mappings);
        setNewMappings(mappings);
      }
    };
    
    fetchMappingsWithDetails();
  }, [jcpMappingsData]);

  // Fetch all competencies
  const { data: competenciesData } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies?limit=2000');
      return response.data;
    }
  });

  // Fetch employee name
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      return response.data;
    }
  });

  const employee = employeesData?.employees?.find(e => e.sid === currentSid);
  const requestedByName = employee ? `${employee.first_name} ${employee.last_name}` : currentSid;

  // Filter competencies
  const filteredCompetencies = useMemo(() => {
    if (!competenciesData?.competencies) return [];
    
    return competenciesData.competencies.filter(competency => {
      const matchesSearch = !competencySearchTerm || 
        competency.name.toLowerCase().includes(competencySearchTerm.toLowerCase()) ||
        (competency.code && competency.code.toLowerCase().includes(competencySearchTerm.toLowerCase()));
      const matchesType = selectedCompetencyType === 'all' || competency.type === selectedCompetencyType;
      const matchesFamily = selectedCompetencyFamily === 'all' || competency.family === selectedCompetencyFamily;
      const notAlreadyAdded = !newMappings.some(m => m.competencyId === competency.id);
      
      return matchesSearch && matchesType && matchesFamily && notAlreadyAdded;
    });
  }, [competenciesData, competencySearchTerm, selectedCompetencyType, selectedCompetencyFamily, newMappings]);

  // Get unique competency types and families
  const competencyTypes = useMemo(() => {
    if (!competenciesData?.competencies) return [];
    return [...new Set(competenciesData.competencies.map(c => c.type).filter(Boolean))];
  }, [competenciesData]);

  const competencyFamilies = useMemo(() => {
    if (!competenciesData?.competencies) return [];
    return [...new Set(competenciesData.competencies.map(c => c.family).filter(Boolean))];
  }, [competenciesData]);

  // Add competency to JCP
  const handleAddCompetency = async (competency) => {
    if (newMappings.some(m => m.competencyId === competency.id)) {
      toast({
        title: 'Warning',
        description: 'This competency is already in the JCP',
        variant: 'destructive'
      });
      return;
    }

    // Fetch full competency details if not already loaded
    let fullCompetency = competency;
    if (!fullCompetency?.levels || !fullCompetency?.definition) {
      try {
        const response = await api.get(`/competencies/${competency.id}`);
        fullCompetency = response.data;
      } catch (error) {
        console.error(`Error fetching competency ${competency.id}:`, error);
      }
    }

    setNewMappings([...newMappings, {
      competencyId: competency.id,
      competency: fullCompetency,
      requiredLevel: 'AWARE',
      isRequired: true,
      mappingId: null // New mapping
    }]);
  };

  // Show competency details modal
  const handleShowCompetencyDetails = (competency, requiredLevel) => {
    setSelectedCompetencyForDetails(competency);
    setSelectedRequiredLevel(requiredLevel);
    setExpandedElementsInModal({});
    setShowCompetencyDetailsModal(true);
  };

  // Remove competency from JCP
  const handleRemoveCompetency = (competencyId) => {
    setNewMappings(newMappings.filter(m => m.competencyId !== competencyId));
  };

  // Update required level
  const handleUpdateLevel = (competencyId, newLevel) => {
    setNewMappings(newMappings.map(m => 
      m.competencyId === competencyId ? { ...m, requiredLevel: newLevel } : m
    ));
  };

  // Update isRequired
  const handleUpdateRequirement = (competencyId, isRequired) => {
    setNewMappings(newMappings.map(m => 
      m.competencyId === competencyId ? { ...m, isRequired } : m
    ));
  };

  // Create edit request mutation
  const createEditRequestMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/jcp-edit-requests', {
        jcpCode,
        requestedBy: currentSid,
        requestedByName,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Edit Request Submitted',
        description: 'Your JCP changes have been submitted for admin review.',
        variant: 'default'
      });
      queryClient.invalidateQueries(['jcp-mappings', jcpCode]);
      navigate('/kafu-clinic');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit edit request',
        variant: 'destructive'
      });
    }
  });

  // Calculate changes
  const calculateChanges = () => {
    const adds = [];
    const updates = [];
    const removes = [];

    // Find new mappings (not in current)
    newMappings.forEach(newMapping => {
      const existing = currentMappings.find(m => m.competencyId === newMapping.competencyId);
      if (!existing) {
        adds.push({
          competencyId: newMapping.competencyId,
          requiredLevel: newMapping.requiredLevel
        });
      } else if (
        existing.requiredLevel !== newMapping.requiredLevel
      ) {
        updates.push({
          competencyId: newMapping.competencyId,
          oldRequiredLevel: existing.requiredLevel,
          newRequiredLevel: newMapping.requiredLevel
        });
      }
    });

    // Find removed mappings (in current but not in new)
    currentMappings.forEach(currentMapping => {
      const stillExists = newMappings.find(m => m.competencyId === currentMapping.competencyId);
      if (!stillExists) {
        removes.push({
          competencyId: currentMapping.competencyId
        });
      }
    });

    return { adds, updates, removes };
  };

  // Submit changes
  const handleSubmitChanges = () => {
    const changes = calculateChanges();
    
    if (changes.adds.length === 0 && changes.updates.length === 0 && changes.removes.length === 0) {
      toast({
        title: 'No Changes',
        description: 'No changes detected. Please make some changes before submitting.',
        variant: 'default'
      });
      return;
    }

    // Determine edit type
    const totalChanges = changes.adds.length + changes.updates.length + changes.removes.length;
    const editType = totalChanges > 1 ? 'MAPPING_BULK' : 
                     changes.adds.length > 0 ? 'MAPPING_ADD' :
                     changes.updates.length > 0 ? 'MAPPING_UPDATE' :
                     'MAPPING_REMOVE';

    createEditRequestMutation.mutate({
      editType,
      changes: editType === 'MAPPING_BULK' ? changes : 
               editType === 'MAPPING_ADD' ? changes.adds[0] :
               editType === 'MAPPING_UPDATE' ? changes.updates[0] :
               changes.removes[0]
    });
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC':
      case 'AWARE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'INTERMEDIATE':
      case 'KNOWLEDGE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'ADVANCED':
      case 'SKILLED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MASTERY':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isLoading = jobsLoading || mappingsLoading || jobLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading JCP details...</p>
        </div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            JCP Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            No jobs found with JCP code: {jcpCode}
          </p>
          <Button onClick={() => navigate('/kafu-clinic')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Kafu Clinic
          </Button>
        </div>
      </div>
    );
  }

  const changes = calculateChanges();
  const hasChanges = changes.adds.length > 0 || changes.updates.length > 0 || changes.removes.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/kafu-clinic?tab=owned-jcps')}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Edit JCP: {jcpCode}</h1>
                <p className="text-white/80 mt-1">
                  {jobs.length} Job{jobs.length !== 1 ? 's' : ''} • {newMappings.length} Competenc{newMappings.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <Badge variant="outline" className="bg-yellow-500/30 text-yellow-100 border-yellow-300">
                  {changes.adds.length + changes.updates.length + changes.removes.length} Change{changes.adds.length + changes.updates.length + changes.removes.length !== 1 ? 's' : ''}
                </Badge>
              )}
              <Button
                onClick={handleSubmitChanges}
                disabled={!hasChanges || createEditRequestMutation.isLoading}
                className="bg-white text-blue-600 hover:bg-white/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {createEditRequestMutation.isLoading ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Job Information Card */}
        {primaryJob && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Job Information
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJobDetailsModal(true)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Info className="h-4 w-4 mr-2" />
                  More Information
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Job Title</Label>
                  <p className="text-base font-semibold text-gray-900 mt-1">{primaryJob.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Job Code</Label>
                  <p className="text-base font-medium text-gray-900 mt-1">{primaryJob.code}</p>
                </div>
                {primaryJob.division && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Division</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{primaryJob.division}</p>
                  </div>
                )}
                {primaryJob.department && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Department</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{primaryJob.department}</p>
                  </div>
                )}
                {primaryJob.unit && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Unit</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{primaryJob.unit}</p>
                  </div>
                )}
                {primaryJob.location && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Location</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{primaryJob.location}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Status</Label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      primaryJob.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {primaryJob.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
              {primaryJob.description && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">Description</Label>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">{primaryJob.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Current Competencies */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Current Competencies ({newMappings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {newMappings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No competencies assigned to this JCP</p>
                ) : (
                  <div className="space-y-3">
                    {newMappings.map((mapping) => {
                      const competency = mapping.competency || competenciesData?.competencies?.find(c => c.id === mapping.competencyId);
                      if (!competency) return null;

                      // Get the required level details
                      const requiredLevelData = competency.levels?.find(
                        level => level.level === mapping.requiredLevel
                      ) || null;

                      return (
                        <div
                          key={mapping.competencyId}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-green-600" />
                                <h4 className="font-semibold text-gray-900">{competency.name}</h4>
                                {competency.code && (
                                  <Badge variant="outline" className="text-xs">
                                    {competency.code}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleShowCompetencyDetails(competency, mapping.requiredLevel)}
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="View full competency details"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {competency.type && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                    {competency.type}
                                  </Badge>
                                )}
                                {competency.family && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                    {competency.family}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Competency Definition */}
                              {competency.definition && (
                                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                                  <Label className="text-xs text-gray-500 mb-1 block">Definition:</Label>
                                  <p className="text-sm text-gray-700 leading-relaxed">{competency.definition}</p>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCompetency(mapping.competencyId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Current Required Level Display */}
                          <div className="mb-4">
                            <Label className="text-xs text-gray-500 mb-2 block">Current Required Level:</Label>
                            <div className="p-3 bg-green-50 rounded-lg border-2 border-green-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`text-xs ${getLevelColor(mapping.requiredLevel)}`}>
                                  {getLevelDisplayName(mapping.requiredLevel)}
                                </Badge>
                                <span className="text-xs font-semibold text-gray-900">Currently Selected</span>
                              </div>
                              {requiredLevelData && (
                                <>
                                  {requiredLevelData.title && (
                                    <p className="text-xs font-semibold text-gray-900 mb-1">{requiredLevelData.title}</p>
                                  )}
                                  {requiredLevelData.description && (
                                    <p className="text-xs text-gray-700 leading-relaxed">{requiredLevelData.description}</p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Alternative Levels - Cards */}
                          {competency.levels && competency.levels.length > 0 && (
                            <div>
                              <Label className="text-xs text-gray-500 mb-2 block">Select Different Level:</Label>
                              <div className="grid grid-cols-1 gap-3">
                                {competency.levels
                                  .filter(level => level.level !== mapping.requiredLevel)
                                  .map((level) => {
                                    const levelKey = `${mapping.competencyId}-${level.level}`;
                                    const isExpanded = expandedLevelElements[levelKey] || false;
                                    
                                    return (
                                      <div
                                        key={level.id || level.level}
                                        className="border border-gray-300 rounded-lg bg-white"
                                      >
                                        {/* Level Header - Clickable to select */}
                                        <div
                                          className="p-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                                          onClick={() => handleUpdateLevel(mapping.competencyId, level.level)}
                                        >
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Badge className={`text-xs ${getLevelColor(level.level)}`}>
                                                  {getLevelDisplayName(level.level)}
                                                </Badge>
                                                <span className="text-xs text-gray-500">Click to select</span>
                                              </div>
                                              {level.title && (
                                                <p className="text-xs font-semibold text-gray-900 mt-1">{level.title}</p>
                                              )}
                                              {level.description && (
                                                <p className={`text-xs text-gray-700 leading-relaxed mt-1 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                                  {level.description}
                                                </p>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedLevelElements(prev => ({
                                                  ...prev,
                                                  [levelKey]: !prev[levelKey]
                                                }));
                                              }}
                                              className="h-6 w-6 p-0 ml-2"
                                              title={isExpanded ? "Collapse details" : "Expand to view full details"}
                                            >
                                              {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-500" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {/* Full Level Information - Expandable */}
                                        {isExpanded && (
                                          <div className="px-3 pb-3 border-t border-gray-200 bg-gray-50">
                                            {/* Elements and Indicators */}
                                            {level.elements && level.elements.length > 0 && (
                                              <div className="pt-3">
                                                <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                                  <List className="h-3 w-3 text-green-600" />
                                                  Elements ({level.elements.length})
                                                </h5>
                                                <div className="space-y-2">
                                                  {level.elements.map((element) => (
                                                    <div
                                                      key={element.id}
                                                      className="bg-white rounded p-2 border border-gray-200"
                                                    >
                                                      <p className="text-xs font-medium text-gray-900 mb-1">
                                                        {element.name || `Element ${element.id}`}
                                                      </p>
                                                      {element.description && (
                                                        <p className="text-xs text-gray-600 mb-2">{element.description}</p>
                                                      )}
                                                      {element.performanceIndicators && element.performanceIndicators.length > 0 && (
                                                        <div className="mt-2">
                                                          <h6 className="text-xs font-semibold text-gray-700 mb-1">Performance Indicators:</h6>
                                                          <ul className="space-y-1">
                                                            {element.performanceIndicators.map((indicator, idx) => (
                                                              <li key={idx} className="text-xs text-gray-600 flex items-start">
                                                                <span className="mr-1">•</span>
                                                                <span>{indicator.description || indicator.text || indicator.action}</span>
                                                              </li>
                                                            ))}
                                                          </ul>
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {(!level.elements || level.elements.length === 0) && (
                                              <p className="text-xs text-gray-500 italic pt-3">No elements defined for this level</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Add Competencies */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Add Competencies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search competencies..."
                    value={competencySearchTerm}
                    onChange={(e) => setCompetencySearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Type</Label>
                    <Select value={selectedCompetencyType} onValueChange={setSelectedCompetencyType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {competencyTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Family</Label>
                    <Select value={selectedCompetencyFamily} onValueChange={setSelectedCompetencyFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Families</SelectItem>
                        {competencyFamilies.map(family => (
                          <SelectItem key={family} value={family}>{family}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Competencies List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredCompetencies.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">
                      {competencySearchTerm || selectedCompetencyType !== 'all' || selectedCompetencyFamily !== 'all'
                        ? 'No competencies found matching filters'
                        : 'All competencies are already added'}
                    </p>
                  ) : (
                    filteredCompetencies.map((competency) => (
                      <div
                        key={competency.id}
                        className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white cursor-pointer"
                        onClick={() => handleAddCompetency(competency)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm text-gray-900 mb-1">{competency.name}</h5>
                            {competency.code && (
                              <Badge variant="outline" className="text-xs mb-1">
                                {competency.code}
                              </Badge>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {competency.type && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                  {competency.type}
                                </Badge>
                              )}
                              {competency.family && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                  {competency.family}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCompetency(competency);
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Changes Summary */}
            {hasChanges && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Pending Changes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {changes.adds.length > 0 && (
                    <div>
                      <span className="font-medium text-green-700">+{changes.adds.length} Add{changes.adds.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {changes.updates.length > 0 && (
                    <div>
                      <span className="font-medium text-blue-700">~{changes.updates.length} Update{changes.updates.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {changes.removes.length > 0 && (
                    <div>
                      <span className="font-medium text-red-700">-{changes.removes.length} Remove{changes.removes.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {showJobDetailsModal && primaryJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                {primaryJob.title} - Full Details
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowJobDetailsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Job Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Job Code</Label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{primaryJob.code}</p>
                    </div>
                    {primaryJob.division && (
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Division</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{primaryJob.division}</p>
                      </div>
                    )}
                    {primaryJob.department && (
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Department</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{primaryJob.department}</p>
                      </div>
                    )}
                    {primaryJob.section && (
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Section</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{primaryJob.section}</p>
                      </div>
                    )}
                    {primaryJob.unit && (
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Unit</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{primaryJob.unit}</p>
                      </div>
                    )}
                    {primaryJob.location && (
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Location</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{primaryJob.location}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Status</Label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          primaryJob.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {primaryJob.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {primaryJob.description && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-xs text-gray-500 uppercase tracking-wide">Description</Label>
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{primaryJob.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Description (JD) Fields */}
              {(primaryJob.budgetaryControl !== undefined || primaryJob.externalInterfaces || 
                primaryJob.internalInterfaces || primaryJob.jobScope || primaryJob.accountabilities || 
                primaryJob.qualificationsExperience || primaryJob.restrictions || primaryJob.authority || 
                primaryJob.demands) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    Job Description (JD)
                  </h3>
                  
                  {/* Dimensions */}
                  {(primaryJob.budgetaryControl !== undefined || primaryJob.externalInterfaces || primaryJob.internalInterfaces) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Dimensions</h4>
                      <div className="space-y-3">
                        {primaryJob.budgetaryControl !== undefined && (
                          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-sm font-semibold text-gray-900">Budgetary Control:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              primaryJob.budgetaryControl 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {primaryJob.budgetaryControl ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                        {primaryJob.externalInterfaces && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-sm font-semibold text-gray-900 block mb-2">External Interfaces:</span>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                              {primaryJob.externalInterfaces.split(',').map((item, idx) => (
                                <li key={idx} className="ml-4">{item.trim()}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {primaryJob.internalInterfaces && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-sm font-semibold text-gray-900 block mb-2">Internal Interfaces:</span>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.internalInterfaces}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Core JD Fields */}
                  {(primaryJob.jobScope || primaryJob.accountabilities || primaryJob.qualificationsExperience) && (
                    <div className="space-y-4 mb-4">
                      {primaryJob.jobScope && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Job Scope</h4>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.jobScope}</p>
                          </div>
                        </div>
                      )}
                      {primaryJob.accountabilities && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Accountabilities</h4>
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.accountabilities}</p>
                          </div>
                        </div>
                      )}
                      {primaryJob.qualificationsExperience && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Qualifications and Experience</h4>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.qualificationsExperience}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Special Conditions */}
                  {(primaryJob.restrictions || primaryJob.authority || primaryJob.demands) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Special Conditions That May Apply</h4>
                      <div className="space-y-3">
                        {primaryJob.restrictions && (
                          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              Restrictions
                            </h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.restrictions}</p>
                          </div>
                        )}
                        {primaryJob.authority && (
                          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-indigo-600" />
                              Authority
                            </h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.authority}</p>
                          </div>
                        )}
                        {primaryJob.demands && (
                          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-600" />
                              Demands
                            </h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.demands}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Competency Details Modal */}
      {showCompetencyDetailsModal && selectedCompetencyForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                {selectedCompetencyForDetails.name} - {selectedRequiredLevel && getLevelDisplayName(selectedRequiredLevel)}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCompetencyDetailsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              {/* Competency Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Competency Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedCompetencyForDetails.code && (
                    <div>
                      <span className="text-xs text-gray-500">Code:</span>
                      <span className="ml-2 text-sm font-medium">{selectedCompetencyForDetails.code}</span>
                    </div>
                  )}
                  {selectedCompetencyForDetails.type && (
                    <div>
                      <span className="text-xs text-gray-500">Type:</span>
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700">
                        {selectedCompetencyForDetails.type}
                      </Badge>
                    </div>
                  )}
                  {selectedCompetencyForDetails.family && (
                    <div>
                      <span className="text-xs text-gray-500">Family:</span>
                      <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700">
                        {selectedCompetencyForDetails.family}
                      </Badge>
                    </div>
                  )}
                  {selectedCompetencyForDetails.definition && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Definition:</span>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedCompetencyForDetails.definition}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Level Details */}
              {selectedRequiredLevel && (() => {
                const levelData = selectedCompetencyForDetails.levels?.find(
                  level => level.level === selectedRequiredLevel
                );
                
                if (!levelData) return null;
                
                return (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      {getLevelDisplayName(selectedRequiredLevel)} Level Details
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-3">
                      {levelData.title && (
                        <div>
                          <span className="text-xs font-semibold text-gray-700">Title:</span>
                          <p className="text-sm text-gray-900 mt-1">{levelData.title}</p>
                        </div>
                      )}
                      {levelData.description && (
                        <div>
                          <span className="text-xs font-semibold text-gray-700">Description:</span>
                          <p className="text-sm text-gray-700 leading-relaxed mt-1">{levelData.description}</p>
                        </div>
                      )}
                      
                      {/* Elements for this level */}
                      {levelData.elements && levelData.elements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <List className="h-4 w-4 text-green-600" />
                            Elements ({levelData.elements.length})
                          </h4>
                          <div className="space-y-3">
                            {levelData.elements.map((element) => {
                              const isExpanded = expandedElementsInModal[element.id];
                              return (
                                <div
                                  key={element.id}
                                  className="bg-white rounded-lg p-3 border border-gray-200"
                                >
                                  <button
                                    onClick={() => setExpandedElementsInModal(prev => ({
                                      ...prev,
                                      [element.id]: !prev[element.id]
                                    }))}
                                    className="w-full flex items-center justify-between text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {element.name || `Element ${element.id}`}
                                      </span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    )}
                                  </button>
                                  
                                  {element.description && (
                                    <p className="text-xs text-gray-600 mt-2 mb-2">{element.description}</p>
                                  )}
                                  
                                  {/* Performance Indicators */}
                                  {isExpanded && element.performanceIndicators && element.performanceIndicators.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Performance Indicators:</h5>
                                      <ul className="space-y-1">
                                        {element.performanceIndicators.map((indicator, idx) => (
                                          <li key={idx} className="text-xs text-gray-700 flex items-start">
                                            <span className="mr-2">•</span>
                                            <span>{indicator.description || indicator.text || indicator.action}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditJCPClinic;

