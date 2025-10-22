import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Users, 
  Upload, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  UserPlus,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Eye,
  FileText,
  TrendingUp,
  UserCheck,
  Clock,
  Award,
  BookOpen,
  Target
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import EmployeePhoto from '../components/EmployeePhoto';

const Employees = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(''); // Search input for client-side filtering
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showJCPModal, setShowJCPModal] = useState(false);
  const [selectedEmployeeJCP, setSelectedEmployeeJCP] = useState(null);
  const [showIDPModal, setShowIDPModal] = useState(false);
  const [selectedEmployeeIDP, setSelectedEmployeeIDP] = useState(null);
  const searchInputRef = useRef(null);
  const [assessorEmployees, setAssessorEmployees] = useState(new Set());

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

  // Memoize search input handler to prevent re-renders
  const handleSearchInputChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  // Fetch all employees from API (no filtering on server side)
  const { data: employeesData, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees?page=1&limit=10000').then(res => res.data),
    retry: 1,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all employees for static statistics (without filters)
  const { data: allEmployeesData } = useQuery({
    queryKey: ['all-employees'],
    queryFn: () => api.get('/employees?page=1&limit=10000').then(res => res.data),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch assessor employees
  const { data: assessorData } = useQuery({
    queryKey: ['assessor-employees'],
    queryFn: async () => {
      const response = await api.get('/assessors');
      return response.data;
    },
    retry: 1,
  });

  // Update assessor employees set when data changes
  useEffect(() => {
    if (assessorData?.mappings) {
      const assessorSids = new Set(assessorData.mappings.map(mapping => mapping.assessor_sid));
      setAssessorEmployees(assessorSids);
    }
  }, [assessorData]);

  // Helper function to check if an employee is an assessor
  const isAssessor = (employeeSid) => {
    return assessorEmployees.has(employeeSid);
  };

  // State for employee IDPs
  const [employeeIdps, setEmployeeIdps] = useState(new Map());

  // Function to check if employee has IDPs
  const hasIDPs = (sid) => {
    return employeeIdps.has(sid) && employeeIdps.get(sid).length > 0;
  };

  // Function to get IDP count for employee
  const getIDPCount = (sid) => {
    return employeeIdps.get(sid)?.length || 0;
  };

  // Fetch IDPs for all employees
  useEffect(() => {
    const fetchAllIDPs = async () => {
      if (!employeesData?.employees) return;
      
      const idpMap = new Map();
      const promises = employeesData.employees.map(async (employee) => {
        try {
          const response = await api.get(`/idp/${employee.sid}`);
          if (response.data.success && response.data.idps) {
            idpMap.set(employee.sid, response.data.idps);
          }
        } catch (error) {
          // Employee might not have IDPs, which is fine
          idpMap.set(employee.sid, []);
        }
      });
      
      await Promise.all(promises);
      setEmployeeIdps(idpMap);
    };

    fetchAllIDPs();
  }, [employeesData]);

  // Fetch job-competency mappings for JCP calculation
  const { data: jobCompetencyMappings } = useQuery({
    queryKey: ['job-competency-mappings'],
    queryFn: () => api.get('/job-competencies').then(res => res.data),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const employees = useMemo(() => employeesData?.employees || [], [employeesData?.employees]);
  const allEmployees = useMemo(() => allEmployeesData?.employees || [], [allEmployeesData?.employees]);

  // Calculate static statistics from all employees (not filtered)
  const stats = useMemo(() => {
    const total = allEmployees.length;
    const active = allEmployees.filter(emp => emp.employment_status === 'ACTIVE').length;
    const divisions = new Set(allEmployees.map(emp => emp.division).filter(Boolean)).size;
    
    // Calculate JCP (Job Competency Profile) - employees whose job codes are linked to competencies
    const mappings = jobCompetencyMappings?.mappings || [];
    const jobCodesWithCompetencies = new Set(mappings.map(mapping => mapping.job.code));
    const jcp = allEmployees.filter(emp => 
      emp.job_code && jobCodesWithCompetencies.has(emp.job_code)
    ).length;
    
    return { total, active, divisions, jcp };
  }, [allEmployees, jobCompetencyMappings]);

  // Fetch all unique divisions and locations for filters
  const { data: filterData } = useQuery({
    queryKey: ['employee-filters'],
    queryFn: () => api.get('/employees/filters').then(res => res.data),
    retry: 1,
  });

  const divisions = filterData?.divisions || [];
  const locations = filterData?.locations || [];

  // Check if an employee has JCP (Job Competency Profile)
  const hasJCP = useCallback((employee) => {
    const mappings = jobCompetencyMappings?.mappings || [];
    const jobCodesWithCompetencies = new Set(mappings.map(mapping => mapping.job.code));
    return employee.job_code && jobCodesWithCompetencies.has(employee.job_code);
  }, [jobCompetencyMappings]);

  // Get JCP details for an employee
  const getJCPDetails = useCallback((employee) => {
    const mappings = jobCompetencyMappings?.mappings || [];
    const employeeMappings = mappings.filter(mapping => mapping.job.code === employee.job_code);
    
    return {
      employee,
      job: employeeMappings[0]?.job || null,
      competencies: employeeMappings.map(mapping => ({
        competency: mapping.competency,
        requiredLevel: mapping.requiredLevel,
        isRequired: mapping.isRequired
      }))
    };
  }, [jobCompetencyMappings]);

  // Handle JCP button click
  const handleJCPClick = useCallback((employee) => {
    const jcpDetails = getJCPDetails(employee);
    setSelectedEmployeeJCP(jcpDetails);
    setShowJCPModal(true);
  }, [getJCPDetails]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          toast({
            title: "Upload successful",
            description: "Employee data has been imported successfully.",
          });
          setShowUploadModal(false);
          setUploadProgress(0);
        }
      }, 200);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'FULL_TIME':
        return 'bg-blue-100 text-blue-800';
      case 'PART_TIME':
        return 'bg-purple-100 text-purple-800';
      case 'CONTRACT':
        return 'bg-orange-100 text-orange-800';
      case 'INTERN':
        return 'bg-pink-100 text-pink-800';
      case 'CONSULTANT':
        return 'bg-indigo-100 text-indigo-800';
      case 'TEMPORARY':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Client-side filtering for instant search
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    let filtered = employees;
    
    // Search filter
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.first_name?.toLowerCase().includes(searchLower) ||
        employee.last_name?.toLowerCase().includes(searchLower) ||
        employee.email?.toLowerCase().includes(searchLower) ||
        employee.sid?.toLowerCase().includes(searchLower) ||
        employee.job_title?.toLowerCase().includes(searchLower) ||
        employee.division?.toLowerCase().includes(searchLower)
      );
    }
    
    // Division filter
    if (selectedDivision) {
      filtered = filtered.filter(employee => employee.division === selectedDivision);
    }
    
    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter(employee => employee.location === selectedLocation);
    }
    
    return filtered;
  }, [employees, searchInput, selectedDivision, selectedLocation]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Users className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Error loading employees</p>
            <p className="text-sm">{error.message}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your organization's employee data and HR information</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="loyverse-button-secondary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Employees
          </Button>
          <Button
            onClick={() => setShowAddEmployee(true)}
            className="loyverse-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Employees</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
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
                <p className="text-sm font-medium text-gray-500">Divisions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.divisions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">JCP</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.jcp || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="search">Search Employees</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  id="search"
                  key="search-input"
                  placeholder="Search by name, email, or ID..."
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="division">Division</Label>
              <select
                id="division"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Divisions</option>
                {divisions.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="loyverse-input mt-1"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Employees ({filteredEmployees.length})</h2>
          <p className="text-sm text-gray-500">Comprehensive employee data management</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-4">
                {/* Horizontal Layout */}
                <div className="flex items-start space-x-4">
                  {/* Left Side - Photo and Basic Info */}
                  <div className="flex-shrink-0">
                    <EmployeePhoto
                      sid={employee.sid}
                      firstName={employee.first_name}
                      lastName={employee.last_name}
                      size="medium"
                    />
                  </div>

                  {/* Right Side - Details and Actions */}
                  <div className="flex-1 min-w-0">
                    {/* Header with Name and JCP */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        {hasJCP(employee) && (
                          <Award className="h-4 w-4 text-amber-500 flex-shrink-0" title="Has Job Competency Profile" />
                        )}
                        {isAssessor(employee.sid) && (
                          <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" title="Assessor - Can evaluate competencies" />
                        )}
                        {hasIDPs(employee.sid) && (
                          <Target 
                            className="h-4 w-4 text-blue-600 flex-shrink-0" 
                            title={`Has ${getIDPCount(employee.sid)} Individual Development Plan(s)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open IDP modal for this employee
                              setSelectedEmployeeIDP(employee);
                              setShowIDPModal(true);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Email and ID */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                      <p className="text-xs text-gray-400">
                        {employee.sid ? `SID: ${employee.sid}` : `ID: ${employee.id.slice(-8)}`}
                      </p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {/* Division & Unit */}
                      <div className="flex items-center space-x-2 min-w-0">
                        <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{employee.division}</p>
                          {employee.unit && (
                            <p className="text-xs text-gray-500 truncate">Unit: {employee.unit}</p>
                          )}
                        </div>
                      </div>

                      {/* Job Title & Grade */}
                      <div className="flex items-center space-x-2 min-w-0">
                        <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{employee.job_title || 'N/A'}</p>
                          {employee.grade && (
                            <p className="text-xs text-gray-500">Grade: {employee.grade}</p>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center space-x-2 min-w-0">
                        <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-900 truncate">{employee.location || 'N/A'}</p>
                          {employee.section && (
                            <p className="text-xs text-gray-500 truncate">{employee.section}</p>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center space-x-2 min-w-0">
                        <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{formatDate(employee.created_at)}</p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.employment_status)}`}>
                        {employee.employment_status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(employee.employment_type)}`}>
                        {(employee.employment_type || '').replace('_', ' ')}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-1">
                        <button 
                          className="text-gray-400 hover:text-blue-600 p-1" 
                          title="Edit"
                          onClick={() => navigate(`/employees/edit/${employee.sid || employee.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {hasJCP(employee) && (
                          <button 
                            className="text-amber-500 hover:text-amber-600 p-1" 
                            title="View Job Competency Profile"
                            onClick={() => handleJCPClick(employee)}
                          >
                            <BookOpen className="h-4 w-4" />
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600 p-1" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button className="text-gray-400 hover:text-red-600 p-1" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 p-1" title="More">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Employee Count */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Showing {employees.length} of {allEmployees.length} employees
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Employees</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select CSV file</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSV should include: Employee ID, First Name, Last Name, Email, Department, Job Title, etc.
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
                  onClick={() => document.getElementById('file').click()}
                  className="loyverse-button"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JCP Modal */}
      {showJCPModal && selectedEmployeeJCP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Award className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Job Competency Profile</h2>
                    <p className="text-sm text-gray-600">
                      {selectedEmployeeJCP.employee.first_name} {selectedEmployeeJCP.employee.last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJCPModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Job Information */}
              {selectedEmployeeJCP.job && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Job Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Job Title:</span>
                      <p className="text-sm text-gray-900">{selectedEmployeeJCP.job.title}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Job Code:</span>
                      <p className="text-sm text-gray-900">{selectedEmployeeJCP.job.code}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Division:</span>
                      <p className="text-sm text-gray-900">{selectedEmployeeJCP.job.division}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Unit:</span>
                      <p className="text-sm text-gray-900">{selectedEmployeeJCP.job.unit}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Competencies */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Required Competencies ({selectedEmployeeJCP.competencies.length})
                </h3>
                <div className="space-y-4">
                  {selectedEmployeeJCP.competencies.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{item.competency.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{item.competency.family}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.requiredLevel === 'BASIC' ? 'bg-gray-100 text-gray-800' :
                            item.requiredLevel === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                            item.requiredLevel === 'ADVANCED' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.requiredLevel}
                          </span>
                          {item.isRequired && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{item.competency.definition}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowJCPModal(false)}
                  className="loyverse-button-primary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IDP Modal */}
      {showIDPModal && selectedEmployeeIDP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <EmployeePhoto
                    sid={selectedEmployeeIDP.sid}
                    firstName={selectedEmployeeIDP.first_name}
                    lastName={selectedEmployeeIDP.last_name}
                    size="medium"
                  />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Individual Development Plans</h2>
                    <p className="text-sm text-gray-600">
                      {selectedEmployeeIDP.first_name} {selectedEmployeeIDP.last_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIDPModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* IDP Content */}
              <div className="space-y-4">
                {(() => {
                  const employeeIdpList = employeeIdps.get(selectedEmployeeIDP.sid) || [];
                  
                  if (employeeIdpList.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No IDPs Found</h3>
                        <p className="text-gray-500">This employee doesn't have any Individual Development Plans yet.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* IDP Summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          <h3 className="text-lg font-semibold text-blue-900">IDP Progress Summary</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{employeeIdpList.length}</div>
                            <div className="text-blue-800">Total IDPs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {employeeIdpList.filter(idp => idp.status === 'COMPLETED').length}
                            </div>
                            <div className="text-green-800">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {employeeIdpList.filter(idp => idp.status === 'IN_PROGRESS').length}
                            </div>
                            <div className="text-blue-800">In Progress</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">
                              {Math.round(employeeIdpList.reduce((sum, idp) => sum + (idp.progress_percentage || 0), 0) / employeeIdpList.length) || 0}%
                            </div>
                            <div className="text-gray-800">Avg Progress</div>
                          </div>
                        </div>
                      </div>

                      {/* Individual IDP Cards */}
                      <div className="space-y-4">
                        {employeeIdpList.map((idp) => (
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
                                
                                {/* Progress Bar */}
                                {idp.progress_percentage !== undefined && (
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700">Progress</span>
                                      <span className="text-sm font-bold text-blue-600">{idp.progress_percentage || 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${idp.progress_percentage || 0}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}

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

                                {/* Progress Information */}
                                {(idp.progress_notes || idp.last_progress_update || idp.progress_attachments) && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                      <span className="text-sm font-medium text-blue-900">Latest Progress Update</span>
                                    </div>
                                    
                                    {idp.progress_notes && (
                                      <div className="text-sm text-blue-800 mb-2">
                                        <span className="font-medium">Notes:</span> {idp.progress_notes}
                                      </div>
                                    )}
                                    
                                    {idp.last_progress_update && (
                                      <div className="text-xs text-blue-600 mb-2">
                                        <span className="font-medium">Updated:</span> {new Date(idp.last_progress_update).toLocaleString()}
                                      </div>
                                    )}
                                    
                                    {idp.progress_attachments && idp.progress_attachments.length > 0 && (
                                      <div className="text-xs text-blue-600">
                                        <span className="font-medium">Attachments:</span> {idp.progress_attachments.length} file(s)
                                        <div className="mt-1 space-y-1">
                                          {idp.attachment_names && idp.attachment_names.map((name, index) => (
                                            <div key={index} className="flex items-center gap-1">
                                              <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                                              <span className="truncate max-w-[200px]">{name}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="mt-3 text-xs text-gray-500">
                                  Created: {idp.created_at ? new Date(idp.created_at).toLocaleDateString() : '—'}
                                  {idp.updated_at && idp.updated_at !== idp.created_at && (
                                    <span> • Updated: {new Date(idp.updated_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setShowIDPModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
