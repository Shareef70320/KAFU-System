import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { getLevelDisplayName } from '../utils/competencyLevels';
import { useUser } from '../contexts/UserContext';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Target,
  Users,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Tag,
  CheckCircle2,
  Layers,
  BarChart3,
  Info,
  Download,
  File,
  Edit,
} from 'lucide-react';

const ViewCompetency = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentRole, currentSid } = useUser();
  const [expandedElements, setExpandedElements] = useState({});
  const [expandedLevelElements, setExpandedLevelElements] = useState({});

  // Check if user has clinic access and edit permissions for this competency
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
        
        // Check if user has edit permission for this specific competency
        if (userAccess.competencyPermissions) {
          const perm = userAccess.competencyPermissions.find(p => p.competencyId === id);
          return perm?.edit || false;
        }
        
        return false;
      } catch (error) {
        console.error('Error checking edit access:', error);
        return false;
      }
    }
    
    return false;
  }, [currentRole, currentSid, id]);

  const {
    data: competency,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['competency-full', id],
    queryFn: async () => {
      const response = await api.get(`/competencies/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Debug: Log competency data structure (must be before early returns)
  React.useEffect(() => {
    if (competency) {
      console.log('Competency data loaded:', {
        id: competency.id,
        name: competency.name,
        levelsCount: competency.levels?.length || 0,
        hasLevels: !!competency.levels,
        firstLevel: competency.levels?.[0]
      });
    }
  }, [competency]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading competency...</p>
        </div>
      </div>
    );
  }

  if (isError || !competency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load competency
          </h2>
          <p className="text-gray-600 mb-4">
            {error?.response?.data?.message || error?.message || 'Please try again later.'}
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

  const levelOrder = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
  const sortedLevels = [...(competency.levels || [])].sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
  );

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'INTERMEDIATE':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'ADVANCED':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'MASTERY':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'BASIC':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ADVANCED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MASTERY':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const toggleElement = (elementId) => {
    setExpandedElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  };

  const toggleLevelElements = (levelId) => {
    setExpandedLevelElements(prev => ({
      ...prev,
      [levelId]: !prev[levelId]
    }));
  };

  // Calculate statistics
  const totalElements = sortedLevels.reduce((sum, level) => sum + (level.elements?.length || 0), 0);
  const totalIndicators = sortedLevels.reduce((sum, level) => {
    const levelIndicators = Array.isArray(level.indicators) ? level.indicators.length : 0;
    const elementIndicators = level.elements?.reduce((elemSum, elem) => 
      elemSum + (Array.isArray(elem.performanceIndicators) ? elem.performanceIndicators.length : 0), 0) || 0;
    return sum + levelIndicators + elementIndicators;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Check if user came from Kafu Clinic or Competency Framework
                const referrer = document.referrer;
                if (referrer.includes('/kafu-clinic')) {
                  navigate('/kafu-clinic');
                } else {
                  navigate('/competencies');
                }
              }}
            >
              Back to Previous Page
            </Button>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold text-gray-900">
                      {competency.name}
                    </h1>
                    {hasEditAccess && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentRole === 'ADMIN') {
                            navigate(`/competencies/edit/${id}`);
                          } else {
                            navigate(`/kafu-clinic/edit-competency/${id}`);
                          }
                        }}
                        className="flex items-center gap-2"
                        title="Edit Competency"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {competency.code && (
                    <p className="text-sm text-gray-500 font-mono mt-2">
                      Code: {competency.code}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {competency.type && (
                  <Badge variant="outline" className="px-3 py-1 text-sm border-blue-300 text-blue-700 bg-blue-50">
                    <Tag className="h-3 w-3 mr-1" />
                    {competency.type}
                  </Badge>
                )}
                {competency.family && (
                  <Badge variant="outline" className="px-3 py-1 text-sm border-green-300 text-green-700 bg-green-50">
                    <Layers className="h-3 w-3 mr-1" />
                    {competency.family}
                  </Badge>
                )}
                {competency.relatedDivision && (
                  <Badge variant="outline" className="px-3 py-1 text-sm border-purple-300 text-purple-700 bg-purple-50">
                    <Building2 className="h-3 w-3 mr-1" />
                    {competency.relatedDivision}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`px-3 py-1 text-sm ${
                    competency.isActive
                      ? 'border-green-300 text-green-700 bg-green-50'
                      : 'border-gray-300 text-gray-600 bg-gray-50'
                  }`}
                >
                  <CheckCircle2 className={`h-3 w-3 mr-1 ${competency.isActive ? 'text-green-600' : 'text-gray-500'}`} />
                  {competency.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium mb-1">Levels</p>
                  <p className="text-2xl font-bold text-blue-900">{sortedLevels.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium mb-1">Elements</p>
                  <p className="text-2xl font-bold text-green-900">{totalElements}</p>
                </div>
                <Users className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium mb-1">Indicators</p>
                  <p className="text-2xl font-bold text-purple-900">{totalIndicators}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium mb-1">Status</p>
                  <p className="text-lg font-bold text-orange-900">
                    {competency.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Award className="h-8 w-8 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Definition */}
        {competency.definition && (
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
                <FileText className="h-5 w-5 text-blue-600" />
                Competency Definition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                {competency.definition}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Levels & Elements */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
              <Target className="h-6 w-6 text-green-600" />
              Competency Levels, Elements & Performance Indicators
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Detailed breakdown of all competency levels with their elements and performance indicators
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedLevels.map((level) => {
                const elements = level.elements || [];
                const levelIndicators = Array.isArray(level.indicators) ? level.indicators : [];
                
                return (
                  <div
                    key={level.id}
                    className={`border-2 rounded-xl p-5 transition-all duration-200 ${
                      getLevelColor(level.level)
                    } hover:shadow-lg`}
                  >
                    {/* Level Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge className={`px-3 py-1 text-sm font-semibold border ${getLevelBadgeColor(level.level)}`}>
                          {getLevelDisplayName(level.level)}
                        </Badge>
                        {elements.length > 0 && (
                          <span className="text-xs bg-white/60 text-gray-700 px-2 py-1 rounded-full font-medium">
                            {elements.length} element{elements.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Level Description */}
                    {level.description && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white/50 rounded-lg p-3">
                          {level.description}
                        </p>
                      </div>
                    )}

                    {/* Level Indicators */}
                    {levelIndicators.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-gray-600" />
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Level Indicators
                          </p>
                        </div>
                        <ul className="space-y-1.5 bg-white/50 rounded-lg p-3">
                          {levelIndicators.map((ind, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{ind}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Elements Section - Collapsed by default */}
                    {elements.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-white/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-700" />
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Elements & Performance Indicators ({elements.length})
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLevelElements(level.id)}
                            className="h-7 px-2 text-xs"
                          >
                            {expandedLevelElements[level.id] ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Show
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {expandedLevelElements[level.id] && (
                          <div className="space-y-3">
                            {elements.map((el) => {
                              const isElementExpanded = expandedElements[el.id];
                              const indicators = Array.isArray(el.performanceIndicators) ? el.performanceIndicators : [];
                              
                              return (
                                <div
                                  key={el.id}
                                  className="bg-white/70 border border-white/80 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-gray-900 mb-1">
                                        {el.name}
                                      </p>
                                      {indicators.length > 0 && (
                                        <p className="text-xs text-gray-500">
                                          {indicators.length} performance indicator{indicators.length !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </div>
                                    {indicators.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleElement(el.id)}
                                        className="h-7 w-7 p-0 ml-2"
                                        title={isElementExpanded ? "Hide indicators" : "Show indicators"}
                                      >
                                        {isElementExpanded ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {el.description && (
                                    <p className="text-xs text-gray-600 mb-3 italic bg-white/50 rounded p-2">
                                      {el.description}
                                    </p>
                                  )}

                                  {indicators.length > 0 && (
                                    <div className={`transition-all duration-200 ${isElementExpanded ? 'block' : 'hidden'}`}>
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                          <Target className="h-3 w-3" />
                                          Performance Indicators:
                                        </p>
                                        <ul className="space-y-2 bg-white/50 rounded-lg p-3">
                                          {indicators.map((pi, idx) => (
                                            <li key={pi.id || idx} className="flex items-start gap-2 text-sm text-gray-700">
                                              <span className="text-orange-500 mt-1 font-bold">▸</span>
                                              <span className="flex-1">{pi.action || pi}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {indicators.length > 0 && !isElementExpanded && (
                                    <div className="mt-2 text-center">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleElement(el.id)}
                                        className="text-xs h-6"
                                      >
                                        Show {indicators.length} indicator{indicators.length !== 1 ? 's' : ''}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Elements Message */}
                    {elements.length === 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-white/50 text-center">
                        <p className="text-xs text-gray-500 italic">
                          No elements defined for this level
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        {competency.documents && Array.isArray(competency.documents) && competency.documents.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <File className="h-6 w-6 text-indigo-600" />
                Related Documents ({competency.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {competency.documents.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                          {doc.name || doc.title || `Document ${idx + 1}`}
                        </p>
                        {doc.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        )}
                        {doc.createdAt && (
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Documents (legacy field) */}
        {competency.relatedDocuments && Array.isArray(competency.relatedDocuments) && competency.relatedDocuments.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                <File className="h-6 w-6 text-indigo-600" />
                Related Documents ({competency.relatedDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {competency.relatedDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <p className="text-sm font-medium text-gray-900">
                        {typeof doc === 'string' ? doc : doc.name || doc.title || `Document ${idx + 1}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewCompetency;