import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  BookOpen, 
  Upload, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FileText,
  Eye,
  Award,
  Target,
  TrendingUp,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText as Document,
  Star,
  Clock,
  AlertCircle,
  UserCheck,
  X
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmployeePhoto from '../components/EmployeePhoto';

const Competencies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(''); // Search input for client-side filtering
  const [selectedType, setSelectedType] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [showAddCompetency, setShowAddCompetency] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedCompetency, setExpandedCompetency] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [showAssessorModal, setShowAssessorModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [assessors, setAssessors] = useState([]);
  const [assessorsLoading, setAssessorsLoading] = useState(false);
  const searchInputRef = useRef(null);

  // These will be populated from actual data
  const [competencyTypes, setCompetencyTypes] = useState([]);
  const [competencyFamilies, setCompetencyFamilies] = useState([]);

  // No debouncing needed - client-side filtering is instant

  // Maintain focus after re-renders
  useEffect(() => {
    if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
      // Only refocus if the user was previously typing in the search box
      const wasSearching = searchInput.length > 0;
      if (wasSearching) {
        searchInputRef.current.focus();
      }
    }
  });

  // Fetch all competencies from API (no filtering on server side)
  const { data: competenciesData, isLoading, isError, error } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies', {
        params: {
          page: 1,
          limit: 1000
        }
      });
      return response.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const competencies = competenciesData?.competencies || [];
  
  // Calculate statistics locally
  const stats = React.useMemo(() => {
    if (!competencies.length) return { 
      total: 0, 
      active: 0, 
      families: [], 
      types: [],
      totalAssessments: 0
    };
    
    const total = competencies.length;
    const active = competencies.filter(c => c.isActive).length;
    
    const types = [...new Set(competencies.map(c => c.type).filter(Boolean))].map(type => ({
      type,
      count: competencies.filter(c => c.type === type).length
    }));
    
    const families = [...new Set(competencies.map(c => c.family).filter(Boolean))].map(family => ({
      family,
      count: competencies.filter(c => c.family === family).length
    }));
    
    // Calculate total assessments from all competencies
    const totalAssessments = competencies.reduce((sum, c) => sum + (c._count?.assessments || 0), 0);
    
    return { 
      total, 
      active, 
      types, 
      families, 
      totalAssessments 
    };
  }, [competencies]);

  // Populate filter options from stats data
  useEffect(() => {
    if (stats.types && stats.families) {
      // Get unique types from stats
      const uniqueTypes = stats.types.map(t => t.type);
      setCompetencyTypes(uniqueTypes);
      
      // Get unique families from stats
      const uniqueFamilies = stats.families.map(f => f.family);
      setCompetencyFamilies(uniqueFamilies);
    }
  }, [stats]);

  const handleFileUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload/competencies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setUploadResults(response.data.summary);
      toast({
        title: 'Upload Successful',
        description: response.data.message,
        variant: 'success',
      });
      
      // Refresh the competencies list
      queryClient.invalidateQueries(['competencies']);
      queryClient.invalidateQueries(['competency-stats']);
      
      setShowUploadModal(false);
      setFile(null);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err.response?.data?.message || 'An error occurred during upload.',
        variant: 'destructive',
      });
      setUploadResults({
        total: 0,
        successful: 0,
        errors: 1,
        details: err.response?.data?.results || [],
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'TECHNICAL':
        return 'bg-blue-100 text-blue-800';
      case 'NON_TECHNICAL':
        return 'bg-green-100 text-green-800';
      case 'BEHAVIORAL':
        return 'bg-purple-100 text-purple-800';
      case 'LEADERSHIP':
        return 'bg-orange-100 text-orange-800';
      case 'FUNCTIONAL':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyColor = (family) => {
    switch (family) {
      case 'Operations':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'Technical Services':
        return 'bg-blue-100 text-blue-800';
      case 'Media':
        return 'bg-purple-100 text-purple-800';
      case 'HR & Admin':
        return 'bg-green-100 text-green-800';
      case 'Certification & Compliance':
        return 'bg-yellow-100 text-yellow-800';
      case 'Fire':
        return 'bg-red-200 text-red-900';
      case 'Security':
        return 'bg-gray-100 text-gray-800';
      case 'Finance & Procurement':
        return 'bg-emerald-100 text-emerald-800';
      case 'Quality':
        return 'bg-indigo-100 text-indigo-800';
      case 'HSE':
        return 'bg-teal-100 text-teal-800';
      case 'ICT':
        return 'bg-cyan-100 text-cyan-800';
      case 'Common':
        return 'bg-slate-100 text-slate-800';
      case 'Legal & Regulatory':
        return 'bg-rose-100 text-rose-800';
      case 'Internal Audit':
        return 'bg-violet-100 text-violet-800';
      case 'Commercial':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC':
        return 'bg-gray-100 text-gray-800';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED':
        return 'bg-blue-100 text-blue-800';
      case 'MASTERY':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'SOP':
        return '📋';
      case 'MANUAL':
        return '📖';
      case 'GUIDELINE':
        return '📝';
      case 'PROCEDURE':
        return '⚙️';
      case 'TRAINING_MATERIAL':
        return '🎓';
      case 'POLICY':
        return '📜';
      default:
        return '📄';
    }
  };

  // Client-side filtering for instant search
  const filteredCompetencies = useMemo(() => {
    if (!competencies) return [];
    
    let filtered = competencies;
    
    // Search filter
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(competency => 
        competency.name?.toLowerCase().includes(searchLower) ||
        competency.definition?.toLowerCase().includes(searchLower) ||
        competency.family?.toLowerCase().includes(searchLower) ||
        competency.type?.toLowerCase().includes(searchLower)
      );
    }
    
    // Type filter
    if (selectedType) {
      filtered = filtered.filter(competency => competency.type === selectedType);
    }
    
    // Family filter
    if (selectedFamily) {
      filtered = filtered.filter(competency => competency.family === selectedFamily);
    }
    
    return filtered;
  }, [competencies, searchInput, selectedType, selectedFamily]);

  const toggleCompetency = (competencyId) => {
    setExpandedCompetency(expandedCompetency === competencyId ? null : competencyId);
  };

  const fetchAssessors = async (competencyId) => {
    try {
      setAssessorsLoading(true);
      const response = await api.get(`/assessors/competency/${competencyId}`);
      const assessors = response.data.assessors || [];
      setAssessors(assessors);
      
      // Store assessors count for this competency
      setCompetencyAssessors(prev => ({
        ...prev,
        [competencyId]: assessors
      }));
    } catch (error) {
      console.error('Error fetching assessors:', error);
      toast({
        title: "Error",
        description: "Failed to load assessors for this competency.",
        variant: "destructive",
      });
      setAssessors([]);
    } finally {
      setAssessorsLoading(false);
    }
  };

  const openAssessorModal = (competency) => {
    setSelectedCompetency(competency);
    setShowAssessorModal(true);
    fetchAssessors(competency.id);
  };

  // Check if competency has assessors (we'll need to track this)
  const [competencyAssessors, setCompetencyAssessors] = useState({});
  
  // Function to check if a competency has assessors
  const hasAssessors = (competencyId) => {
    return competencyAssessors[competencyId] && competencyAssessors[competencyId].length > 0;
  };

  // Pre-fetch assessors for all competencies to show correct icon colors
  useEffect(() => {
    if (competencies.length > 0) {
      const fetchAllAssessors = async () => {
        const promises = competencies.map(async (competency) => {
          try {
            const response = await api.get(`/assessors/competency/${competency.id}`);
            return {
              competencyId: competency.id,
              assessors: response.data.assessors || []
            };
          } catch (error) {
            console.error(`Error fetching assessors for competency ${competency.id}:`, error);
            return {
              competencyId: competency.id,
              assessors: []
            };
          }
        });

        const results = await Promise.all(promises);
        const assessorsMap = {};
        results.forEach(result => {
          assessorsMap[result.competencyId] = result.assessors;
        });
        setCompetencyAssessors(assessorsMap);
      };

      fetchAllAssessors();
    }
  }, [competencies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading competencies...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Error loading competencies: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competency Framework</h1>
          <p className="text-gray-600">Manage your organization's competency dictionary and skill development</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="loyverse-button-secondary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Dictionary
          </Button>
          <Button
            onClick={() => setShowAddCompetency(true)}
            className="loyverse-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Competency
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Competencies</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Families</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.families?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assessments</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalAssessments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="search">Search Competencies</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  id="search"
                  key="search-input"
                  placeholder="Search by name, definition, or family..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Competency Type</Label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Types</option>
                {competencyTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="family">Competency Family</Label>
              <select
                id="family"
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Families</option>
                {competencyFamilies.map(family => (
                  <option key={family} value={family}>{family}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competencies List */}
      <div className="space-y-4">
        {filteredCompetencies.map((competency) => (
          <Card key={competency.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{competency.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(competency.type)}`}>
                        {competency.type.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFamilyColor(competency.family)}`}>
                        {competency.family}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{competency.definition}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span 
                        className="flex items-center cursor-pointer hover:text-blue-600"
                        onClick={() => setExpandedCompetency(expandedCompetency === competency.id ? null : competency.id)}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        {competency.levels.length} Levels
                      </span>
                      <span className="flex items-center">
                        <Document className="h-3 w-3 mr-1" />
                        {competency.documents.length} Documents
                      </span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {competency.assessmentCount} Assessments
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => openAssessorModal(competency)}
                    className={`${hasAssessors(competency.id) ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-green-600'}`}
                    title={`View Assessors${hasAssessors(competency.id) ? ` (${competencyAssessors[competency.id]?.length || 0} assigned)` : ' (None assigned)'}`}
                  >
                    <UserCheck className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600" title="View">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => navigate(`/competencies/edit/${competency.id}`)}
                    className="text-gray-400 hover:text-blue-600" 
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => toggleCompetency(competency.id)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Expand"
                  >
                    {expandedCompetency === competency.id ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
            </CardHeader>
            
            {expandedCompetency === competency.id && (
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {/* Competency Levels */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Competency Levels</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {competency.levels.map((level) => (
                        <div key={level.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-center mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(level.level)}`}>
                              {level.level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                          {level.indicators.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Indicators:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {level.indicators.slice(0, 2).map((indicator, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="mr-1">•</span>
                                    <span>{indicator}</span>
                                  </li>
                                ))}
                                {level.indicators.length > 2 && (
                                  <li className="text-gray-400">+{level.indicators.length - 2} more...</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  {competency.documents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Related Documents</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {competency.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-lg">{getDocumentIcon(doc.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                              <p className="text-xs text-gray-500">{doc.type} • v{doc.version}</p>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Competency Dictionary</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select CSV file</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSV should include: Competency Name, Type, Family, Definition, and level descriptions.
                </p>
              </div>
              {uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowUploadModal(false)}
                  className="loyverse-button-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={isUploading || !file}
                  className="loyverse-button"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessor Modal */}
      {showAssessorModal && selectedCompetency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Assessors for {selectedCompetency.name}</h3>
                  <p className="text-sm text-gray-600">{selectedCompetency.type} • {selectedCompetency.family}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssessorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {assessorsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading assessors...</p>
                  </div>
                </div>
              ) : assessors.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessors Found</h3>
                  <p className="text-gray-500">
                    No assessors have been assigned to this competency yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-6">
                    <p className="text-sm text-gray-600">
                      {assessors.length} assessor{assessors.length !== 1 ? 's' : ''} assigned to this competency
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assessors.map((assessor) => (
                      <div key={assessor.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <EmployeePhoto
                              sid={assessor.assessor_sid}
                              firstName={assessor.first_name}
                              lastName={assessor.last_name}
                              size="medium"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {assessor.first_name} {assessor.last_name}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {assessor.job_title || 'No Job Title'}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {assessor.assessor_sid}
                            </p>
                            
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Level:</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(assessor.competency_level)}`}>
                                  {assessor.competency_level}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Status:</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  assessor.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {assessor.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                <div className="flex items-center">
                                  <span className="truncate">{assessor.email}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <span>{assessor.division || 'No Division'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competencies;
