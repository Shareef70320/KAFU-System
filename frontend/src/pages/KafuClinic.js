import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { 
  BookOpen, 
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  Save,
  Eye,
  Target,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Shield,
  UserPlus,
  Key,
  Check,
  XCircle,
  Info,
  List,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import { getLevelDisplayName } from '../utils/competencyLevels';
import { useUser } from '../contexts/UserContext';

const KafuClinic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid, currentRole } = useUser();
  
  // Check if user has clinic access
  const userClinicAccess = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('kafuClinicAccessList');
      const accessList = saved ? JSON.parse(saved) : [];
      return accessList.find(access => access.userId === currentSid) || null;
    } catch (error) {
      return null;
    }
  }, [currentSid]);
  
  const isAdmin = currentRole === 'ADMIN';
  const hasClinicAccess = !!userClinicAccess;
  const hasAccessAllCompetencies = userClinicAccess?.accessAllCompetencies || false;
  
  // Get tab from URL query parameter
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['access', 'owned-competencies', 'owned-jcps', 'oa-competency-dictionary'].includes(tabParam)) {
      return tabParam;
    }
    return isAdmin ? 'access' : (hasClinicAccess ? 'owned-competencies' : 'access');
  };
  
  // Tab state - different for admin vs user
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // Update tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['access', 'owned-competencies', 'owned-jcps', 'oa-competency-dictionary'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);
  
  // Competencies state
  const [competencySearch, setCompetencySearch] = useState('');
  const [competencyTypeFilter, setCompetencyTypeFilter] = useState('all');
  const [competencyFamilyFilter, setCompetencyFamilyFilter] = useState('all');
  
  // OA Competency Dictionary state (for users with accessAllCompetencies)
  const [oaDictionarySearch, setOaDictionarySearch] = useState('');
  const [oaDictionaryTypeFilter, setOaDictionaryTypeFilter] = useState('all');
  const [oaDictionaryFamilyFilter, setOaDictionaryFamilyFilter] = useState('all');
  const [oaDictionaryDivisionFilter, setOaDictionaryDivisionFilter] = useState('all');
  const [expandedOaCompetency, setExpandedOaCompetency] = useState(null);
  const [showOaElementsModal, setShowOaElementsModal] = useState(false);
  const [selectedOaCompetencyForElements, setSelectedOaCompetencyForElements] = useState(null);
  const [oaLevelElements, setOaLevelElements] = useState([]);
  const [oaElementsLoading, setOaElementsLoading] = useState(false);
  const [activeOaLevelId, setActiveOaLevelId] = useState(null);
  const [expandedOaElementsModal, setExpandedOaElementsModal] = useState({});
  
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [competencyForm, setCompetencyForm] = useState({
    code: '',
    name: '',
    type: 'TECHNICAL',
    family: '',
    definition: '',
    relatedDivision: '',
    isActive: true
  });
  
  // JCP state
  const [jcpSearch, setJcpSearch] = useState('');
  const [showJcpModal, setShowJcpModal] = useState(false);
  const [editingJcp, setEditingJcp] = useState(null);
  const [jcpForm, setJcpForm] = useState({
    jcpCode: '',
    jobIds: [],
    competencies: []
  });
  const [jcpJobSearch, setJcpJobSearch] = useState('');
  const [jcpCompetencySearch, setJcpCompetencySearch] = useState('');
  const [selectedJcpJobs, setSelectedJcpJobs] = useState([]);
  const [selectedJcpCompetencies, setSelectedJcpCompetencies] = useState([]);
  
  // Clinic Access state
  const [accessSearch, setAccessSearch] = useState('');
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [editingAccess, setEditingAccess] = useState(null);
  const [accessForm, setAccessForm] = useState({
    userId: '',
    accessAllCompetencies: false, // Access to all competencies (read-only)
    competencyPermissions: [], // Array of { competencyId, view, edit }
    jcpPermissions: [] // Array of { jcpCode, view, edit }
  });
  const [accessUserSearch, setAccessUserSearch] = useState('');
  const [competencyFilterType, setCompetencyFilterType] = useState('all');
  const [competencyFilterFamily, setCompetencyFilterFamily] = useState('all');
  const [competencyFilterDivision, setCompetencyFilterDivision] = useState('all');
  const [competencySearchInModal, setCompetencySearchInModal] = useState('');
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState([]);
  const [jcpSearchInModal, setJcpSearchInModal] = useState('');
  const [selectedJcpCodes, setSelectedJcpCodes] = useState([]);
  const [allSelectedView, setAllSelectedView] = useState(true);
  const [allSelectedEdit, setAllSelectedEdit] = useState(false);
  const [allSelectedJcpView, setAllSelectedJcpView] = useState(true);
  const [allSelectedJcpEdit, setAllSelectedJcpEdit] = useState(false);
  
  // Fetch competencies
  const { data: competenciesData, isLoading: competenciesLoading } = useQuery({
    queryKey: ['competencies'],
    queryFn: async () => {
      const response = await api.get('/competencies?limit=1000');
      return response.data;
    }
  });
  
  // Compute available families from competencies data (same as Competencies page)
  const availableFamilies = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    
    let filtered = competenciesData.competencies;
    
    // If type is selected, only show families that belong to that type
    if (competencyFilterType && competencyFilterType !== 'all') {
      filtered = filtered.filter(c => c.type === competencyFilterType);
    }
    
    // If division is selected, only show families that have that division
    if (competencyFilterDivision && competencyFilterDivision !== 'all') {
      filtered = filtered.filter(c => c.relatedDivision === competencyFilterDivision);
    }
    
    return [...new Set(filtered.map(c => c.family).filter(Boolean))].sort();
  }, [competenciesData, competencyFilterType, competencyFilterDivision]);
  
  // Get families filtered by type (linked filter) - for dropdown display
  const filteredFamiliesByType = React.useMemo(() => {
    return availableFamilies;
  }, [availableFamilies]);
  
  // Get divisions filtered by type and family (linked filters)
  const filteredDivisions = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    const divisions = new Set();
    competenciesData.competencies.forEach(comp => {
      const matchesType = competencyFilterType === 'all' || comp.type === competencyFilterType;
      const matchesFamily = competencyFilterFamily === 'all' || comp.family === competencyFilterFamily;
      if (matchesType && matchesFamily && comp.relatedDivision) {
        divisions.add(comp.relatedDivision);
      }
    });
    return Array.from(divisions).sort();
  }, [competenciesData, competencyFilterType, competencyFilterFamily]);
  
  // Handle filter changes with reset logic
  const handleTypeChange = (value) => {
    setCompetencyFilterType(value);
    setCompetencyFilterFamily('all'); // Reset family when type changes
    setCompetencyFilterDivision('all'); // Reset division when type changes
  };
  
  const handleFamilyChange = (value) => {
    setCompetencyFilterFamily(value);
    setCompetencyFilterDivision('all'); // Reset division when family changes
  };
  
  const handleDivisionChange = (value) => {
    setCompetencyFilterDivision(value);
    // Note: Families will automatically update via useMemo when division changes
  };
  
  // Get filtered competencies for display
  const filteredCompetenciesForSelection = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    return competenciesData.competencies.filter(comp => {
      const matchesSearch = !competencySearchInModal || 
        comp.name.toLowerCase().includes(competencySearchInModal.toLowerCase()) ||
        comp.code?.toLowerCase().includes(competencySearchInModal.toLowerCase());
      const matchesType = competencyFilterType === 'all' || comp.type === competencyFilterType;
      const matchesFamily = competencyFilterFamily === 'all' || comp.family === competencyFilterFamily;
      const matchesDivision = competencyFilterDivision === 'all' || comp.relatedDivision === competencyFilterDivision;
      return matchesSearch && matchesType && matchesFamily && matchesDivision;
    });
  }, [competenciesData, competencySearchInModal, competencyFilterType, competencyFilterFamily, competencyFilterDivision]);
  
  // Select all filtered competencies
  const handleSelectAllCompetencies = (checked) => {
    if (checked) {
      const newIds = filteredCompetenciesForSelection.map(c => c.id);
      const newPerms = filteredCompetenciesForSelection.map(c => ({
        competencyId: c.id,
        view: allSelectedView,
        edit: allSelectedEdit
      }));
      setSelectedCompetencyIds([...new Set([...selectedCompetencyIds, ...newIds])]);
      setAccessForm(prev => {
        const existingIds = new Set(prev.competencyPermissions.map(p => p.competencyId));
        const newPermsToAdd = newPerms.filter(p => !existingIds.has(p.competencyId));
        return {
          ...prev,
          competencyPermissions: [...prev.competencyPermissions, ...newPermsToAdd]
        };
      });
    } else {
      const filteredIds = new Set(filteredCompetenciesForSelection.map(c => c.id));
      setSelectedCompetencyIds(selectedCompetencyIds.filter(id => !filteredIds.has(id)));
      setAccessForm(prev => ({
        ...prev,
        competencyPermissions: prev.competencyPermissions.filter(p => !filteredIds.has(p.competencyId))
      }));
    }
  };
  
  
  const allFilteredSelected = React.useMemo(() => {
    return filteredCompetenciesForSelection.length > 0 && 
      filteredCompetenciesForSelection.every(c => selectedCompetencyIds.includes(c.id));
  }, [filteredCompetenciesForSelection, selectedCompetencyIds]);
  
  // Fetch employees for access assignment
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      return response.data;
    }
  });
  
  // Clinic access data with localStorage persistence
  const [clinicAccessList, setClinicAccessList] = useState(() => {
    try {
      const saved = localStorage.getItem('kafuClinicAccessList');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading clinic access from localStorage:', error);
      return [];
    }
  });
  
  // Save to localStorage whenever clinicAccessList changes
  React.useEffect(() => {
    try {
      localStorage.setItem('kafuClinicAccessList', JSON.stringify(clinicAccessList));
    } catch (error) {
      console.error('Error saving clinic access to localStorage:', error);
    }
  }, [clinicAccessList]);
  
  // Fetch jobs
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs?limit=1000');
      return response.data;
    }
  });
  
  // Fetch job-competency mappings (JCPs)
  const { data: jcpsData, isLoading: jcpsLoading } = useQuery({
    queryKey: ['jobCompetencies'],
    queryFn: async () => {
      const response = await api.get('/job-competencies?limit=10000');
      return response.data;
    }
  });

  // Filter competencies
  const filteredCompetencies = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    
    return competenciesData.competencies.filter(comp => {
      const matchesSearch = !competencySearch || 
        comp.name.toLowerCase().includes(competencySearch.toLowerCase()) ||
        comp.code?.toLowerCase().includes(competencySearch.toLowerCase());
      const matchesType = competencyTypeFilter === 'all' || comp.type === competencyTypeFilter;
      const matchesFamily = competencyFamilyFilter === 'all' || comp.family === competencyFamilyFilter;
      
      return matchesSearch && matchesType && matchesFamily;
    });
  }, [competenciesData, competencySearch, competencyTypeFilter, competencyFamilyFilter]);
  
  // Get unique JCP codes from mappings
  const uniqueJcps = React.useMemo(() => {
    if (!jcpsData?.mappings || !jobsData?.jobs) return [];
    
    const jcpMap = new Map();
    
    jcpsData.mappings.forEach(mapping => {
      const job = jobsData.jobs.find(j => j.id === mapping.jobId);
      if (job && job.jcp_code) {
        if (!jcpMap.has(job.jcp_code)) {
          jcpMap.set(job.jcp_code, {
            jcpCode: job.jcp_code,
            jobs: [],
            competencies: new Set()
          });
        }
        const jcp = jcpMap.get(job.jcp_code);
        if (!jcp.jobs.find(j => j.id === job.id)) {
          jcp.jobs.push(job);
        }
        jcp.competencies.add(mapping.competencyId);
      }
    });
    
    return Array.from(jcpMap.values()).map(jcp => ({
      ...jcp,
      competencies: Array.from(jcp.competencies),
      jobCount: jcp.jobs.length,
      competencyCount: jcp.competencies.size
    }));
  }, [jcpsData, jobsData]);
  
  // Filter JCPs
  const filteredJcps = React.useMemo(() => {
    if (!uniqueJcps) return [];
    
    return uniqueJcps.filter(jcp => {
      return !jcpSearch || 
        jcp.jcpCode.toLowerCase().includes(jcpSearch.toLowerCase()) ||
        jcp.jobs.some(job => job.code?.toLowerCase().includes(jcpSearch.toLowerCase()) ||
                           job.title?.toLowerCase().includes(jcpSearch.toLowerCase()));
    });
  }, [uniqueJcps, jcpSearch]);
  
  // Edit history state
  const [editHistory, setEditHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('kafuClinicEditHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });
  
  // Save edit to history
  const logEdit = (type, itemId, itemName, field, oldValue, newValue) => {
    const editRecord = {
      id: Date.now().toString(),
      userId: currentSid,
      userName: employeesData?.employees?.find(e => e.sid === currentSid)?.first_name + ' ' + 
                employeesData?.employees?.find(e => e.sid === currentSid)?.last_name,
      type, // 'competency' or 'jcp'
      itemId,
      itemName,
      field,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      status: 'pending' // pending, approved, rejected
    };
    const newHistory = [...editHistory, editRecord];
    setEditHistory(newHistory);
    try {
      localStorage.setItem('kafuClinicEditHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving edit history:', error);
    }
  };
  
  // Get user's assigned competencies and JCPs
  const userCompetencies = React.useMemo(() => {
    if (!userClinicAccess || !competenciesData?.competencies) return [];
    const assignedIds = userClinicAccess.competencyPermissions?.map(p => p.competencyId) || [];
    return competenciesData.competencies.filter(c => assignedIds.includes(c.id)).map(comp => {
      const perm = userClinicAccess.competencyPermissions.find(p => p.competencyId === comp.id);
      return {
        ...comp,
        canView: perm?.view || false,
        canEdit: perm?.edit || false
      };
    });
  }, [userClinicAccess, competenciesData]);
  
  const userJcps = React.useMemo(() => {
    if (!userClinicAccess || !uniqueJcps) return [];
    const assignedCodes = userClinicAccess.jcpPermissions?.map(p => p.jcpCode) || [];
    return uniqueJcps.filter(jcp => assignedCodes.includes(jcp.jcpCode)).map(jcp => {
      const perm = userClinicAccess.jcpPermissions.find(p => p.jcpCode === jcp.jcpCode);
      return {
        ...jcp,
        canView: perm?.view || false,
        canEdit: perm?.edit || false
      };
    });
  }, [userClinicAccess, uniqueJcps]);

  // Get unique types, families, and divisions for OA Dictionary filters
  const oaDictionaryUniqueTypes = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    return [...new Set(competenciesData.competencies.map(c => c.type).filter(Boolean))].sort();
  }, [competenciesData]);

  const oaDictionaryUniqueFamilies = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    let filtered = competenciesData.competencies;
    if (oaDictionaryTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === oaDictionaryTypeFilter);
    }
    return [...new Set(filtered.map(c => c.family).filter(Boolean))].sort();
  }, [competenciesData, oaDictionaryTypeFilter]);

  const oaDictionaryUniqueDivisions = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    let filtered = competenciesData.competencies;
    if (oaDictionaryTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === oaDictionaryTypeFilter);
    }
    if (oaDictionaryFamilyFilter !== 'all') {
      filtered = filtered.filter(c => c.family === oaDictionaryFamilyFilter);
    }
    return [...new Set(filtered.map(c => c.relatedDivision || c.related_division).filter(Boolean))].sort();
  }, [competenciesData, oaDictionaryTypeFilter, oaDictionaryFamilyFilter]);

  // Filter competencies for OA Dictionary
  const filteredOaDictionaryCompetencies = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    
    let filtered = competenciesData.competencies;
    
    // Search filter
    if (oaDictionarySearch.trim()) {
      const searchLower = oaDictionarySearch.toLowerCase();
      filtered = filtered.filter(competency => 
        competency.name?.toLowerCase().includes(searchLower) ||
        competency.definition?.toLowerCase().includes(searchLower) ||
        competency.family?.toLowerCase().includes(searchLower) ||
        competency.type?.toLowerCase().includes(searchLower) ||
        competency.code?.toLowerCase().includes(searchLower)
      );
    }
    
    // Type filter
    if (oaDictionaryTypeFilter !== 'all') {
      filtered = filtered.filter(competency => competency.type === oaDictionaryTypeFilter);
    }
    
    // Family filter
    if (oaDictionaryFamilyFilter !== 'all') {
      filtered = filtered.filter(competency => competency.family === oaDictionaryFamilyFilter);
    }
    
    // Division filter
    if (oaDictionaryDivisionFilter !== 'all') {
      filtered = filtered.filter(competency => 
        competency.relatedDivision === oaDictionaryDivisionFilter || 
        competency.related_division === oaDictionaryDivisionFilter
      );
    }
    
    return filtered;
  }, [competenciesData, oaDictionarySearch, oaDictionaryTypeFilter, oaDictionaryFamilyFilter, oaDictionaryDivisionFilter]);

  // Helper functions for styling (same as Competencies page)
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
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyColor = (family) => {
    // Generate a consistent color based on family name
    const colors = [
      'bg-red-100 text-red-800',
      'bg-orange-100 text-orange-800',
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-teal-100 text-teal-800',
      'bg-cyan-100 text-cyan-800',
    ];
    if (!family) return 'bg-gray-100 text-gray-800';
    const index = family.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getTotalElementsCount = (competency) => {
    if (competency.levels && Array.isArray(competency.levels)) {
      return competency.levels.reduce((sum, level) => sum + (level.elements?.length || 0), 0);
    }
    return 0;
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC':
      case 'AWARE':
        return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE':
      case 'KNOWLEDGE':
        return 'bg-green-100 text-green-800';
      case 'ADVANCED':
      case 'SKILLED':
        return 'bg-orange-100 text-orange-800';
      case 'MASTERY':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Functions for OA Dictionary level and element display
  const openOaElementsModal = async (competency, levelId = null) => {
    setSelectedOaCompetencyForElements(competency);
    setActiveOaLevelId(levelId);
    setExpandedOaElementsModal({});
    setShowOaElementsModal(true);

    const hasLevels = Array.isArray(competency.levels) && competency.levels.length > 0;
    if (hasLevels) {
      setOaLevelElements(
        competency.levels.map(level => ({
          ...level,
          elements: Array.isArray(level.elements) ? level.elements : []
        }))
      );
    } else {
      // Fetch full competency data if levels not loaded
      setOaElementsLoading(true);
      try {
        const response = await api.get(`/competencies/${competency.id}`);
        const levels = (response.data?.levels || []).map(level => ({
          ...level,
          elements: Array.isArray(level.elements) ? level.elements : []
        }));
        setOaLevelElements(levels);
      } catch (error) {
        console.error('Error fetching level elements:', error);
        toast({
          title: "Error",
          description: "Failed to load competency elements.",
          variant: "destructive",
        });
        setOaLevelElements([]);
      } finally {
        setOaElementsLoading(false);
      }
    }
  };
  
  // Create/Update competency mutation
  const competencyMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCompetency) {
        const response = await api.put(`/competencies/${editingCompetency.id}`, data);
        return response.data;
      } else {
        const response = await api.post('/competencies', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competencies']);
      setShowCompetencyModal(false);
      setEditingCompetency(null);
      setCompetencyForm({
        code: '',
        name: '',
        type: 'TECHNICAL',
        family: '',
        definition: '',
        relatedDivision: '',
        isActive: true
      });
      toast({
        title: 'Success',
        description: editingCompetency ? 'Competency updated successfully!' : 'Competency created successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save competency',
        variant: 'destructive'
      });
    }
  });
  
  // Delete competency mutation
  const deleteCompetencyMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/competencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competencies']);
      toast({
        title: 'Success',
        description: 'Competency deleted successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete competency',
        variant: 'destructive'
      });
    }
  });
  
  // Handle competency operations
  const handleCreateCompetency = () => {
    setEditingCompetency(null);
    setCompetencyForm({
      code: '',
      name: '',
      type: 'TECHNICAL',
      family: '',
      definition: '',
      relatedDivision: '',
      isActive: true
    });
    setShowCompetencyModal(true);
  };
  
  const handleEditCompetency = (competency) => {
    setEditingCompetency(competency);
    setCompetencyForm({
      code: competency.code || '',
      name: competency.name || '',
      type: competency.type || 'TECHNICAL',
      family: competency.family || '',
      definition: competency.definition || '',
      relatedDivision: competency.relatedDivision || '',
      isActive: competency.isActive !== undefined ? competency.isActive : true
    });
    setShowCompetencyModal(true);
  };
  
  const handleDeleteCompetency = async (competency) => {
    if (window.confirm(`Are you sure you want to delete "${competency.name}"?`)) {
      deleteCompetencyMutation.mutate(competency.id);
    }
  };
  
  const handleSaveCompetency = async () => {
    if (!isAdmin && editingCompetency) {
      // For non-admin users, track all changes before saving
      const changes = [];
      if (editingCompetency.name !== competencyForm.name) {
        changes.push({
          field: 'name',
          oldValue: editingCompetency.name,
          newValue: competencyForm.name
        });
      }
      if (editingCompetency.definition !== competencyForm.definition) {
        changes.push({
          field: 'definition',
          oldValue: editingCompetency.definition,
          newValue: competencyForm.definition
        });
      }
      
      // Log each change
      changes.forEach(change => {
        logEdit('competency', editingCompetency.id, editingCompetency.name, change.field, change.oldValue, change.newValue);
      });
      
      // Show message that edit is pending review
      toast({
        title: 'Edit Submitted',
        description: 'Your changes have been recorded and will be reviewed by an administrator.',
        variant: 'default'
      });
      
      // For now, we'll save locally but mark as pending
      // In the future, this should go to a backend API
      setShowCompetencyModal(false);
      setEditingCompetency(null);
      queryClient.invalidateQueries(['competencies']);
      return;
    }
    
    // Admin can save directly
    competencyMutation.mutate(competencyForm);
  };
  
  // Handle JCP operations
  const handleCreateJcp = () => {
    setEditingJcp(null);
    setJcpForm({
      jcpCode: '',
      jobIds: [],
      competencies: []
    });
    setSelectedJcpJobs([]);
    setSelectedJcpCompetencies([]);
    setShowJcpModal(true);
  };
  
  const handleEditJcp = (jcp) => {
    setEditingJcp(jcp);
    setJcpForm({
      jcpCode: jcp.jcpCode,
      jobIds: jcp.jobs.map(j => j.id),
      competencies: jcp.competencies
    });
    setSelectedJcpJobs(jcp.jobs);
    // Load existing competencies for display
    if (competenciesData?.competencies) {
      const existingComps = competenciesData.competencies.filter(c => jcp.competencies.includes(c.id));
      setSelectedJcpCompetencies(existingComps);
    } else {
      setSelectedJcpCompetencies([]);
    }
    setShowJcpModal(true);
  };
  
  const handleDeleteJcp = async (jcp) => {
    if (window.confirm(`Are you sure you want to delete JCP "${jcp.jcpCode}"? This will affect ${jcp.jobCount} job(s).`)) {
      // Delete all mappings for jobs with this JCP code
      try {
        const jobsWithJcp = jobsData.jobs.filter(j => j.jcp_code === jcp.jcpCode);
        for (const job of jobsWithJcp) {
          const mappings = jcpsData.mappings.filter(m => m.jobId === job.id);
          for (const mapping of mappings) {
            await api.delete(`/job-competencies/${mapping.id}`);
          }
          // Clear JCP code
          await api.put(`/jobs/${job.id}`, { jcp_code: null });
        }
        queryClient.invalidateQueries(['jobCompetencies']);
        queryClient.invalidateQueries(['jobs']);
        toast({
          title: 'Success',
          description: 'JCP deleted successfully!',
          variant: 'default'
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to delete JCP',
          variant: 'destructive'
        });
      }
    }
  };
  
  const handleSaveJcp = async () => {
    try {
      if (!isAdmin && editingJcp) {
        // For non-admin users, track changes
        const changes = [];
        if (editingJcp.jcpCode !== jcpForm.jcpCode) {
          changes.push({
            field: 'jcpCode',
            oldValue: editingJcp.jcpCode,
            newValue: jcpForm.jcpCode
          });
        }
        
        // Track competency changes
        const oldCompetencyIds = new Set(editingJcp.competencies);
        const newCompetencyIds = new Set(jcpForm.competencies);
        
        // Added competencies
        jcpForm.competencies.filter(id => !oldCompetencyIds.has(id)).forEach(compId => {
          const comp = competenciesData?.competencies?.find(c => c.id === compId);
          logEdit('jcp', editingJcp.jcpCode, editingJcp.jcpCode, 'competency_added', '', comp?.name || compId);
        });
        
        // Removed competencies
        editingJcp.competencies.filter(id => !newCompetencyIds.has(id)).forEach(compId => {
          const comp = competenciesData?.competencies?.find(c => c.id === compId);
          logEdit('jcp', editingJcp.jcpCode, editingJcp.jcpCode, 'competency_removed', comp?.name || compId, '');
        });
        
        // Log other changes
        changes.forEach(change => {
          logEdit('jcp', editingJcp.jcpCode, editingJcp.jcpCode, change.field, change.oldValue, change.newValue);
        });
        
        toast({
          title: 'Edit Submitted',
          description: 'Your changes have been recorded and will be reviewed by an administrator.',
          variant: 'default'
        });
        
        setShowJcpModal(false);
        setEditingJcp(null);
        queryClient.invalidateQueries(['jobCompetencies']);
        return;
      }
      
      // Admin can save directly
      // Update JCP code for selected jobs
      for (const jobId of jcpForm.jobIds) {
        await api.put(`/jobs/${jobId}`, { jcp_code: jcpForm.jcpCode });
      }
      
      // Create/update mappings for each job-competency combination
      for (const jobId of jcpForm.jobIds) {
        for (const competencyId of jcpForm.competencies) {
          // Check if mapping exists
          const existingMapping = jcpsData.mappings.find(
            m => m.jobId === jobId && m.competencyId === competencyId
          );
          
          if (!existingMapping) {
            // Create new mapping
            await api.post('/job-competencies', {
              jobId,
              competencyId,
              requiredLevel: 'BASIC',
              isRequired: true
            });
          }
        }
      }
      
      queryClient.invalidateQueries(['jobCompetencies']);
      queryClient.invalidateQueries(['jobs']);
      setShowJcpModal(false);
      setEditingJcp(null);
      toast({
        title: 'Success',
        description: editingJcp ? 'JCP updated successfully!' : 'JCP created successfully!',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save JCP',
        variant: 'destructive'
      });
    }
  };
  
  // Filter jobs and competencies for JCP modal
  const filteredJobsForJcp = React.useMemo(() => {
    if (!jobsData?.jobs) return [];
    return jobsData.jobs.filter(job => 
      !jcpJobSearch || 
      job.code?.toLowerCase().includes(jcpJobSearch.toLowerCase()) ||
      job.title?.toLowerCase().includes(jcpJobSearch.toLowerCase())
    );
  }, [jobsData, jcpJobSearch]);
  
  const filteredCompetenciesForJcp = React.useMemo(() => {
    if (!competenciesData?.competencies) return [];
    return competenciesData.competencies.filter(comp =>
      !jcpCompetencySearch ||
      comp.name.toLowerCase().includes(jcpCompetencySearch.toLowerCase()) ||
      comp.code?.toLowerCase().includes(jcpCompetencySearch.toLowerCase())
    );
  }, [competenciesData, jcpCompetencySearch]);
  
  const toggleJobSelection = (job) => {
    if (selectedJcpJobs.find(j => j.id === job.id)) {
      setSelectedJcpJobs(selectedJcpJobs.filter(j => j.id !== job.id));
      setJcpForm(prev => ({
        ...prev,
        jobIds: prev.jobIds.filter(id => id !== job.id)
      }));
    } else {
      setSelectedJcpJobs([...selectedJcpJobs, job]);
      setJcpForm(prev => ({
        ...prev,
        jobIds: [...prev.jobIds, job.id]
      }));
    }
  };
  
  const toggleCompetencySelection = (competency) => {
    if (jcpForm.competencies.includes(competency.id)) {
      setJcpForm(prev => ({
        ...prev,
        competencies: prev.competencies.filter(id => id !== competency.id)
      }));
    } else {
      setJcpForm(prev => ({
        ...prev,
        competencies: [...prev.competencies, competency.id]
      }));
    }
  };
  
  const uniqueTypes = ['TECHNICAL', 'NON_TECHNICAL'];
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Stethoscope className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kafu Clinic</h1>
            <p className="text-gray-600 text-sm mt-1">
              {isAdmin 
                ? 'Competency and Job Competency Profile Management'
                : hasClinicAccess 
                  ? 'Your Assigned Competencies and JCPs'
                  : 'You do not have clinic access'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabs - Different for admin vs user */}
      {(isAdmin || hasClinicAccess) && (
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            {isAdmin ? (
              <button
                onClick={() => {
                  setActiveTab('access');
                  navigate('/kafu-clinic?tab=access', { replace: true });
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'access'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Clinic Access
                </div>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('owned-competencies')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'owned-competencies'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Owned Competencies ({userCompetencies.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('owned-jcps')}
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'owned-jcps'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Owned JCPs ({userJcps.length})
                  </div>
                </button>
                {hasAccessAllCompetencies && (
                  <button
                    onClick={() => setActiveTab('oa-competency-dictionary')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'oa-competency-dictionary'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      OA Competency Dictionary
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Clinic Activities Tab - REMOVED (duplicates Edit Request Review page) */}
      
      {/* Competencies Tab - REMOVED */}
      {false && activeTab === 'competencies' && (
        <div>
          {/* Filters and Actions */}
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search competencies..."
                  value={competencySearch}
                  onChange={(e) => setCompetencySearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={competencyTypeFilter} onValueChange={setCompetencyTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={competencyFamilyFilter} onValueChange={setCompetencyFamilyFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  {availableFamilies.map((family, idx) => (
                    <SelectItem key={idx} value={family}>{family}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateCompetency} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Competency
            </Button>
          </div>
          
          {/* Competencies List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competenciesLoading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
            ) : filteredCompetencies.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No competencies found
              </div>
            ) : (
              filteredCompetencies.map(competency => (
                <Card key={competency.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{competency.name}</CardTitle>
                        {competency.code && (
                          <p className="text-xs text-gray-500 mt-1">Code: {competency.code}</p>
                        )}
                      </div>
                      <Badge variant={competency.isActive ? "default" : "secondary"}>
                        {competency.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Type:</span>
                        <Badge variant="outline">{competency.type}</Badge>
                      </div>
                      {competency.family && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Family:</span>
                          <span className="text-gray-700">{competency.family}</span>
                        </div>
                      )}
                      {competency.relatedDivision && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-700">{competency.relatedDivision}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/competencies/edit/${competency.id}`)}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCompetency(competency)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCompetency(competency)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* JCPs Tab - REMOVED */}
      {false && activeTab === 'jcps' && (
        <div>
          {/* Filters and Actions */}
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search JCPs by code or job..."
                value={jcpSearch}
                onChange={(e) => setJcpSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCreateJcp} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create JCP
            </Button>
          </div>
          
          {/* JCPs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jcpsLoading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
            ) : filteredJcps.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No JCPs found
              </div>
            ) : (
              filteredJcps.map((jcp, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">JCP: {jcp.jcpCode}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {jcp.jobCount} Job(s)
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {jcp.competencyCount} Competency(ies)
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Jobs:</p>
                      <div className="flex flex-wrap gap-1">
                        {jcp.jobs.slice(0, 3).map(job => (
                          <Badge key={job.id} variant="outline" className="text-xs">
                            {job.code}
                          </Badge>
                        ))}
                        {jcp.jobs.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{jcp.jobs.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditJcp(jcp)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJcp(jcp)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* OA Competency Dictionary Tab */}
      {!isAdmin && hasClinicAccess && hasAccessAllCompetencies && activeTab === 'oa-competency-dictionary' && (
        <div>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">OA Competency Dictionary</h1>
            <p className="text-gray-600">View all competencies in the organization's competency dictionary (Read-only)</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Competencies</p>
                    <p className="text-2xl font-semibold text-gray-900">{competenciesData?.competencies?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Filtered</p>
                    <p className="text-2xl font-semibold text-gray-900">{filteredOaDictionaryCompetencies.length}</p>
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
                    <p className="text-2xl font-semibold text-gray-900">
                      {[...new Set(competenciesData?.competencies?.map(c => c.family).filter(Boolean))].length || 0}
                    </p>
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
                    <p className="text-sm font-medium text-gray-500">Related Divisions</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {[...new Set(competenciesData?.competencies?.map(c => c.relatedDivision || c.related_division).filter(Boolean))].length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="oa-search">Search Competencies</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="oa-search"
                      placeholder="Search by name, definition, or code..."
                      value={oaDictionarySearch}
                      onChange={(e) => setOaDictionarySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="oa-type">Competency Type</Label>
                  <Select value={oaDictionaryTypeFilter} onValueChange={setOaDictionaryTypeFilter}>
                    <SelectTrigger id="oa-type" className="mt-1">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {oaDictionaryUniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="oa-family">Competency Family</Label>
                  <Select value={oaDictionaryFamilyFilter} onValueChange={setOaDictionaryFamilyFilter}>
                    <SelectTrigger id="oa-family" className="mt-1">
                      <SelectValue placeholder="All Families" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Families</SelectItem>
                      {oaDictionaryUniqueFamilies.map(family => (
                        <SelectItem key={family} value={family}>{family}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="oa-division">Related Division</Label>
                  <Select value={oaDictionaryDivisionFilter} onValueChange={setOaDictionaryDivisionFilter}>
                    <SelectTrigger id="oa-division" className="mt-1">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {oaDictionaryUniqueDivisions.map(division => (
                        <SelectItem key={division} value={division}>{division}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filter summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>
              Showing <span className="font-semibold text-gray-900">{filteredOaDictionaryCompetencies.length}</span> {filteredOaDictionaryCompetencies.length === 1 ? 'competency' : 'competencies'}
            </span>
          </div>

          {/* Competencies List */}
          {competenciesLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
              <p>Loading competencies...</p>
            </div>
          ) : filteredOaDictionaryCompetencies.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No competencies found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOaDictionaryCompetencies.map((competency) => {
                const totalElements = getTotalElementsCount(competency);
                return (
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
                                {competency.type?.replace(/_/g, ' ')}
                              </span>
                              {competency.family && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFamilyColor(competency.family)}`}>
                                  {competency.family}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{competency.definition || 'No definition available'}</p>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {competency.relatedDivision && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                                  Division: {competency.relatedDivision}
                                </span>
                              )}
                              {competency.code && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                                  Code: {competency.code}
                                </span>
                              )}
                              {Array.isArray(competency.relatedDocuments) && competency.relatedDocuments.length > 0 && (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                                  Related Docs: {competency.relatedDocuments.length}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span 
                                className="flex items-center cursor-pointer hover:text-blue-600"
                                onClick={() => setExpandedOaCompetency(expandedOaCompetency === competency.id ? null : competency.id)}
                              >
                                <Target className="h-3 w-3 mr-1" />
                                {competency.levels?.length || 0} Levels
                              </span>
                              <span className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                {competency.documents?.length || 0} Documents
                              </span>
                              <span 
                                className="flex items-center cursor-pointer hover:text-orange-600"
                                onClick={() => openOaElementsModal(competency)}
                                title="View Elements"
                              >
                                <List className="h-3 w-3 mr-1" />
                                {totalElements} Elements
                              </span>
                              <span className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {competency.assessmentCount || 0} Assessments
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => navigate(`/competencies/view/${competency.id}`)}
                            className="text-gray-400 hover:text-blue-600" 
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setExpandedOaCompetency(expandedOaCompetency === competency.id ? null : competency.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Expand"
                          >
                            {expandedOaCompetency === competency.id ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedOaCompetency === competency.id && (
                      <CardContent className="pt-0">
                        <div className="space-y-6">
                          {/* Competency Levels */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Competency Levels</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {competency.levels && competency.levels.length > 0 ? (
                                competency.levels.map((level) => {
                                  const levelElements = level.elements || [];
                                  return (
                                    <div key={level.id} className="border border-gray-200 rounded-lg p-4 flex flex-col h-full">
                                      <div className="flex items-center justify-center mb-2">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(level.level)}`}>
                                          {getLevelDisplayName(level.level)}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                                      {level.indicators && level.indicators.length > 0 && (
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

                                      <div className="mt-auto pt-3 border-t border-gray-100">
                                        <button
                                          type="button"
                                          onClick={() => openOaElementsModal(competency, level.id)}
                                          className="flex items-center justify-between w-full text-xs font-medium text-gray-700 hover:text-green-700 transition-colors"
                                        >
                                          <span className="flex items-center gap-1">
                                            <List className="h-3 w-3" />
                                            View Elements
                                          </span>
                                          <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            {levelElements.length}
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-gray-500 col-span-full">No levels defined for this competency.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OA Elements Modal */}
      {showOaElementsModal && selectedOaCompetencyForElements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <List className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Elements for {selectedOaCompetencyForElements.name}</h3>
                  <p className="text-sm text-gray-600">
                    {activeOaLevelId && oaLevelElements.find(l => l.id === activeOaLevelId)
                      ? `${getLevelDisplayName(oaLevelElements.find(l => l.id === activeOaLevelId).level)} Level • ${selectedOaCompetencyForElements.type} • ${selectedOaCompetencyForElements.family}`
                      : `${selectedOaCompetencyForElements.type} • ${selectedOaCompetencyForElements.family}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOaElementsModal(false);
                  setActiveOaLevelId(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {oaElementsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading elements...</p>
                  </div>
                </div>
              ) : (() => {
                const normalizedLevels = Array.isArray(oaLevelElements) ? oaLevelElements : [];
                const activeLevel = activeOaLevelId ? normalizedLevels.find(level => level.id === activeOaLevelId) : null;
                const displayLevels = activeLevel ? normalizedLevels.filter(level => level.id === activeOaLevelId) : normalizedLevels;
                const totalLevelElements = displayLevels.reduce((sum, level) => sum + (level.elements?.length || 0), 0);

                if (displayLevels.length === 0 || totalLevelElements === 0) {
                  return (
                    <div className="text-center py-12">
                      <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium mb-2">No Elements Found</p>
                      <p className="text-gray-500 text-sm">This competency doesn't have any elements yet.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="text-sm text-gray-600">
                        {activeLevel
                          ? `Showing ${totalLevelElements} element${totalLevelElements !== 1 ? 's' : ''} in ${getLevelDisplayName(activeLevel.level)} level.`
                          : `Showing ${totalLevelElements} element${totalLevelElements !== 1 ? 's' : ''} across ${displayLevels.length} level${displayLevels.length !== 1 ? 's' : ''}.`}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {displayLevels.map((level) => (
                        <div key={level.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(level.level)}`}>
                                {getLevelDisplayName(level.level)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{level.title}</span>
                            </div>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              {level.elements?.length || 0} element{(level.elements?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {level.elements?.length ? (
                            <ul className="space-y-2">
                              {level.elements.map((element) => {
                                const isExpanded = expandedOaElementsModal[element.id];
                                const indicators = element.performanceIndicators || [];
                                return (
                                  <li key={element.id} className="border border-gray-100 rounded-md p-2 bg-gray-50">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedOaElementsModal(prev => ({
                                              ...prev,
                                              [element.id]: !prev[element.id]
                                            }))
                                          }
                                          className="flex items-center gap-2 mb-1 text-left w-full"
                                        >
                                          <span className="text-gray-400">
                                            {isExpanded ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </span>
                                          <span className="font-medium text-gray-900 text-sm">
                                            {element.name}
                                          </span>
                                        </button>
                                      </div>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                          element.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {element.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>

                                    {isExpanded && (
                                      <div className="mt-2 pt-2 border-t border-gray-200 ml-5">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[11px] font-medium text-gray-700">
                                            Performance Indicators
                                          </span>
                                          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                            {indicators.length}
                                          </span>
                                        </div>
                                        {indicators.length > 0 ? (
                                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-700">
                                            {indicators.map((pi) => (
                                              <li key={pi.id || pi.action}>{pi.action || pi}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-[11px] text-gray-400 italic">
                                            No performance indicators defined for this element.
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-500 italic">No elements defined for this level yet.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Clinic Access Tab */}
      {activeTab === 'access' && (
        <div>
          {/* Filters and Actions */}
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={accessSearch}
                onChange={(e) => setAccessSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => {
              setEditingAccess(null);
              setAccessForm({
                userId: '',
                accessAllCompetencies: false,
                competencyPermissions: [],
                jcpPermissions: []
              });
              setSelectedCompetencyIds([]);
              setSelectedJcpCodes([]);
              setCompetencyFilterType('all');
              setCompetencyFilterFamily('all');
              setCompetencyFilterDivision('all');
              setCompetencySearchInModal('');
              setJcpSearchInModal('');
              setAccessUserSearch('');
              setAllSelectedView(true);
              setAllSelectedEdit(false);
              setAllSelectedJcpView(true);
              setAllSelectedJcpEdit(false);
              setShowAccessModal(true);
            }} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Access
            </Button>
          </div>
          
          {/* Access List */}
          <div className="grid grid-cols-1 gap-4">
            {clinicAccessList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No clinic access assigned yet</p>
                  <p className="text-sm text-gray-400">Click "Assign Access" to grant permissions to users</p>
                </CardContent>
              </Card>
            ) : (
              clinicAccessList
                .filter(access => {
                  if (!accessSearch) return true;
                  const employee = employeesData?.employees?.find(e => e.sid === access.userId);
                  if (!employee) return false;
                  const searchLower = accessSearch.toLowerCase();
                  return (
                    employee.sid?.toLowerCase().includes(searchLower) ||
                    employee.first_name?.toLowerCase().includes(searchLower) ||
                    employee.last_name?.toLowerCase().includes(searchLower) ||
                    employee.email?.toLowerCase().includes(searchLower)
                  );
                })
                .map((access) => {
                  const employee = employeesData?.employees?.find(e => e.sid === access.userId);
                  if (!employee) return null;
                  
                  return (
                    <Card key={access.userId} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-700 font-semibold">
                                {employee.first_name?.[0]}{employee.last_name?.[0]}
                              </span>
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {employee.first_name} {employee.last_name}
                              </CardTitle>
                              <p className="text-sm text-gray-500 mt-1">
                                {employee.sid} • {employee.email}
                              </p>
                              {employee.job_title && (
                                <p className="text-xs text-gray-400 mt-1">{employee.job_title}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAccess(access);
                                setAccessForm(access);
                                setSelectedCompetencyIds(access.competencyPermissions?.map(p => p.competencyId) || []);
                                setSelectedJcpCodes(access.jcpPermissions?.map(p => p.jcpCode) || []);
                                // Set default permissions based on existing ones
                                if (access.competencyPermissions && access.competencyPermissions.length > 0) {
                                  const firstPerm = access.competencyPermissions[0];
                                  setAllSelectedView(firstPerm.view || false);
                                  setAllSelectedEdit(firstPerm.edit || false);
                                } else {
                                  setAllSelectedView(true);
                                  setAllSelectedEdit(false);
                                }
                                if (access.jcpPermissions && access.jcpPermissions.length > 0) {
                                  const firstJcpPerm = access.jcpPermissions[0];
                                  setAllSelectedJcpView(firstJcpPerm.view || false);
                                  setAllSelectedJcpEdit(firstJcpPerm.edit || false);
                                } else {
                                  setAllSelectedJcpView(true);
                                  setAllSelectedJcpEdit(false);
                                }
                                setShowAccessModal(true);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Remove clinic access for ${employee.first_name} ${employee.last_name}?`)) {
                                  setClinicAccessList(prev => prev.filter(a => a.userId !== access.userId));
                                  toast({
                                    title: 'Success',
                                    description: 'Access removed successfully',
                                    variant: 'default'
                                  });
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Competencies Permissions */}
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Competencies ({access.competencyPermissions?.length || 0})
                            </h4>
                            {access.competencyPermissions && access.competencyPermissions.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {access.competencyPermissions.map((perm, idx) => {
                                  const comp = competenciesData?.competencies?.find(c => c.id === perm.competencyId);
                                  if (!comp) return null;
                                  return (
                                    <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                                      <div className="font-medium text-gray-700">{comp.name}</div>
                                      <div className="flex gap-3 mt-1 text-gray-600">
                                        {perm.view && <span className="text-green-600">View</span>}
                                      {perm.edit && <span className="text-purple-600">Edit</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">No competencies assigned</p>
                            )}
                          </div>
                          
                          {/* JCPs Permissions */}
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              JCPs ({access.jcpPermissions?.length || 0})
                            </h4>
                            {access.jcpPermissions && access.jcpPermissions.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {access.jcpPermissions.map((perm, idx) => (
                                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                                    <div className="font-medium text-gray-700">{perm.jcpCode}</div>
                                    <div className="flex gap-3 mt-1 text-gray-600">
                                      {perm.view && <span className="text-green-600">View</span>}
                                      {perm.edit && <span className="text-purple-600">Edit</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">No JCPs assigned</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </div>
      )}
      
      {/* User's Owned Competencies Tab */}
      {!isAdmin && hasClinicAccess && activeTab === 'owned-competencies' && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Your Assigned Competencies</p>
                <p>You can view and edit the competencies assigned to you. All edits will be recorded for admin review.</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCompetencies.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No competencies assigned to you
              </div>
            ) : (
              userCompetencies.map(comp => (
                <Card key={comp.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{comp.name}</CardTitle>
                        {comp.code && (
                          <p className="text-xs text-gray-500 mt-1">Code: {comp.code}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Type:</span>
                        <Badge variant="outline">{comp.type}</Badge>
                      </div>
                      {comp.family && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Family:</span>
                          <span className="text-gray-700">{comp.family}</span>
                        </div>
                      )}
                      {comp.definition && (
                        <p className="text-xs text-gray-600 line-clamp-2">{comp.definition}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/competencies/view/${comp.id}`)}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {comp.canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (isAdmin) {
                              // Admin can edit directly
                              setEditingCompetency(comp);
                              setCompetencyForm({
                                code: comp.code || '',
                                name: comp.name || '',
                                type: comp.type || 'TECHNICAL',
                                family: comp.family || '',
                                definition: comp.definition || '',
                                relatedDivision: comp.relatedDivision || '',
                                isActive: comp.isActive !== undefined ? comp.isActive : true
                              });
                              setShowCompetencyModal(true);
                            } else {
                              // Non-admin users go to edit page with review workflow
                              navigate(`/kafu-clinic/competency/edit/${comp.id}`);
                            }
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* User's Owned JCPs Tab */}
      {!isAdmin && hasClinicAccess && activeTab === 'owned-jcps' && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Your Assigned JCPs</p>
                <p>You can view and edit the Job Competency Profiles assigned to you. All edits will be recorded for admin review.</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userJcps.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No JCPs assigned to you
              </div>
            ) : (
              userJcps.map((jcp, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">JCP: {jcp.jcpCode}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {jcp.jobCount} Job(s)
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {jcp.competencyCount} Competency(ies)
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Jobs:</p>
                      <div className="flex flex-wrap gap-1">
                        {jcp.jobs.slice(0, 3).map(job => (
                          <Badge key={job.id} variant="outline" className="text-xs">
                            {job.code}
                          </Badge>
                        ))}
                        {jcp.jobs.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{jcp.jobs.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // View JCP details
                          const jobId = jcp.jobs[0]?.id;
                          if (jobId) {
                            navigate(`/jobs/view/${jobId}`);
                          }
                        }}
                        className="flex-1"
                        disabled={!jcp.canView}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {jcp.canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingJcp(jcp);
                            setJcpForm({
                              jcpCode: jcp.jcpCode,
                              jobIds: jcp.jobs.map(j => j.id),
                              competencies: jcp.competencies
                            });
                            setSelectedJcpJobs(jcp.jobs);
                            setShowJcpModal(true);
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Competency Modal */}
      {showCompetencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingCompetency ? 'Edit Competency' : 'Create Competency'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCompetencyModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {!isAdmin && editingCompetency && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your edits will be recorded and submitted for admin review. Changes will not be applied immediately.
                  </p>
                </div>
              )}
              
              <div>
                <Label>Competency Code</Label>
                <Input
                  value={competencyForm.code}
                  onChange={(e) => setCompetencyForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., TECH-STR-001"
                  disabled={!isAdmin && editingCompetency}
                  className={!isAdmin && editingCompetency ? 'bg-gray-100' : ''}
                />
                {!isAdmin && editingCompetency && (
                  <p className="text-xs text-gray-500 mt-1">Code cannot be changed</p>
                )}
              </div>
              <div>
                <Label>Competency Name *</Label>
                <Input
                  value={competencyForm.name}
                  onChange={(e) => setCompetencyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter competency name"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type *</Label>
                  <Select 
                    value={competencyForm.type} 
                    onValueChange={(value) => setCompetencyForm(prev => ({ ...prev, type: value }))}
                    disabled={!isAdmin && editingCompetency}
                  >
                    <SelectTrigger className={!isAdmin && editingCompetency ? 'bg-gray-100' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isAdmin && editingCompetency && (
                    <p className="text-xs text-gray-500 mt-1">Type cannot be changed</p>
                  )}
                </div>
                <div>
                  <Label>Family</Label>
                  <Select 
                    value={competencyForm.family} 
                    onValueChange={(value) => setCompetencyForm(prev => ({ ...prev, family: value }))}
                    disabled={!isAdmin && editingCompetency}
                  >
                    <SelectTrigger className={!isAdmin && editingCompetency ? 'bg-gray-100' : ''}>
                      <SelectValue placeholder="Select family" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFamilies.map((family, idx) => (
                        <SelectItem key={idx} value={family}>{family}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isAdmin && editingCompetency && (
                    <p className="text-xs text-gray-500 mt-1">Family cannot be changed</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Definition</Label>
                <textarea
                  value={competencyForm.definition}
                  onChange={(e) => setCompetencyForm(prev => ({ ...prev, definition: e.target.value }))}
                  placeholder="Enter competency definition"
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                />
              </div>
              <div>
                <Label>Related Division</Label>
                <Input
                  value={competencyForm.relatedDivision}
                  onChange={(e) => setCompetencyForm(prev => ({ ...prev, relatedDivision: e.target.value }))}
                  placeholder="Enter related division"
                  disabled={!isAdmin && editingCompetency}
                  className={!isAdmin && editingCompetency ? 'bg-gray-100' : ''}
                />
                {!isAdmin && editingCompetency && (
                  <p className="text-xs text-gray-500 mt-1">Related Division cannot be changed</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={competencyForm.isActive}
                    onChange={(e) => setCompetencyForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCompetencyModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCompetency} disabled={!competencyForm.name}>
                  <Save className="h-4 w-4 mr-2" />
                  {!isAdmin && editingCompetency ? 'Submit for Review' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* JCP Modal */}
      {showJcpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingJcp ? 'Edit JCP' : 'Create JCP'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowJcpModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              {!isAdmin && editingJcp && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your edits will be recorded and submitted for admin review. Changes will not be applied immediately.
                  </p>
                </div>
              )}
              
              <div>
                <Label>JCP Code *</Label>
                <Input
                  value={jcpForm.jcpCode}
                  onChange={(e) => setJcpForm(prev => ({ ...prev, jcpCode: e.target.value }))}
                  placeholder="Enter JCP code (e.g., JCP-001)"
                  required
                  disabled={!isAdmin && editingJcp}
                  className={!isAdmin && editingJcp ? 'bg-gray-100' : ''}
                />
                {!isAdmin && editingJcp && (
                  <p className="text-xs text-gray-500 mt-1">JCP Code cannot be changed</p>
                )}
              </div>
              
              {/* Jobs Selection */}
              <div>
                <Label>Select Jobs</Label>
                <div className="mt-2 mb-4">
                  <Input
                    placeholder="Search jobs..."
                    value={jcpJobSearch}
                    onChange={(e) => setJcpJobSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto p-2">
                    {filteredJobsForJcp.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No jobs found</p>
                    ) : (
                      filteredJobsForJcp.map(job => {
                        const isSelected = selectedJcpJobs.find(j => j.id === job.id);
                        return (
                          <div
                            key={job.id}
                            onClick={() => toggleJobSelection(job)}
                            className={`p-2 rounded cursor-pointer mb-1 flex items-center gap-2 ${
                              isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => {}}
                              className="rounded"
                            />
                            <span className="text-sm">{job.code} - {job.title}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedJcpJobs.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Selected ({selectedJcpJobs.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedJcpJobs.map(job => (
                          <Badge key={job.id} variant="outline" className="text-xs">
                            {job.code}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={() => toggleJobSelection(job)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Competencies Selection */}
              <div>
                <Label>Select Competencies</Label>
                <div className="mt-2 mb-4">
                  <Input
                    placeholder="Search competencies..."
                    value={jcpCompetencySearch}
                    onChange={(e) => setJcpCompetencySearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto p-2">
                    {filteredCompetenciesForJcp.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No competencies found</p>
                    ) : (
                      filteredCompetenciesForJcp.map(comp => {
                        const isSelected = jcpForm.competencies.includes(comp.id);
                        return (
                          <div
                            key={comp.id}
                            onClick={() => toggleCompetencySelection(comp)}
                            className={`p-2 rounded cursor-pointer mb-1 flex items-center gap-2 ${
                              isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded"
                            />
                            <span className="text-sm">{comp.code || comp.name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {jcpForm.competencies.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Selected ({jcpForm.competencies.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {jcpForm.competencies.map(compId => {
                          const comp = competenciesData.competencies.find(c => c.id === compId);
                          return comp ? (
                            <Badge key={compId} variant="outline" className="text-xs">
                              {comp.code || comp.name}
                              <X
                                className="h-3 w-3 ml-1 cursor-pointer"
                                onClick={() => toggleCompetencySelection(comp)}
                              />
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowJcpModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveJcp} disabled={!jcpForm.jcpCode || jcpForm.jobIds.length === 0 || jcpForm.competencies.length === 0}>
                  <Save className="h-4 w-4 mr-2" />
                  {!isAdmin && editingJcp ? 'Submit for Review' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Access Assignment Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingAccess ? 'Edit Clinic Access' : 'Assign Clinic Access'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAccessModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              {/* User Selection */}
              <div>
                <Label>Select User *</Label>
                <div className="mt-2">
                  <Input
                    placeholder="Search by name, SID, or email..."
                    value={accessUserSearch}
                    onChange={(e) => setAccessUserSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto p-2">
                    {(employeesData?.employees || [])
                      .filter(emp => {
                        if (!accessUserSearch) return true;
                        const searchLower = accessUserSearch.toLowerCase();
                        return (
                          emp.sid?.toLowerCase().includes(searchLower) ||
                          emp.first_name?.toLowerCase().includes(searchLower) ||
                          emp.last_name?.toLowerCase().includes(searchLower) ||
                          emp.email?.toLowerCase().includes(searchLower)
                        );
                      })
                      .slice(0, 50)
                      .map(employee => {
                        const isSelected = accessForm.userId === employee.sid;
                        const alreadyAssigned = clinicAccessList.some(a => a.userId === employee.sid && a.userId !== editingAccess?.userId);
                        return (
                          <div
                            key={employee.sid}
                            onClick={() => {
                              if (!alreadyAssigned) {
                                setAccessForm(prev => ({ ...prev, userId: employee.sid }));
                              }
                            }}
                            className={`p-2 rounded cursor-pointer mb-1 flex items-center gap-2 ${
                              isSelected ? 'bg-green-50 border border-green-200' : 
                              alreadyAssigned ? 'bg-gray-100 opacity-50 cursor-not-allowed' :
                              'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {}}
                              disabled={alreadyAssigned}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium">
                                {employee.first_name} {employee.last_name}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {employee.sid} • {employee.email}
                              </span>
                            </div>
                            {alreadyAssigned && (
                              <Badge variant="outline" className="text-xs">Already Assigned</Badge>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {accessForm.userId && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Selected:</p>
                      <Badge variant="outline" className="mt-1">
                        {employeesData?.employees?.find(e => e.sid === accessForm.userId)?.first_name}{' '}
                        {employeesData?.employees?.find(e => e.sid === accessForm.userId)?.last_name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Access All Competencies Checkbox */}
              {accessForm.userId && (
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="accessAllCompetencies"
                      checked={accessForm.accessAllCompetencies || false}
                      onChange={(e) => setAccessForm(prev => ({ ...prev, accessAllCompetencies: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="accessAllCompetencies" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Access All Competencies
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    When enabled, user will have read-only access to view all competencies in the OA Competency Dictionary tab
                  </p>
                </div>
              )}
              
              {/* Competencies Selection and Permissions */}
              {accessForm.userId && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Select Competencies and Set Permissions
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Select specific competencies to grant view/edit permissions. This is separate from "Access All Competencies" above.
                  </p>
                  
                  {/* Filters */}
                  <div className="mb-4 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search competencies..."
                        value={competencySearchInModal}
                        onChange={(e) => setCompetencySearchInModal(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={competencyFilterType} onValueChange={handleTypeChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {uniqueTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={competencyFilterFamily} onValueChange={handleFamilyChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Family" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Families</SelectItem>
                        {filteredFamiliesByType.map((family, idx) => (
                          <SelectItem key={idx} value={family}>{family}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={competencyFilterDivision} onValueChange={handleDivisionChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Related Division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Divisions</SelectItem>
                        {filteredDivisions.map(div => (
                          <SelectItem key={div} value={div}>{div}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Select All Checkbox and Permissions */}
                  {filteredCompetenciesForSelection.length > 0 && (
                    <div className="mb-2 p-3 bg-gray-50 rounded border border-gray-200 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={(e) => handleSelectAllCompetencies(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Select All ({filteredCompetenciesForSelection.length} competencies)
                        </span>
                      </label>
                      
                      {selectedCompetencyIds.length > 0 && (
                        <div className="ml-6 space-y-2">
                          <div className="text-xs font-semibold text-gray-600 mb-2">
                            Set Permissions for All Selected ({selectedCompetencyIds.length}):
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allSelectedView}
                                onChange={(e) => {
                                  setAllSelectedView(e.target.checked);
                                  // Apply immediately to all selected
                                  setAccessForm(prev => ({
                                    ...prev,
                                    competencyPermissions: prev.competencyPermissions.map(p => ({
                                      ...p,
                                      view: e.target.checked
                                    }))
                                  }));
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">View</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allSelectedEdit}
                                onChange={(e) => {
                                  setAllSelectedEdit(e.target.checked);
                                  // Apply immediately to all selected
                                  setAccessForm(prev => ({
                                    ...prev,
                                    competencyPermissions: prev.competencyPermissions.map(p => ({
                                      ...p,
                                      edit: e.target.checked
                                    }))
                                  }));
                                }}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700">Edit</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Filtered Competencies List */}
                  <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto p-3 space-y-2">
                    {filteredCompetenciesForSelection.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No competencies found</p>
                    ) : (
                      filteredCompetenciesForSelection.map(comp => {
                        const isSelected = selectedCompetencyIds.includes(comp.id);
                        const existingPerm = accessForm.competencyPermissions.find(p => p.competencyId === comp.id);
                        return (
                          <div
                            key={comp.id}
                            className={`p-3 rounded border ${
                              isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCompetencyIds([...selectedCompetencyIds, comp.id]);
                                    setAccessForm(prev => ({
                                      ...prev,
                                      competencyPermissions: [
                                        ...prev.competencyPermissions,
                                        { competencyId: comp.id, view: allSelectedView, edit: allSelectedEdit }
                                      ]
                                    }));
                                  } else {
                                    setSelectedCompetencyIds(selectedCompetencyIds.filter(id => id !== comp.id));
                                    setAccessForm(prev => ({
                                      ...prev,
                                      competencyPermissions: prev.competencyPermissions.filter(p => p.competencyId !== comp.id)
                                    }));
                                  }
                                }}
                                className="mt-1 rounded"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{comp.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {comp.code} • {comp.type} {comp.family && `• ${comp.family}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {selectedCompetencyIds.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>{selectedCompetencyIds.length}</strong> competency(ies) selected
                    </div>
                  )}
                </div>
              )}
              
              {/* JCPs Selection and Permissions */}
              {accessForm.userId && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600" />
                    Select JCPs and Set Permissions
                  </h3>
                  
                  {/* JCP Search and Permissions */}
                  <div className="mb-4 space-y-3">
                    <Input
                      placeholder="Search JCPs by code..."
                      value={jcpSearchInModal}
                      onChange={(e) => setJcpSearchInModal(e.target.value)}
                      className="mb-2"
                    />
                    
                    {selectedJcpCodes.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          Set Permissions for All Selected JCPs ({selectedJcpCodes.length}):
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelectedJcpView}
                              onChange={(e) => {
                                setAllSelectedJcpView(e.target.checked);
                                // Apply immediately to all selected
                                setAccessForm(prev => ({
                                  ...prev,
                                  jcpPermissions: prev.jcpPermissions.map(p => ({
                                    ...p,
                                    view: e.target.checked
                                  }))
                                }));
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">View</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelectedJcpEdit}
                              onChange={(e) => {
                                setAllSelectedJcpEdit(e.target.checked);
                                // Apply immediately to all selected
                                setAccessForm(prev => ({
                                  ...prev,
                                  jcpPermissions: prev.jcpPermissions.map(p => ({
                                    ...p,
                                    edit: e.target.checked
                                  }))
                                }));
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">Edit</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* JCPs List */}
                  <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto p-3 space-y-2">
                    {(() => {
                      const filtered = uniqueJcps.filter(jcp => 
                        !jcpSearchInModal || 
                        jcp.jcpCode.toLowerCase().includes(jcpSearchInModal.toLowerCase())
                      );
                      
                      return filtered.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No JCPs found</p>
                      ) : (
                        filtered.map((jcp, idx) => {
                          const isSelected = selectedJcpCodes.includes(jcp.jcpCode);
                          const existingPerm = accessForm.jcpPermissions.find(p => p.jcpCode === jcp.jcpCode);
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded border ${
                                isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedJcpCodes([...selectedJcpCodes, jcp.jcpCode]);
                                      setAccessForm(prev => ({
                                        ...prev,
                                        jcpPermissions: [
                                          ...prev.jcpPermissions,
                                          { jcpCode: jcp.jcpCode, view: allSelectedJcpView, edit: allSelectedJcpEdit }
                                        ]
                                      }));
                                    } else {
                                      setSelectedJcpCodes(selectedJcpCodes.filter(code => code !== jcp.jcpCode));
                                      setAccessForm(prev => ({
                                        ...prev,
                                        jcpPermissions: prev.jcpPermissions.filter(p => p.jcpCode !== jcp.jcpCode)
                                      }));
                                    }
                                  }}
                                  className="mt-1 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">JCP: {jcp.jcpCode}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {jcp.jobCount} Job(s) • {jcp.competencyCount} Competency(ies)
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      );
                    })()}
                  </div>
                  
                  {selectedJcpCodes.length > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>{selectedJcpCodes.length}</strong> JCP(s) selected
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAccessModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (!accessForm.userId) {
                      toast({
                        title: 'Error',
                        description: 'Please select a user',
                        variant: 'destructive'
                      });
                      return;
                    }
                    
                    // Validation: At least one permission must be granted (either accessAllCompetencies OR specific competencies/JCPs)
                    if (!accessForm.accessAllCompetencies && accessForm.competencyPermissions.length === 0 && accessForm.jcpPermissions.length === 0) {
                      toast({
                        title: 'Error',
                        description: 'Please enable "Access All Competencies" or select at least one competency or JCP',
                        variant: 'destructive'
                      });
                      return;
                    }
                    
                    if (editingAccess) {
                      setClinicAccessList(prev => prev.map(a => 
                        a.userId === editingAccess.userId ? accessForm : a
                      ));
                    } else {
                      setClinicAccessList(prev => [...prev, accessForm]);
                    }
                    
                    setShowAccessModal(false);
                    setEditingAccess(null);
                    setSelectedCompetencyIds([]);
                    setSelectedJcpCodes([]);
                    toast({
                      title: 'Success',
                      description: editingAccess ? 'Access updated successfully!' : 'Access assigned successfully!',
                      variant: 'default'
                    });
                  }}
                  disabled={!accessForm.userId || (!accessForm.accessAllCompetencies && accessForm.competencyPermissions.length === 0 && accessForm.jcpPermissions.length === 0)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KafuClinic;

