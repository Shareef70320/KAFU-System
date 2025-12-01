import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Star, 
  TrendingUp,
  Award,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  Play,
  ChevronRight,
  Info
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';
import { getLevelDisplayName } from '../../utils/competencyLevels';

const MyCompetencies = () => {
  const { currentSid } = useUser();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [expandedCompetency, setExpandedCompetency] = useState(null);

  console.log('MyCompetencies - currentSid:', currentSid);

  // Fetch user data using dynamic SID
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['user-profile', currentSid],
    queryFn: async () => {
      console.log('MyCompetencies - Fetching employee data for SID:', currentSid);
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const normalizedSid = String(currentSid || '').trim();
      const employee = employees.find(emp => String(emp.sid).trim() === normalizedSid);
      console.log('MyCompetencies - Found employee:', employee);
      return employee;
    },
    enabled: !!currentSid
  });

  // Fetch competencies with questions and assessments for this user (unfiltered)
  const { data: competenciesData, isLoading: competenciesLoading } = useQuery({
    queryKey: ['user-competencies', currentSid],
    queryFn: async () => {
      console.log('MyCompetencies - Fetching competencies data for SID:', currentSid);
      if (!currentSid) {
        console.log('MyCompetencies - No currentSid; returning null');
        return null;
      }
      const response = await api.get(`/user-assessments/competencies?userId=${currentSid}`);
      console.log('MyCompetencies - Found competencies data:', response.data);
      return response.data;
    },
    enabled: !!currentSid
  });

  useEffect(() => {
    if (employeeData) {
      setUserData(employeeData);
    }
  }, [employeeData]);

  // Resolve user's job -> jobId
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await api.get('/jobs?page=1&limit=2000');
      return res.data;
    },
    enabled: !!employeeData?.job_code
  });

  const jobId = useMemo(() => {
    const jobs = jobsData?.jobs || jobsData || [];
    const job = jobs.find(j => String(j.code) === String(employeeData?.job_code));
    return job?.id || null;
  }, [jobsData, employeeData]);

  // Fetch job-competency mappings for this job
  const { data: mappingsData } = useQuery({
    queryKey: ['job-competencies', jobId],
    queryFn: async () => {
      const res = await api.get(`/job-competencies?jobId=${jobId}&limit=1000`);
      return res.data;
    },
    enabled: !!jobId
  });

  // Filter competencies to only those mapped to the user's job and enrich with JCP data
  const competencies = useMemo(() => {
    const all = competenciesData?.competencies || [];
    if (!jobId) return [];
    const mappings = mappingsData?.mappings || [];
    if (!mappings.length) return [];
    const allowedIds = new Set(mappings.map(m => m.competencyId));
    const filtered = all.filter(c => allowedIds.has(c.id));
    
    // Enrich with required level from JCP mappings
    return filtered.map(comp => {
      const mapping = mappings.find(m => m.competencyId === comp.id);
      return {
        ...comp,
        requiredLevel: mapping?.requiredLevel || null
      };
    });
  }, [competenciesData, mappingsData, jobId]);

  // Fetch full competency details for expanded view
  const { data: fullCompetencyDetails } = useQuery({
    queryKey: ['competency-details', expandedCompetency],
    queryFn: async () => {
      if (!expandedCompetency) return null;
      const response = await api.get(`/competencies/${expandedCompetency}`);
      return response.data;
    },
    enabled: !!expandedCompetency
  });

  const handleStartAssessment = (competency) => {
    // Navigate to assessments page with competency pre-selected
    navigate('/user/assessments', { 
      state: { selectedCompetencyId: competency.id } 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-gray-100 text-gray-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-blue-100 text-blue-800';
      case 'MASTERY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const completedCount = 0; // Will be calculated from real assessment data
  const inProgressCount = 0; // Will be calculated from real assessment data
  const totalCount = competencies.length;
  const overallProgress = totalCount > 0 ? 0 : 0; // Will be calculated from real assessment data

  if (employeeLoading || competenciesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Competencies</h1>
          <p className="text-gray-600">Track your competency development and assessments</p>
        </div>
        <Button className="loyverse-button-primary">
          <Target className="h-4 w-4 mr-2" />
          Take Assessment
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Average across all competencies</p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            <p className="text-sm text-gray-500">out of {totalCount} competencies</p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{inProgressCount}</div>
            <p className="text-sm text-gray-500">competencies being developed</p>
          </CardContent>
        </Card>

        {/* Next Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Next Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600">Dec 15</div>
            <p className="text-sm text-gray-500">Strategic HR</p>
          </CardContent>
        </Card>
      </div>

      {/* Competency Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-green-600" />
            Competency Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competencies.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Competencies Assigned</h3>
                <p className="text-gray-500 mb-4">
                  Your job role ({employeeData?.job_code}) doesn't have any competency requirements assigned yet.
                </p>
                <p className="text-sm text-gray-400">
                  Contact your HR department to set up your competency profile.
                </p>
              </div>
            ) : competencies.map((competency) => {
              const isExpanded = expandedCompetency === competency.id;
              const fullDetails = isExpanded ? fullCompetencyDetails : null;
              
              return (
              <div key={competency.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{competency.name}</h3>
                      {competency.code && (
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {competency.code}
                        </span>
                      )}
                    </div>
                    
                    {/* Type and Family */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {competency.type}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {competency.family}
                      </span>
                      {competency.related_division && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {competency.related_division}
                        </span>
                      )}
                    </div>

                    {/* Quick Info */}
                    <div className="flex items-center space-x-4 mt-2 flex-wrap gap-2">
                      {competency.requiredLevel && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Required:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(competency.requiredLevel)}`}>
                            {getLevelDisplayName(competency.requiredLevel)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Questions:</span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {competency.questionCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Assessment:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${competency.hasAssessment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {competency.hasAssessment ? 'Available' : 'Not Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-600 mb-3">
                  <p>{competency.description || 'No description available'}</p>
                </div>

                {/* Expand/Collapse Button */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedCompetency(isExpanded ? null : competency.id)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Info className="h-4 w-4 mr-1" />
                    {isExpanded ? 'Show Less' : 'Show More Details'}
                    <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </Button>

                  {/* Start Assessment Button */}
                  <Button 
                    onClick={() => handleStartAssessment(competency)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Assessment
                  </Button>
                </div>

                {/* Expanded Details */}
                {isExpanded && fullDetails && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {/* Competency Definition */}
                    {fullDetails.definition && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Definition</h5>
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                          {fullDetails.definition}
                        </p>
                      </div>
                    )}

                    {/* Competency Levels */}
                    {fullDetails.levels && fullDetails.levels.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Level Definitions</h5>
                        <div className="space-y-4">
                          {fullDetails.levels.map((level, levelIndex) => (
                            <div key={levelIndex} className={`p-4 rounded-lg border ${
                              level.level === competency.requiredLevel 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-200 bg-white'
                            }`}>
                              {/* Level Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getLevelColor(level.level)}`}>
                                    {getLevelDisplayName(level.level)}
                                  </span>
                                  {level.level === competency.requiredLevel && (
                                    <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">Required</span>
                                  )}
                                </div>
                              </div>

                              {/* Level Title */}
                              <h6 className="text-base font-semibold text-gray-900 mb-2">{level.title}</h6>

                              {/* Level Description */}
                              {level.description && (
                                <div className="mb-3">
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {level.description}
                                  </p>
                                </div>
                              )}

                              {/* Indicators */}
                              {level.indicators && Array.isArray(level.indicators) && level.indicators.length > 0 && (
                                <div className="mb-3">
                                  <div className="text-xs font-semibold text-gray-700 mb-2">Indicators:</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    {level.indicators.map((indicator, idx) => (
                                      <li key={idx} className="text-xs text-gray-600">{indicator}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Elements */}
                              {level.elements && Array.isArray(level.elements) && level.elements.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="text-xs font-semibold text-gray-700 mb-2">Elements:</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {level.elements.map((element) => (
                                      <div key={element.id} className="bg-gray-50 rounded-md p-2 border border-gray-200">
                                        <div className="text-xs font-medium text-gray-900">{element.name}</div>
                                        {element.description && (
                                          <div className="text-xs text-gray-600 mt-1">{element.description}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assessment Status */}
                    {(competency.userConfirmedLevel || competency.managerSelectedLevel || competency.systemLevel) && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Assessment Status</h4>
                        <div className="space-y-2">
                          {competency.systemLevel && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">System Assessment:</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(competency.systemLevel)}`}>
                                {getLevelDisplayName(competency.systemLevel)}
                              </span>
                            </div>
                          )}
                          {competency.userConfirmedLevel && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Your Self Assessment:</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(competency.userConfirmedLevel)}`}>
                                {getLevelDisplayName(competency.userConfirmedLevel)}
                              </span>
                            </div>
                          )}
                          {competency.managerSelectedLevel && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Manager Assessment:</span>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(competency.managerSelectedLevel)}`}>
                                {getLevelDisplayName(competency.managerSelectedLevel)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Target className="h-6 w-6 text-blue-600" />
              <span>Take New Assessment</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span>View Progress Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Award className="h-6 w-6 text-purple-600" />
              <span>View Certificates</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyCompetencies;
