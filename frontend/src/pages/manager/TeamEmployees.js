import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
  Plus
} from 'lucide-react';
import EmployeePhoto from '../../components/EmployeePhoto';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const TeamEmployees = () => {
  const { currentSid } = useUser();
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
  const [managerLevel, setManagerLevel] = useState('');
  const [showAssessmentDetailModal, setShowAssessmentDetailModal] = useState(false);
  const [assessmentDetail, setAssessmentDetail] = useState(null);
  const [assessmentDetailLoading, setAssessmentDetailLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'grid'

  // Use dynamic SID from context
  const managerSid = currentSid;

  useEffect(() => {
    fetchTeamEmployees();
    fetchJCPData();
  }, []);

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
    setManagerLevel('');
    setShowAssessmentsModal(true);
    try {
      setAssessmentsLoading(true);
      const resp = await api.get(`/user-assessments/history/${employee.sid}`);
      setAssessments(resp.data.assessments || []);
    } catch (e) {
      console.error('Failed to load assessments:', e);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const saveManagerLevel = async (sessionId) => {
    if (!managerLevel) return;
    try {
      await api.post('/user-assessments/manager/confirm-level', {
        sessionId,
        managerSelectedLevel: managerLevel
      });
      const resp = await api.get(`/user-assessments/history/${selectedEmployee.sid}`);
      setAssessments(resp.data.assessments || []);
      setManagerLevel('');
    } catch (e) {
      console.error('Failed to save manager level:', e);
    }
  };

  const handleViewAssessmentDetails = async (sessionId) => {
    try {
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
                        className="ml-2 flex items-center hover:bg-blue-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        title="View Assessments"
                      >
                        <BarChart3 className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-xs text-blue-600 font-medium">Assessments</span>
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
                          className="ml-2 flex items-center hover:bg-blue-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          title="View Assessments"
                        >
                          <BarChart3 className="h-4 w-4 text-blue-600 mr-1" />
                          <span className="text-xs text-blue-600 font-medium">Assessments</span>
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
              <h3 className="text-lg font-semibold text-gray-900">
                Assessments - {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h3>
              <button
                onClick={() => setShowAssessmentsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {assessmentsLoading ? (
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
                    <div className="space-y-4">
                      {groupEntries.map(([compId, group]) => (
                        <div key={compId} className="border border-gray-200 rounded-lg">
                          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                            <div className="font-semibold text-gray-900">{group.name}</div>
                            <div className="text-xs text-gray-500">{group.items.length} attempt{group.items.length > 1 ? 's' : ''}</div>
                          </div>
                          <div className="p-4 space-y-3">
                            {group.items.map((a) => (
                              <div key={a.sessionId} className="flex items-start justify-between">
                                <div>
                                  <div className="text-sm text-gray-700">
                                    Score: {a.percentageScore}% ({a.correctAnswers}/{a.totalQuestions})
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">Completed: {a.completedAt ? new Date(a.completedAt).toLocaleString() : '—'}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button variant="outline" size="sm" onClick={() => handleViewAssessmentDetails(a.sessionId)}>
                                    View Details
                                  </Button>
                                  <select
                                    value={managerLevel}
                                    onChange={(e) => setManagerLevel(e.target.value)}
                                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                                  >
                                    <option value="">Manager Level</option>
                                    <option value="BASIC">BASIC</option>
                                    <option value="INTERMEDIATE">INTERMEDIATE</option>
                                    <option value="ADVANCED">ADVANCED</option>
                                    <option value="EXPERT">EXPERT</option>
                                  </select>
                                  <Button size="sm" onClick={() => saveManagerLevel(a.sessionId)} disabled={!managerLevel}>
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
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
