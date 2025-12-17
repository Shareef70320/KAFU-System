import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
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
  Edit,
  Info,
  FileText,
  CheckCircle,
  Clock,
  FileDown,
  FileSpreadsheet,
} from 'lucide-react';

const ViewJCP = () => {
  const { jcpCode } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRole, currentSid } = useUser();
  const [expandedCompetencies, setExpandedCompetencies] = useState({});
  const [expandedLevels, setExpandedLevels] = useState({});
  const [expandedElements, setExpandedElements] = useState({});

  // Check if user has clinic access and edit permissions for this JCP
  const hasEditAccess = useMemo(() => {
    if (currentRole === 'ADMIN') {
      return true; // Admins always have edit access
    }
    
    if (currentRole === 'USER' && currentSid) {
      try {
        const saved = localStorage.getItem('kafuClinicAccessList');
        const accessList = saved ? JSON.parse(saved) : [];
        const userAccess = accessList.find(access => access.userId === currentSid);
        
        if (!userAccess) return false;
        
        // Check if user has edit permission for this specific JCP
        if (userAccess.jcpPermissions) {
          const perm = userAccess.jcpPermissions.find(p => p.jcpCode === jcpCode);
          return perm?.edit || false;
        }
        
        return false;
      } catch (error) {
        console.error('Error checking edit access:', error);
        return false;
      }
    }
    
    return false;
  }, [currentRole, currentSid, jcpCode]);

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

  // Fetch full job details for the first job (primary job)
  const firstJobId = jobs.length > 0 ? jobs[0]?.id : null;
  const { data: primaryJob, isLoading: jobLoading } = useQuery({
    queryKey: ['job-full', firstJobId],
    queryFn: async () => {
      if (!firstJobId) return null;
      const response = await api.get(`/jobs/${firstJobId}`);
      return response.data;
    },
    enabled: !!firstJobId,
  });

  // Fetch JCP mappings with full competency details
  const { data: jcpMappingsData, isLoading: mappingsLoading } = useQuery({
    queryKey: ['jcp-mappings-full', jcpCode, firstJobId],
    queryFn: async () => {
      if (!firstJobId) return { mappings: [] };
      
      try {
        const response = await api.get(`/job-competencies?jobId=${firstJobId}&limit=1000`);
        const mappings = response.data.mappings || response.data || [];
        
        // Fetch full competency details for each mapping
        const enrichedMappings = await Promise.all(
          mappings.map(async (mapping) => {
            try {
              const compResponse = await api.get(`/competencies/${mapping.competencyId || mapping.competency?.id}`);
              return {
                ...mapping,
                competency: compResponse.data,
              };
            } catch (error) {
              console.error(`Error fetching competency ${mapping.competencyId}:`, error);
              return mapping;
            }
          })
        );
        
        return { mappings: enrichedMappings };
      } catch (error) {
        console.error('Error fetching JCP mappings:', error);
        return { mappings: [] };
      }
    },
    enabled: !!firstJobId,
  });

  const mappings = jcpMappingsData?.mappings || [];

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

  const toggleCompetency = (competencyId) => {
    setExpandedCompetencies(prev => ({
      ...prev,
      [competencyId]: !prev[competencyId]
    }));
  };

  const toggleLevel = (levelId) => {
    setExpandedLevels(prev => ({
      ...prev,
      [levelId]: !prev[levelId]
    }));
  };

  const toggleElement = (elementId) => {
    setExpandedElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  };

  const isLoading = jobsLoading || jobLoading || mappingsLoading;

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
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={() => navigate('/kafu-clinic')}>
              Back to Kafu Clinic
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const firstJob = jobs[0];
  const totalCompetencies = mappings.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  const referrer = document.referrer;
                  if (referrer.includes('/kafu-clinic')) {
                    navigate('/kafu-clinic');
                  } else {
                    navigate(-1);
                  }
                }}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Briefcase className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{firstJob?.title || 'JCP Profile'}</h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-white/20 backdrop-blur-sm">
                      {firstJob?.code}
                    </span>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-purple-500/30">
                      JCP: {jcpCode}
                    </span>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-white/20 backdrop-blur-sm">
                      {jobs.length} Job{jobs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-500/30">
                      {totalCompetencies} Competenc{totalCompetencies !== 1 ? 'ies' : 'y'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasEditAccess && (
                <Button
                  onClick={() => {
                    navigate(`/kafu-clinic/jcp/edit/${jcpCode}`);
                  }}
                  className="bg-white text-blue-600 hover:bg-white/90"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit JCP
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8" id="jcp-content">
        <div className="space-y-6">
          {/* Linked Jobs Section */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  Linked Jobs ({jobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{job.title}</h4>
                          <Badge variant="outline" className="text-xs mb-2">
                            {job.code}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        {job.unit && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{job.unit}</span>
                          </div>
                        )}
                        {job.division && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{job.division}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span>{job.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Information (Primary Job) */}
          {primaryJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                    {primaryJob.section && (
                      <div>
                        <Label className="text-xs text-gray-500 uppercase tracking-wide">Section</Label>
                        <p className="text-base font-medium text-gray-900 mt-1">{primaryJob.section}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
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
                </div>
                {primaryJob.description && (
                  <div className="mt-6 pt-6 border-t">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Description</Label>
                    <p className="text-base text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{primaryJob.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Job Description (JD) */}
          {primaryJob && (primaryJob.budgetaryControl !== undefined || primaryJob.externalInterfaces || 
            primaryJob.internalInterfaces || primaryJob.jobScope || primaryJob.accountabilities || 
            primaryJob.qualificationsExperience || primaryJob.restrictions || primaryJob.authority || 
            primaryJob.demands) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Job Description (JD)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Dimensions */}
                {(primaryJob.budgetaryControl !== undefined || primaryJob.externalInterfaces || primaryJob.internalInterfaces) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimensions</h3>
                    <div className="space-y-4">
                      {primaryJob.budgetaryControl !== undefined && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-base font-semibold text-gray-900">Budgetary Control:</span>
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            primaryJob.budgetaryControl 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {primaryJob.budgetaryControl ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {primaryJob.externalInterfaces && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-base font-semibold text-gray-900 block mb-3">External Interfaces:</span>
                          <ul className="list-disc list-inside space-y-2 text-base text-gray-700">
                            {primaryJob.externalInterfaces.split(',').map((item, idx) => (
                              <li key={idx} className="ml-4">{item.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {primaryJob.internalInterfaces && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-base font-semibold text-gray-900 block mb-3">Internal Interfaces:</span>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.internalInterfaces}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Core JD Fields */}
                {(primaryJob.jobScope || primaryJob.accountabilities || primaryJob.qualificationsExperience) && (
                  <div className="space-y-6">
                    {primaryJob.jobScope && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Scope</h3>
                        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.jobScope}</p>
                        </div>
                      </div>
                    )}
                    {primaryJob.accountabilities && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Accountabilities</h3>
                        <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.accountabilities}</p>
                        </div>
                      </div>
                    )}
                    {primaryJob.qualificationsExperience && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Qualifications and Experience</h3>
                        <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.qualificationsExperience}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Special Conditions */}
                {(primaryJob.restrictions || primaryJob.authority || primaryJob.demands) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Conditions That May Apply</h3>
                    <div className="space-y-4">
                      {primaryJob.restrictions && (
                        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            Restrictions
                          </h4>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.restrictions}</p>
                        </div>
                      )}
                      {primaryJob.authority && (
                        <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-indigo-600" />
                            Authority
                          </h4>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.authority}</p>
                        </div>
                      )}
                      {primaryJob.demands && (
                        <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            Demands
                          </h4>
                          <p className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{primaryJob.demands}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Competency Profile with Full Details */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-green-600" />
                Required Competencies ({totalCompetencies})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {totalCompetencies === 0 ? (
                <p className="text-gray-500 text-center py-8">No competencies assigned to this JCP</p>
              ) : (
                <div className="space-y-6">
                  {mappings.map((mapping) => {
                    const competency = mapping.competency || {};
                    const requiredLevel = mapping.requiredLevel || mapping.required_level;
                    const isExpanded = expandedCompetencies[competency.id];
                    const sortedLevels = competency.levels?.sort((a, b) => {
                      const order = { 'AWARE': 1, 'KNOWLEDGE': 2, 'SKILLED': 3, 'MASTERY': 4 };
                      return (order[a.level] || 99) - (order[b.level] || 99);
                    }) || [];

                    return (
                      <div
                        key={mapping.id || competency.id}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
                      >
                        {/* Competency Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <BookOpen className="h-6 w-6 text-green-600" />
                              <h3 className="text-xl font-bold text-gray-900">
                                {competency.name || `Competency ${mapping.competencyId}`}
                              </h3>
                              {requiredLevel && (
                                <Badge className={`px-3 py-1 text-sm font-semibold ${getLevelColor(requiredLevel)}`}>
                                  Required: {getLevelDisplayName(requiredLevel)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {competency.code && (
                                <Badge variant="outline" className="text-xs">
                                  Code: {competency.code}
                                </Badge>
                              )}
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
                              {competency.relatedDivision && (
                                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                                  {competency.relatedDivision}
                                </Badge>
                              )}
                            </div>
                            {competency.definition && (
                              <p className="text-base text-gray-700 leading-relaxed mb-4">
                                {competency.definition}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Competency Levels */}
                        {sortedLevels.length > 0 && (
                          <div className="border-t pt-4 mt-4">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Target className="h-5 w-5 text-blue-600" />
                              Competency Levels
                            </h4>
                            <div className="space-y-4">
                              {sortedLevels.map((level) => {
                                const isLevelExpanded = expandedLevels[level.id];
                                const isRequiredLevel = level.level === requiredLevel;
                                
                                return (
                                  <div
                                    key={level.id}
                                    className={`border rounded-lg p-4 ${
                                      isRequiredLevel
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Badge className={`px-3 py-1 text-sm font-semibold ${getLevelColor(level.level)}`}>
                                            {getLevelDisplayName(level.level)}
                                          </Badge>
                                          {isRequiredLevel && (
                                            <Badge className="px-2 py-1 text-xs bg-blue-600 text-white">
                                              Required Level
                                            </Badge>
                                          )}
                                        </div>
                                        {level.title && (
                                          <h5 className="text-base font-semibold text-gray-900 mb-2">
                                            {level.title}
                                          </h5>
                                        )}
                                        {level.description && (
                                          <p className="text-sm text-gray-700 leading-relaxed">
                                            {level.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Elements for this level */}
                                    {level.elements && level.elements.length > 0 && (
                                      <div className="mt-4 pt-4 border-t">
                                        <button
                                          onClick={() => toggleLevel(level.id)}
                                          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
                                        >
                                          {isLevelExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                          Elements ({level.elements.length})
                                        </button>
                                        {isLevelExpanded && (
                                          <div className="space-y-3">
                                            {level.elements.map((element) => {
                                              const isElementExpanded = expandedElements[element.id];
                                              return (
                                                <div
                                                  key={element.id}
                                                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                                                >
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                          {element.name || `Element ${element.id}`}
                                                        </span>
                                                      </div>
                                                      {element.description && (
                                                        <p className="text-xs text-gray-600 mb-2">
                                                          {element.description}
                                                        </p>
                                                      )}
                                                      {/* Performance Indicators */}
                                                      {element.performanceIndicators && element.performanceIndicators.length > 0 && (
                                                        <div className="mt-2">
                                                          <button
                                                            onClick={() => toggleElement(element.id)}
                                                            className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 mb-2"
                                                          >
                                                            {isElementExpanded ? (
                                                              <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                              <ChevronDown className="h-3 w-3" />
                                                            )}
                                                            Indicators ({element.performanceIndicators.length})
                                                          </button>
                                                          {isElementExpanded && (
                                                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 ml-4">
                                                              {element.performanceIndicators.map((indicator, idx) => (
                                                                <li key={idx}>{indicator.description || indicator.text}</li>
                                                              ))}
                                                            </ul>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
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
      </div>
    </div>
  );
};

export default ViewJCP;
