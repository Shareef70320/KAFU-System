import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/use-toast';
import { 
  Users, 
  Search, 
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Eye,
  Edit,
  BookOpen,
  CheckCircle,
  BarChart3,
  X,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Target,
  Clock,
  AlertCircle,
  Star,
  GraduationCap,
  Briefcase,
  Users2,
  BookOpenCheck,
  Zap,
  PlusCircle,
  Calendar as CalendarIcon,
  FileText,
  Lightbulb
} from 'lucide-react';
import EmployeePhoto from '../../components/EmployeePhoto';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const TeamEmployees = () => {
  const { currentSid } = useUser();
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [jcpData, setJcpData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showJCPModal, setShowJCPModal] = useState(false);
  const [showAssessmentsModal, setShowAssessmentsModal] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [managerLevels, setManagerLevels] = useState({}); // { [competencyId]: level }
  const [showAssessmentDetailModal, setShowAssessmentDetailModal] = useState(false);
  const [assessmentDetail, setAssessmentDetail] = useState(null);
  const [assessmentDetailLoading, setAssessmentDetailLoading] = useState(false);
  const [assessmentAttempts, setAssessmentAttempts] = useState([]); // attempts for selected competency
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [assessmentCounts, setAssessmentCounts] = useState({}); // { sid: number }
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'grid'
  const [showAddIdpModal, setShowAddIdpModal] = useState(false);
  const [idpForm, setIdpForm] = useState({ 
    employeeId: '', 
    competencyId: '', 
    notes: '', 
    interventionId: '',
    interventionTypeId: '',
    interventionCategoryId: '',
    customInterventionName: '',
    targetDate: '',
    priority: 'MEDIUM'
  });
  const [instances, setInstances] = useState([]);
  const [interventionTypes, setInterventionTypes] = useState([]);
  const [interventionCategories, setInterventionCategories] = useState([]);
  const [filteredTypes, setFilteredTypes] = useState([]);
  const [filteredInstances, setFilteredInstances] = useState([]);
  const [idps, setIdps] = useState([]);
  const [assessmentsTab, setAssessmentsTab] = useState('assessments'); // 'assessments' | 'idps'

  // Whether server already has a saved manager level for competency
  const preloaded = (competencyId) => {
    // This function will be evaluated against latest fetched assessments in the render section
    // Keep as fallback; do not block saving based on local selection state
    return false;
  };

  // Fetch assessment counts per employee (lightweight using history length)
  const fetchAssessmentCounts = async (list) => {
    try {
      const sids = Array.from(new Set(list.map(e => e.sid).filter(Boolean)));
      const results = await Promise.allSettled(
        sids.map(sid => api.get(`/user-assessments/history/${sid}`))
      );
      const map = {};
      results.forEach((r, idx) => {
        const sid = sids[idx];
        if (r.status === 'fulfilled') {
          map[sid] = (r.value.data?.assessments || []).length;
        } else {
          map[sid] = 0;
        }
      });
      setAssessmentCounts(prev => ({ ...prev, ...map }));
    } catch (_) {
      // ignore errors; leave counts as 0
    }
  };

  // Use dynamic SID from context
  const managerSid = currentSid;

  useEffect(() => {
    fetchTeamEmployees();
    fetchJCPData();
  }, []);

  useEffect(() => {
    if (employees && employees.length) {
      fetchAssessmentCounts(employees);
    }
  }, [employees]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedDivision]);

  // Build hierarchical tree structure
  const buildTree = (employees) => {
    const employeeMap = new Map();
    const rootNodes = [];

    // Create a map of all employees
    employees.forEach(emp => {
      employeeMap.set(emp.sid, { ...emp, children: [] });
    });

    // Build the tree structure
    employees.forEach(emp => {
      const employee = employeeMap.get(emp.sid);
      if (emp.line_manager_sid === managerSid) {
        // Direct reports
        rootNodes.push(employee);
      } else if (employeeMap.has(emp.line_manager_sid)) {
        // Indirect reports
        employeeMap.get(emp.line_manager_sid).children.push(employee);
      }
    });

    return rootNodes;
  };

  // Toggle node expansion
  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Expand all nodes
  const expandAll = () => {
    const allNodeIds = new Set();
    const addNodeIds = (nodes) => {
      nodes.forEach(node => {
        allNodeIds.add(node.sid);
        if (node.children.length > 0) {
          addNodeIds(node.children);
        }
      });
    };
    addNodeIds(buildTree(filteredEmployees));
    setExpandedNodes(allNodeIds);
  };

  // Collapse all nodes
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const fetchTeamEmployees = async () => {
    try {
      setLoading(true);
      
      // Get hierarchical team members (direct and indirect reports)
      const hierarchyResponse = await api.get(`/employees/hierarchy/${managerSid}`);
      const hierarchyMembers = hierarchyResponse.data.hierarchyMembers;
      
      setEmployees(hierarchyMembers);
    } catch (error) {
      console.error('Error fetching team employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJCPData = async () => {
    try {
      const response = await api.get('/job-competencies');
      const jcps = response.data.mappings || response.data;
      setJcpData(jcps);
    } catch (error) {
      console.error('Error fetching JCP data:', error);
    }
  };

  // Helper function to check if employee has JCP
  const hasJCP = (employee) => {
    if (!employee.job_code || !jcpData.length) return false;
    return jcpData.some(jcp => jcp.job && jcp.job.code === employee.job_code);
  };

  // Get JCP details for a specific employee
  const getEmployeeJCP = (employee) => {
    if (!employee.job_code || !jcpData.length) return [];
    return jcpData.filter(jcp => jcp.job && jcp.job.code === employee.job_code);
  };

  // Handle JCP icon click
  const handleJCPClick = (employee) => {
    setSelectedEmployee(employee);
    setShowJCPModal(true);
  };

  const handleAssessmentsClick = async (employee) => {
    setSelectedEmployee(employee);
    setAssessments([]);
    setManagerLevels({});
    setShowAssessmentsModal(true);
    try {
      setAssessmentsLoading(true);
      const resp = await api.get(`/user-assessments/history/${employee.sid}`);
      const list = resp.data.assessments || [];
      setAssessments(list);
      // Preload existing manager levels per competency
      const pre = list.reduce((acc, a) => {
        if (a.managerSelectedLevel && !acc[a.competencyId]) acc[a.competencyId] = a.managerSelectedLevel;
        return acc;
      }, {});
      setManagerLevels(pre);
      // Load existing IDPs for this employee
      try {
        const idpResp = await api.get(`/idp/${employee.sid}`);
        setIdps(idpResp.data.idps || []);
      } catch (_) {
        setIdps([]);
      }
    } catch (e) {
      console.error('Failed to load assessments:', e);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const loadInterventionInstances = async () => {
    try {
      const resp = await api.get('/ld-interventions/instances?status=PLANNED');
      setInstances(resp.data.instances || []);
    } catch (e) {
      setInstances([]);
    }
  };

  const loadInterventionTypes = async () => {
    try {
      const resp = await api.get('/ld-interventions/types?is_active=true');
      setInterventionTypes(resp.data.types || []);
    } catch (e) {
      setInterventionTypes([]);
    }
  };

  const loadInterventionCategories = async () => {
    try {
      const resp = await api.get('/ld-interventions/categories');
      setInterventionCategories(resp.data.categories || []);
    } catch (e) {
      setInterventionCategories([]);
    }
  };

  // Filter types based on selected category
  const handleCategoryChange = (categoryId) => {
    setIdpForm(prev => ({ 
      ...prev, 
      interventionCategoryId: categoryId,
      interventionTypeId: '', // Reset type selection
      interventionId: '' // Reset instance selection
    }));
    
    if (categoryId) {
      const filtered = interventionTypes.filter(type => type.category_id === categoryId);
      setFilteredTypes(filtered);
    } else {
      setFilteredTypes([]);
    }
    setFilteredInstances([]);
  };

  // Filter instances based on selected type
  const handleTypeChange = (typeId) => {
    setIdpForm(prev => ({ 
      ...prev, 
      interventionTypeId: typeId,
      interventionId: '' // Reset instance selection
    }));
    
    if (typeId) {
      const filtered = instances.filter(instance => instance.intervention_type_id === typeId);
      setFilteredInstances(filtered);
    } else {
      setFilteredInstances([]);
    }
  };

  const openAddIdp = async (employee, competencyId) => {
    setIdpForm({ 
      employeeId: employee.sid, 
      competencyId, 
      notes: '', 
      interventionId: '',
      interventionTypeId: '',
      interventionCategoryId: '',
      customInterventionName: '',
      targetDate: '',
      priority: 'MEDIUM'
    });
    await Promise.all([
      loadInterventionInstances(), 
      loadInterventionTypes(), 
      loadInterventionCategories()
    ]);
    setShowAddIdpModal(true);
  };

  const saveIdp = async () => {
    try {
      await api.post('/idp', {
        employeeId: idpForm.employeeId,
        competencyId: idpForm.competencyId,
        interventionId: idpForm.interventionId || null,
        interventionTypeId: idpForm.interventionTypeId || null,
        customInterventionName: idpForm.customInterventionName || null,
        notes: idpForm.notes || '',
        targetDate: idpForm.targetDate || null,
        priority: idpForm.priority || 'MEDIUM'
      });
      toast({ title: 'IDP Created', description: 'Development plan saved and linked to intervention.' });
      setShowAddIdpModal(false);
      // Refresh IDPs list
      try {
        const idpResp = await api.get(`/idp/${idpForm.employeeId}`);
        setIdps(idpResp.data.idps || []);
      } catch (_) {
        setIdps([]);
      }
    } catch (e) {
      toast({ title: 'Error', description: e?.response?.data?.error || 'Failed to create IDP', variant: 'destructive' });
    }
  };

  const saveManagerLevelByCompetency = async (userId, competencyId) => {
    const level = managerLevels[competencyId];
    if (!level) return;
    try {
      await api.post('/user-assessments/manager/confirm-level-by-competency', {
        userId: userId,
        competencyId,
        managerSelectedLevel: level
      });
      
      // Show success feedback
      toast({
        title: "Manager Level Saved",
        description: `Level ${level} saved for this competency`,
      });
      
      // Refresh assessments to show updated manager level
      const resp = await api.get(`/user-assessments/history/${selectedEmployee.sid}`);
      setAssessments(resp.data.assessments || []);
      
      // Re-initialize managerLevels from the updated data
      const updatedManagerLevels = resp.data.assessments.reduce((acc, a) => {
        if (a.managerSelectedLevel && !acc[a.competencyId]) {
          acc[a.competencyId] = a.managerSelectedLevel;
        }
        return acc;
      }, {});
      setManagerLevels(updatedManagerLevels);
    } catch (e) {
      console.error('Failed to save manager level:', e);
      toast({
        title: "Error",
        description: "Failed to save manager level",
        variant: "destructive",
      });
    }
  };

  const handleViewAssessmentDetails = async (sessionId, attempts = null) => {
    try {
      if (attempts && Array.isArray(attempts)) {
        setAssessmentAttempts(attempts);
      }
      setSelectedAttemptId(sessionId);
      setAssessmentDetail(null);
      setAssessmentDetailLoading(true);
      setShowAssessmentDetailModal(true);
      const resp = await api.get(`/user-assessments/session/${sessionId}`);
      setAssessmentDetail(resp.data.assessment || null);
    } catch (e) {
      console.error('Failed to load assessment details:', e);
    } finally {
      setAssessmentDetailLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.sid.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDivision) {
      filtered = filtered.filter(emp => emp.division === selectedDivision);
    }

    setFilteredEmployees(filtered);
  };

  const getUniqueDivisions = () => {
    return [...new Set(employees.map(emp => emp.division).filter(Boolean))];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Tree Node Component
  const TreeNode = ({ node, level = 0, isLast = false, parentConnectors = [] }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.sid);
    const connectors = [...parentConnectors, !isLast];

    return (
      <div className="relative">
        {/* Employee Card */}
        <div className={`relative ${level > 0 ? 'ml-8' : ''}`}>
          {/* Tree Connectors */}
          {level > 0 && (
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col">
              {connectors.map((showLine, index) => (
                <div key={index} className="flex-1 flex items-center">
                  {showLine && (
                    <div className="w-4 h-px bg-gray-300"></div>
                  )}
                </div>
              ))}
              <div className="flex items-center">
                <div className="w-4 h-px bg-gray-300"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full -ml-1"></div>
              </div>
            </div>
          )}

          <Card className={`hover:shadow-lg transition-shadow ${level > 0 ? 'ml-4' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {/* Expand/Collapse Button */}
                <div className="flex-shrink-0">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleNode(node.sid)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Minus className="h-3 w-3 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Employee Photo */}
                <div className="flex-shrink-0">
                  <EmployeePhoto
                    sid={node.sid}
                    firstName={node.first_name}
                    lastName={node.last_name}
                    size="medium"
                  />
                </div>

                {/* Employee Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {node.first_name} {node.last_name}
                      </h3>
                      {level > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Level {level + 1}
                        </span>
                      )}
                      {hasChildren && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {node.children.length} reports
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {node.job_title || 'No Job Title'}
                  </p>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-mono">{node.sid}</span>
                      {hasJCP(node) && (
                        <button
                          onClick={() => handleJCPClick(node)}
                          className="ml-2 flex items-center hover:bg-green-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          title="Click to view JCP details"
                        >
                          <BookOpen className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-xs text-green-600 font-medium">JCP</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleAssessmentsClick(node)}
                        className={`ml-2 flex items-center px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          (assessmentCounts[node.sid] || 0) > 0
                            ? 'hover:bg-blue-50'
                            : 'opacity-60 cursor-not-allowed bg-gray-50'
                        }`}
                        title="View Assessments"
                        disabled={(assessmentCounts[node.sid] || 0) === 0}
                      >
                        <BarChart3 className={`h-4 w-4 mr-1 ${
                          (assessmentCounts[node.sid] || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <span className={`text-xs font-medium ${
                          (assessmentCounts[node.sid] || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
                        }`}>Assessments</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{node.email}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{node.location || 'No Location'}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      node.employment_status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {node.employment_status}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {node.children.map((child, index) => (
              <TreeNode
                key={child.sid}
                node={child}
                level={level + 1}
                isLast={index === node.children.length - 1}
                parentConnectors={connectors}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Team</h1>
          <p className="text-gray-600 mt-1">
            Manage your direct reports and team members
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Team Members</p>
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
        </div>
      </div>

      {/* JCP Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">With JCP</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(emp => hasJCP(emp)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Without JCP</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.filter(emp => !hasJCP(emp)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">JCP Coverage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employees.length > 0 
                    ? Math.round((employees.filter(emp => hasJCP(emp)).length / employees.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Divisions</option>
                {getUniqueDivisions().map(division => (
                  <option key={division} value={division}>{division}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* View Mode and Tree Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View Mode:</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    viewMode === 'tree'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Tree View
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid View
                </button>
              </div>
            </div>
            
            {viewMode === 'tree' && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  <Plus className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  <Minus className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Members Display */}
      {viewMode === 'tree' ? (
        /* Tree View */
        <div className="space-y-4">
          {buildTree(filteredEmployees).map((node, index) => (
            <TreeNode
              key={node.sid}
              node={node}
              level={0}
              isLast={index === buildTree(filteredEmployees).length - 1}
              parentConnectors={[]}
            />
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <Card key={employee.sid} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <EmployeePhoto
                      sid={employee.sid}
                      firstName={employee.first_name}
                      lastName={employee.last_name}
                      size="large"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {employee.job_title || 'No Job Title'}
                    </p>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-mono">{employee.sid}</span>
                        {employee.level && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Level {employee.level}
                          </span>
                        )}
                        {hasJCP(employee) && (
                          <button
                            onClick={() => handleJCPClick(employee)}
                            className="ml-2 flex items-center hover:bg-green-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                            title="Click to view JCP details"
                          >
                            <BookOpen className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-xs text-green-600 font-medium">JCP</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleAssessmentsClick(employee)}
                          className={`ml-2 flex items-center px-2 py-1 rounded-md transition-colors cursor-pointer ${
                            (assessmentCounts[employee.sid] || 0) > 0
                              ? 'hover:bg-blue-50'
                              : 'opacity-60 cursor-not-allowed bg-gray-50'
                          }`}
                          title="View Assessments"
                          disabled={(assessmentCounts[employee.sid] || 0) === 0}
                        >
                          <BarChart3 className={`h-4 w-4 mr-1 ${
                            (assessmentCounts[employee.sid] || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <span className={`text-xs font-medium ${
                            (assessmentCounts[employee.sid] || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
                          }`}>Assessments</span>
                        </button>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      
                      {employee.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{employee.location || 'No Location'}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Joined {formatDate(employee.created_at)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.employment_status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.employment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedDivision 
                ? 'Try adjusting your search criteria' 
                : 'You don\'t have any direct reports yet'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* JCP Details Modal */}
      {showJCPModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                JCP Details - {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h3>
              <button
                onClick={() => setShowJCPModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Job Information</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{selectedEmployee.job_title}</p>
                  <p className="text-sm text-gray-600">Job Code: {selectedEmployee.job_code}</p>
                  <p className="text-sm text-gray-600">Division: {selectedEmployee.division}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Required Competencies</h4>
                <div className="space-y-3">
                  {getEmployeeJCP(selectedEmployee).map((jcp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{jcp.competency.name}</h5>
                          <p className="text-sm text-gray-600 mt-1">{jcp.competency.definition}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {jcp.competency.type}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {jcp.competency.family}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              Level: {jcp.requiredLevel}
                            </span>
                            {jcp.isRequired && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessments Modal */}
      {showAssessmentsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-black" style={{ color: '#000' }}>
                {(() => {
                  const employeeName = `${selectedEmployee.first_name} ${selectedEmployee.last_name}`;
                  const manager = employees.find(e => e.sid === selectedEmployee.line_manager_sid);
                  const managerLabel = manager
                    ? `${manager.first_name} ${manager.last_name}`
                    : (selectedEmployee.line_manager_sid || '—');
                  return `Assessments - ${employeeName} (Manager: ${managerLabel}, Employee: ${selectedEmployee.sid})`;
                })()}
              </h3>
              <button
                onClick={() => setShowAssessmentsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setAssessmentsTab('assessments')}
                  className={`px-4 py-2 text-sm ${assessmentsTab==='assessments' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >Assessments</button>
                <button
                  onClick={() => setAssessmentsTab('idps')}
                  className={`px-4 py-2 text-sm ${assessmentsTab==='idps' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >IDPs</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {assessmentsTab === 'idps' ? (
                <div>
                  {(!idps || idps.length === 0) ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-lg font-medium mb-2">No IDPs Created Yet</div>
                      <div className="text-sm text-gray-400">Individual Development Plans will appear here when created for competency gaps.</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {idps.map((idp) => (
                        <div key={idp.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">{idp.competency_name || 'Competency'}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  idp.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                  idp.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  idp.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {idp.priority || 'MEDIUM'} Priority
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  idp.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  idp.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  idp.status === 'PLANNED' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {idp.status || 'PLANNED'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-gray-500">Required Level</div>
                                  <div className="font-medium">{idp.required_level || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Current Level</div>
                                  <div className="font-medium">{idp.employee_level || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Manager Level</div>
                                  <div className="font-medium">{idp.manager_level || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Target Date</div>
                                  <div className="font-medium">
                                    {idp.target_date ? new Date(idp.target_date).toLocaleDateString() : '—'}
                                  </div>
                                </div>
                              </div>

                              {idp.intervention_title && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                  <div className="text-sm font-medium text-blue-900">Linked Intervention</div>
                                  <div className="text-sm text-blue-700">{idp.intervention_title}</div>
                                  {idp.intervention_type_name && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {idp.intervention_type_name} • {idp.intervention_category_name}
                                    </div>
                                  )}
                                </div>
                              )}

                              {idp.intervention_type_name && !idp.intervention_title && (
                                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                  <div className="text-sm font-medium text-green-900">Intervention Type</div>
                                  <div className="text-sm text-green-700">{idp.intervention_type_name}</div>
                                  <div className="text-xs text-green-600 mt-1">{idp.intervention_category_name}</div>
                                </div>
                              )}

                              {idp.notes && (
                                <div className="mt-3">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Action Plan</div>
                                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{idp.notes}</div>
                                </div>
                              )}

                              <div className="mt-3 text-xs text-gray-500">
                                Created: {idp.created_at ? new Date(idp.created_at).toLocaleDateString() : '—'}
                                {idp.updated_at && idp.updated_at !== idp.created_at && (
                                  <span> • Updated: {new Date(idp.updated_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
              assessmentsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : assessments.length === 0 ? (
                <div className="text-center text-gray-500">No assessments found.</div>
              ) : (
                (() => {
                  const groups = assessments.reduce((acc, a) => {
                    const key = a.competencyId || a.competencyName || 'Unknown';
                    if (!acc[key]) acc[key] = { name: a.competencyName || key, items: [] };
                    acc[key].items.push(a);
                    return acc;
                  }, {});
                  const groupEntries = Object.entries(groups);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {groupEntries.map(([compId, group]) => {
                        // Determine latest attempt per competency
                        const itemsSorted = [...group.items].sort((a, b) => {
                          const ad = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                          const bd = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                          return bd - ad;
                        });
                        const latest = itemsSorted[0];
                        return (
                          <div
                            key={compId}
                            onClick={() => latest && handleViewAssessmentDetails(latest.sessionId, itemsSorted)}
                            className="cursor-pointer rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-base font-semibold text-gray-900">{group.name}</div>
                                {latest && (
                                  <>
                                    <div className="text-sm text-gray-700 mt-1">Latest Score: {latest.percentageScore}% ({latest.correctAnswers}/{latest.totalQuestions})</div>
                                    <div className="text-xs text-gray-500 mt-1">Completed: {latest.completedAt ? new Date(latest.completedAt).toLocaleString() : '—'}</div>
                                    {(latest.systemLevel || latest.userConfirmedLevel || latest.managerSelectedLevel) && (
                                      <div className="text-xs text-gray-700 mt-2">
                                        <span className="mr-2">System: {latest.systemLevel || '—'}</span>
                                        <span className="mr-2">User: {latest.userConfirmedLevel || '—'}</span>
                                        <span>Manager: {latest.managerSelectedLevel || '—'}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                                <div className="text-xs text-gray-500 mt-2">Attempts: {group.items.length}</div>
                              </div>
                              {/* Manager level controls (stop click bubbling) */}
                              <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={managerLevels[compId] || latest.managerSelectedLevel || ''}
                                  onChange={(e) => setManagerLevels(prev => ({ ...prev, [compId]: e.target.value }))}
                                  disabled={Boolean(latest.managerSelectedLevel)}
                                  className={`border rounded-md px-2 py-1 text-sm transition-all duration-200 ${
                                    latest.managerSelectedLevel ? 'bg-green-50 text-green-800 border-green-400 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
                                  }`}
                                >
                                  <option value="">Set Manager Level</option>
                                  <option value="BASIC">BASIC</option>
                                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                                  <option value="ADVANCED">ADVANCED</option>
                                  <option value="MASTERY">MASTERY</option>
                                </select>
                                <Button 
                                  size="sm" 
                                  onClick={() => saveManagerLevelByCompetency(selectedEmployee.sid, compId)} 
                                  disabled={Boolean(latest.managerSelectedLevel) || !managerLevels[compId]}
                                  className={`transition-all duration-200 ${
                                    latest.managerSelectedLevel
                                      ? 'bg-gray-300 text-gray-500'
                                      : (managerLevels[compId] ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500')
                                  }`}
                                >
                                  {latest.managerSelectedLevel ? 'Saved' : 'Save'}
                                </Button>
                                {/* Add IDP when gap exists: user/system below required level */}
                                {(() => {
                                  const jcp = getEmployeeJCP(selectedEmployee).find(j => (j.competency && j.competency.id === compId) || j.competencyId === compId);
                                  const required = jcp?.requiredLevel;
                                  const toRank = (l)=>({BASIC:0,INTERMEDIATE:1,ADVANCED:2,MASTERY:3}[String(l||'').toUpperCase()] ?? -1);
                                  const eff = latest.managerSelectedLevel || latest.userConfirmedLevel || latest.systemLevel;
                                  const showGap = required && toRank(eff) > -1 && toRank(eff) < toRank(required);
                                  return showGap ? (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => openAddIdp(selectedEmployee, compId)}
                                      className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100 hover:border-green-300"
                                    >
                                      <Target className="h-3 w-3 mr-1" />
                                      Add IDP
                                    </Button>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ))
            }
            </div>
          </div>
        </div>
      )}

      {/* Add IDP Modal */}
      {showAddIdpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Create Individual Development Plan</h3>
              </div>
              <button onClick={() => setShowAddIdpModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Competency Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  <div className="text-sm font-medium text-blue-900">Target Competency</div>
                </div>
                <div className="text-lg font-semibold text-blue-800">
                  {(() => {
                    const jcp = getEmployeeJCP(selectedEmployee).find(j => 
                      (j.competency && j.competency.id === idpForm.competencyId) || j.competencyId === idpForm.competencyId
                    );
                    return jcp?.competency?.name || 'Selected Competency';
                  })()}
                </div>
              </div>

              {/* Intervention Selection - Cascading Dropdowns */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  <div className="text-sm font-medium text-gray-700">Learning Intervention</div>
                </div>
                <div className="space-y-4">
                  {/* Step 1: Select Category */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">1</span>
                      </div>
                      <div className="text-sm font-medium text-gray-700">Select Intervention Category</div>
                    </div>
                    <select
                      value={idpForm.interventionCategoryId}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Choose a category --</option>
                      {interventionCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name} - {category.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Select Type (filtered by category) */}
                  {idpForm.interventionCategoryId && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-green-600">2</span>
                        </div>
                        <div className="text-sm font-medium text-gray-700">Select Intervention Type</div>
                      </div>
                      <select
                        value={idpForm.interventionTypeId}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">-- Choose a type --</option>
                        {filteredTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name} • {type.delivery_mode || 'Various'} • {type.duration_range || 'Flexible'}
                          </option>
                        ))}
                      </select>
                      {filteredTypes.length === 0 && (
                        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          No types available in this category
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Select Specific Instance (filtered by type) */}
                  {idpForm.interventionTypeId && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-600">3</span>
                        </div>
                        <div className="text-sm font-medium text-gray-700">Select Specific Intervention (Optional)</div>
                      </div>
                      <select
                        value={idpForm.interventionId}
                        onChange={(e)=>setIdpForm(prev=>({ ...prev, interventionId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">-- Choose specific intervention --</option>
                        {filteredInstances.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.title} • {inst.start_date ? new Date(inst.start_date).toLocaleDateString() : 'TBD'}
                            {inst.location && ` • ${inst.location}`}
                          </option>
                        ))}
                      </select>
                      {filteredInstances.length === 0 && (
                        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          No specific interventions scheduled for this type. You can still create a general IDP.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Intervention Name (when no specific instance) */}
                  {idpForm.interventionTypeId && filteredInstances.length === 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <PlusCircle className="h-5 w-5 text-yellow-600" />
                        <div className="text-sm font-medium text-yellow-800">Custom Intervention Name</div>
                      </div>
                      <input
                        type="text"
                        value={idpForm.customInterventionName}
                        onChange={(e)=>setIdpForm(prev=>({ ...prev, customInterventionName: e.target.value }))}
                        className="w-full border border-yellow-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="e.g., 'Leadership Coaching with John Smith', 'Project Management Training'"
                      />
                      <div className="text-xs text-yellow-700 mt-1">
                        Give this intervention a specific name for tracking purposes
                      </div>
                    </div>
                  )}

                  {/* Show selected intervention info */}
                  {(idpForm.interventionId || idpForm.interventionTypeId) && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="text-sm font-medium text-green-900">Selected Intervention</div>
                      </div>
                      <div className="text-sm text-green-700">
                        {idpForm.interventionId ? (
                          <>
                            <div className="font-medium">{instances.find(i => i.id === idpForm.interventionId)?.title}</div>
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              Specific scheduled intervention
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">
                              {idpForm.customInterventionName || interventionTypes.find(t => t.id === idpForm.interventionTypeId)?.name}
                            </div>
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              {idpForm.customInterventionName ? 'Custom intervention' : 'General intervention type - manager can arrange specific details'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Date */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-5 w-5 text-orange-600" />
                  <div className="text-sm font-medium text-gray-700">Target Completion Date</div>
                </div>
                <input
                  type="date"
                  value={idpForm.targetDate}
                  onChange={(e)=>setIdpForm(prev=>({ ...prev, targetDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Priority */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div className="text-sm font-medium text-gray-700">Priority Level</div>
                </div>
                <select
                  value={idpForm.priority}
                  onChange={(e)=>setIdpForm(prev=>({ ...prev, priority: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="LOW">🟢 Low Priority</option>
                  <option value="MEDIUM">🟡 Medium Priority</option>
                  <option value="HIGH">🟠 High Priority</option>
                  <option value="CRITICAL">🔴 Critical Priority</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <div className="text-sm font-medium text-gray-700">Action Plan & Notes</div>
                </div>
                <textarea
                  value={idpForm.notes}
                  onChange={(e)=>setIdpForm(prev=>({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the development plan, learning objectives, and expectations..."
                />
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-gray-600" />
                  <div className="text-sm font-medium text-gray-700">IDP Summary</div>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  {idpForm.interventionId ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Linked to specific intervention</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">
                        {instances.find(i => i.id === idpForm.interventionId)?.title}
                      </div>
                    </>
                  ) : idpForm.interventionTypeId ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Linked to intervention type</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">
                        {idpForm.customInterventionName || interventionTypes.find(t => t.id === idpForm.interventionTypeId)?.name}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                      <span>General development plan (no specific intervention selected)</span>
                    </div>
                  )}
                  {idpForm.targetDate && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
                      <span>Target: {new Date(idpForm.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Priority: {idpForm.priority}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={()=>setShowAddIdpModal(false)}>
                Cancel
              </Button>
              <Button onClick={saveIdp} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create IDP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Detail Modal */}
      {showAssessmentDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Assessment Details</h3>
              <button
                onClick={() => setShowAssessmentDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {/* Attempt selector */}
              {assessmentAttempts && assessmentAttempts.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">Attempts</div>
                  <div className="flex flex-wrap gap-2">
                    {assessmentAttempts
                      .slice()
                      .sort((a,b)=>{
                        const ad=a.completedAt?new Date(a.completedAt).getTime():0;
                        const bd=b.completedAt?new Date(b.completedAt).getTime():0;
                        return bd-ad;
                      })
                      .map((att, idx) => (
                        <button
                          key={att.sessionId}
                          onClick={() => handleViewAssessmentDetails(att.sessionId, assessmentAttempts)}
                          className={`px-3 py-1.5 rounded-md border text-xs transition-all ${
                            att.sessionId === selectedAttemptId
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-gray-300 hover:border-gray-400 text-gray-700'
                          }`}
                        >
                          {`#${idx+1} • ${att.percentageScore}% • ${att.completedAt ? new Date(att.completedAt).toLocaleDateString() : '—'}`}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {assessmentDetailLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : !assessmentDetail ? (
                <div className="text-center text-gray-500">Failed to load assessment details.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{assessmentDetail.competencyName}</div>
                    <div className="text-gray-600 text-sm mt-1">
                      Score: {assessmentDetail.percentageScore}% ({assessmentDetail.correctAnswers}/{assessmentDetail.totalQuestions})
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Started: {assessmentDetail.startedAt ? new Date(assessmentDetail.startedAt).toLocaleString() : '—'} | Completed: {assessmentDetail.completedAt ? new Date(assessmentDetail.completedAt).toLocaleString() : '—'}
                    </div>
                    {(assessmentDetail.systemLevel || assessmentDetail.userConfirmedLevel) && (
                      <div className="mt-2 text-sm text-gray-700">
                        System Level: {assessmentDetail.systemLevel || '—'} | User Level: {assessmentDetail.userConfirmedLevel || '—'}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="font-medium text-gray-900 mb-2">Question Details</div>
                    <div className="space-y-3">
                      {assessmentDetail.details.map((d, idx) => (
                        <div key={idx} className={`rounded-md border p-3 ${d.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900">Q{idx + 1}. {d.questionText}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${d.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {d.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mt-1">
                            {d.selectedOptionText ? (
                              <>
                                <div>Selected: {d.selectedOptionText}</div>
                                {d.correctOptionText && d.selectedOptionText !== d.correctOptionText && (
                                  <div>Correct: {d.correctOptionText}</div>
                                )}
                              </>
                            ) : d.answerText ? (
                              <div>Answer: {d.answerText}</div>
                            ) : (
                              <div>Answer: —</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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

export default TeamEmployees;
