import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Users, 
  Search, 
  Plus,
  User,
  Mail,
  MapPin,
  Award,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  CheckCircle,
  X,
  Filter,
  MoreVertical,
  UserCheck
} from 'lucide-react';
import EmployeePhoto from '../components/EmployeePhoto';
import api from '../lib/api';
import { useToast } from '../components/ui/use-toast';

const Assessors = () => {
  const [mappings, setMappings] = useState([]);
  const [filteredMappings, setFilteredMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [competencies, setCompetencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState(null);
  const { toast } = useToast();

  // Form state for adding new mapping
  const [newMapping, setNewMapping] = useState({
    assessorSid: '',
    competencyId: '',
    competencyLevel: 'BASIC'
  });

  // Search states for modal
  const [assessorSearchTerm, setAssessorSearchTerm] = useState('');
  const [competencySearchTerm, setCompetencySearchTerm] = useState('');

  // Form state for editing mapping
  const [editMapping, setEditMapping] = useState({
    competencyLevel: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterMappings();
  }, [mappings, searchTerm, selectedCompetency, selectedLevel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mappingsRes, competenciesRes, employeesRes, statsRes] = await Promise.all([
        api.get('/assessors'),
        api.get('/competencies?limit=2000'),
        api.get('/employees?limit=2000'),
        api.get('/assessors/stats/overview')
      ]);

      setMappings(mappingsRes.data.mappings || []);
      setCompetencies(competenciesRes.data.competencies || []);
      setEmployees(employeesRes.data.employees || employeesRes.data);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch assessor data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMappings = () => {
    let filtered = mappings;

    if (searchTerm) {
      filtered = filtered.filter(mapping =>
        mapping.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.competency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.assessor_sid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCompetency) {
      filtered = filtered.filter(mapping => mapping.competency_id === selectedCompetency);
    }

    if (selectedLevel) {
      filtered = filtered.filter(mapping => mapping.competency_level === selectedLevel);
    }

    setFilteredMappings(filtered);
  };

  const handleAddMapping = async () => {
    try {
      const response = await api.post('/assessors', newMapping);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Assessor mapping added successfully',
          variant: 'default'
        });
        setShowAddModal(false);
        setNewMapping({ assessorSid: '', competencyId: '', competencyLevel: 'BASIC' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add assessor mapping',
        variant: 'destructive'
      });
    }
  };

  const handleEditMapping = async () => {
    try {
      const response = await api.put(`/assessors/${selectedMapping.id}`, editMapping);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Assessor mapping updated successfully',
          variant: 'default'
        });
        setShowEditModal(false);
        setSelectedMapping(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update assessor mapping',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assessor mapping?')) {
      return;
    }

    try {
      const response = await api.delete(`/assessors/${id}`);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Assessor mapping deleted successfully',
          variant: 'default'
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assessor mapping',
        variant: 'destructive'
      });
    }
  };

  const openEditModal = (mapping) => {
    setSelectedMapping(mapping);
    setEditMapping({
      competencyLevel: mapping.competency_level,
      isActive: mapping.is_active
    });
    setShowEditModal(true);
  };

  const getUniqueCompetencies = () => {
    return [...new Set(mappings.map(mapping => mapping.competency_id))];
  };

  const getCompetencyName = (competencyId) => {
    const competency = competencies.find(c => c.id === competencyId);
    return competency ? competency.name : 'Unknown';
  };

  const getEmployeeName = (sid) => {
    const employee = employees.find(emp => emp.sid === sid);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-green-100 text-green-800';
      case 'MASTERY': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter functions for modal
  const filteredEmployees = employees.filter(employee => {
    const searchLower = assessorSearchTerm.toLowerCase();
    return (
      employee.first_name?.toLowerCase().includes(searchLower) ||
      employee.last_name?.toLowerCase().includes(searchLower) ||
      employee.sid?.toLowerCase().includes(searchLower) ||
      employee.job_title?.toLowerCase().includes(searchLower)
    );
  });

  const filteredCompetencies = competencies.filter(competency => {
    const searchLower = competencySearchTerm.toLowerCase();
    return (
      competency.name?.toLowerCase().includes(searchLower) ||
      competency.type?.toLowerCase().includes(searchLower) ||
      competency.family?.toLowerCase().includes(searchLower) ||
      competency.definition?.toLowerCase().includes(searchLower)
    );
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Assessor Management</h1>
          <p className="text-gray-600 mt-1">
            Manage assessors and link them to specific competencies with competency levels
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Assessor Mapping
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Assessors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_assessors}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Mappings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_mappings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Competencies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_competencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Mappings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active_mappings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search assessors, competencies, or SIDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedCompetency}
                onChange={(e) => setSelectedCompetency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Competencies</option>
                {competencies.map(competency => (
                  <option key={competency.id} value={competency.id}>{competency.name}</option>
                ))}
              </select>
            </div>
            <div className="md:w-48">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Levels</option>
                <option value="BASIC">Basic</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessor Mappings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMappings.map((mapping) => (
          <Card key={mapping.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              {/* Header with Photo and Actions */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <EmployeePhoto
                    sid={mapping.assessor_sid}
                    firstName={mapping.first_name}
                    lastName={mapping.last_name}
                    size="large"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {mapping.first_name} {mapping.last_name}
                    </h3>
                    <div className="flex space-x-1">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(mapping)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteMapping(mapping.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {mapping.job_title || 'No Job Title'}
                  </p>
                </div>
              </div>

              {/* Competency Info - Prominent Position */}
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-base">{mapping.competency_name}</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(mapping.competency_level)}`}>
                    {mapping.competency_level}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                    {mapping.competency_type}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-medium">
                    {mapping.competency_family}
                  </span>
                </div>
              </div>

              {/* Employee Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <User className="h-4 w-4 mr-2" />
                  <span className="font-mono">{mapping.assessor_sid}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="truncate">{mapping.email}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{mapping.division || 'No Division'}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  mapping.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {mapping.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-400">
                  Assessor Mapping
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredMappings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessor Mappings Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCompetency || selectedLevel
                ? 'Try adjusting your search criteria' 
                : 'No assessor mappings have been created yet'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Add Assessor Mapping</h3>
                  <p className="text-sm text-gray-600">Link an employee to a competency with specific level</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAssessorSearchTerm('');
                  setCompetencySearchTerm('');
                  setNewMapping({ assessorSid: '', competencyId: '', competencyLevel: 'BASIC' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Step 1: Select Assessor */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-green-600">1</span>
                  </div>
                  <label className="text-lg font-medium text-gray-900">Select Assessor</label>
                </div>
                
                {/* Search for Assessor */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search employees by name, SID, or job title..."
                    value={assessorSearchTerm}
                    onChange={(e) => setAssessorSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Employee Cards Grid */}
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredEmployees.map(employee => (
                      <Card 
                        key={employee.sid} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          newMapping.assessorSid === employee.sid 
                            ? 'ring-2 ring-green-500 bg-green-50' 
                            : 'hover:bg-white'
                        }`}
                        onClick={() => setNewMapping({...newMapping, assessorSid: employee.sid})}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <EmployeePhoto
                              sid={employee.sid}
                              firstName={employee.first_name}
                              lastName={employee.last_name}
                              size="small"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {employee.first_name} {employee.last_name}
                              </h4>
                              <p className="text-xs text-gray-600 truncate">{employee.job_title}</p>
                              <p className="text-xs text-gray-500 font-mono">{employee.sid}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {filteredEmployees.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No employees found matching your search
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Select Competency */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <label className="text-lg font-medium text-gray-900">Select Competency</label>
                </div>
                
                {/* Search for Competency */}
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search competencies by name, type, or family..."
                    value={competencySearchTerm}
                    onChange={(e) => setCompetencySearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Competency Cards Grid */}
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCompetencies.map(competency => (
                      <Card 
                        key={competency.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          newMapping.competencyId === competency.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-white'
                        }`}
                        onClick={() => setNewMapping({...newMapping, competencyId: competency.id})}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-900">{competency.name}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{competency.definition}</p>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {competency.type}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {competency.family}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {filteredCompetencies.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No competencies found matching your search
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Select Competency Level */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-purple-600">3</span>
                  </div>
                  <label className="text-lg font-medium text-gray-900">Select Competency Level</label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { value: 'BASIC', label: 'Basic', description: 'Fundamental understanding', color: 'blue' },
                    { value: 'INTERMEDIATE', label: 'Intermediate', description: 'Practical application', color: 'yellow' },
                    { value: 'ADVANCED', label: 'Advanced', description: 'Expert level mastery', color: 'green' },
                    { value: 'MASTERY', label: 'Mastery', description: 'Leadership and guidance', color: 'purple' }
                  ].map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setNewMapping({...newMapping, competencyLevel: level.value})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        newMapping.competencyLevel === level.value
                          ? `border-${level.color}-500 bg-${level.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                          newMapping.competencyLevel === level.value
                            ? `bg-${level.color}-500`
                            : 'bg-gray-300'
                        }`}></div>
                        <h4 className="font-medium text-gray-900">{level.label}</h4>
                        <p className="text-xs text-gray-500 mt-1">{level.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {newMapping.assessorSid && newMapping.competencyId && newMapping.competencyLevel && (
                <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4 text-center">Mapping Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Assessor</div>
                      <div className="font-medium">
                        {employees.find(emp => emp.sid === newMapping.assessorSid)?.first_name} {employees.find(emp => emp.sid === newMapping.assessorSid)?.last_name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {employees.find(emp => emp.sid === newMapping.assessorSid)?.sid}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Competency</div>
                      <div className="font-medium">
                        {competencies.find(comp => comp.id === newMapping.competencyId)?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {competencies.find(comp => comp.id === newMapping.competencyId)?.type}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Level</div>
                      <div className={`font-medium px-3 py-1 rounded-full text-sm inline-block ${
                        newMapping.competencyLevel === 'BASIC' ? 'bg-blue-100 text-blue-800' :
                        newMapping.competencyLevel === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                        newMapping.competencyLevel === 'ADVANCED' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {newMapping.competencyLevel}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddModal(false);
                  setAssessorSearchTerm('');
                  setCompetencySearchTerm('');
                  setNewMapping({ assessorSid: '', competencyId: '', competencyLevel: 'BASIC' });
                }}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddMapping}
                disabled={!newMapping.assessorSid || !newMapping.competencyId || !newMapping.competencyLevel}
                className="bg-green-600 hover:bg-green-700 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Mapping
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mapping Modal */}
      {showEditModal && selectedMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Edit className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Edit Assessor Mapping</h3>
                  <p className="text-sm text-gray-600">Update competency level and status</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Current Mapping Info */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4 text-center">Current Mapping</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <EmployeePhoto
                        sid={selectedMapping.assessor_sid}
                        firstName={selectedMapping.first_name}
                        lastName={selectedMapping.last_name}
                        size="medium"
                      />
                      <div className="text-left">
                        <h5 className="font-medium text-gray-900">
                          {selectedMapping.first_name} {selectedMapping.last_name}
                        </h5>
                        <p className="text-sm text-gray-600">{selectedMapping.job_title}</p>
                        <p className="text-xs text-gray-500 font-mono">{selectedMapping.assessor_sid}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">{selectedMapping.competency_name}</h5>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{selectedMapping.competency_definition || 'No definition available'}</p>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {selectedMapping.competency_type}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {selectedMapping.competency_family}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-medium text-gray-900 mb-4">Update Competency Level</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: 'BASIC', label: 'Basic', description: 'Fundamental understanding', color: 'blue' },
                      { value: 'INTERMEDIATE', label: 'Intermediate', description: 'Practical application', color: 'yellow' },
                      { value: 'ADVANCED', label: 'Advanced', description: 'Expert level mastery', color: 'green' },
                      { value: 'MASTERY', label: 'Mastery', description: 'Leadership and guidance', color: 'purple' }
                    ].map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setEditMapping({...editMapping, competencyLevel: level.value})}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          editMapping.competencyLevel === level.value
                            ? `border-${level.color}-500 bg-${level.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                            editMapping.competencyLevel === level.value
                              ? `bg-${level.color}-500`
                              : 'bg-gray-300'
                          }`}></div>
                          <h4 className="font-medium text-gray-900">{level.label}</h4>
                          <p className="text-xs text-gray-500 mt-1">{level.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editMapping.isActive}
                      onChange={(e) => setEditMapping({...editMapping, isActive: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-lg font-medium text-gray-700">Active Mapping</span>
                  </label>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    editMapping.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {editMapping.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              {/* Summary of Changes */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3 text-center">Updated Mapping Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Assessor</div>
                    <div className="font-medium">{selectedMapping.first_name} {selectedMapping.last_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Competency</div>
                    <div className="font-medium">{selectedMapping.competency_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Level</div>
                    <div className={`font-medium px-3 py-1 rounded-full text-sm inline-block ${
                      editMapping.competencyLevel === 'BASIC' ? 'bg-blue-100 text-blue-800' :
                      editMapping.competencyLevel === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                      editMapping.competencyLevel === 'ADVANCED' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {editMapping.competencyLevel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditMapping}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Mapping
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessors;
