import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  Clock, 
  Save,
  CheckCircle,
  AlertCircle,
  Info,
  Target,
  User,
  UserCheck,
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import api from '../lib/api';
import { useUser } from '../contexts/UserContext';

const Settings = () => {
  const { toast } = useToast();
  const { currentSid } = useUser();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Determine active sub-menu from URL
  const getActiveSubMenu = () => {
    if (location.pathname.includes('/assessment-cycle')) {
      return 'assessment-cycle';
    }
    return 'assessment-cycle'; // Default
  };

  // Sub-menu state
  const [activeSubMenu, setActiveSubMenu] = useState(getActiveSubMenu());

  // Update when route changes
  useEffect(() => {
    setActiveSubMenu(getActiveSubMenu());
  }, [location.pathname]);

  // Tab state (for Assessment Cycle tabs)
  const [activeTab, setActiveTab] = useState('cycles');

  // Cycles state - now an array
  const [cycles, setCycles] = useState([]);
  const [editingCycle, setEditingCycle] = useState(null);
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    activationStartDate: '',
    activationEndDate: '',
    isActive: false,
    components: {
      systemAssessment: true,
      employeeSelfAssessment: true,
      assessorAssessment: true,
      managerAssessment: true
    }
  });

  // Exceptions state
  const [exceptions, setExceptions] = useState([]);
  const [editingException, setEditingException] = useState(null);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionType, setExceptionType] = useState('single'); // 'single' or 'group'
  const [exceptionForm, setExceptionForm] = useState({
    employeeSid: '',
    employeeName: '', // For display
    startDate: '',
    endDate: '',
    reason: '',
    cycleId: '', // Optional: link to specific cycle
    // Group exception fields
    groupType: '', // 'manager', 'division', 'location', 'unit'
    groupValue: '', // The selected manager SID, division name, etc.
    groupLabel: '' // Display label for the group
  });
  
  // Employee search state
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeSearchTimeoutRef = React.useRef(null);
  
  // Group filter options state
  const [groupFilters, setGroupFilters] = useState({
    managers: [],
    divisions: [],
    locations: [],
    units: []
  });
  
  // Group search state
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const groupSearchTimeoutRef = React.useRef(null);


  // Fetch assessment cycles setting
  const { data: cyclesData, isLoading: cyclesLoading } = useQuery({
    queryKey: ['settings', 'assessment_cycles'],
    queryFn: async () => {
      try {
        const response = await api.get('/settings/assessment_cycles');
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return null; // Setting doesn't exist yet
        }
        throw error;
      }
    }
  });

  // Fetch exceptions setting
  const { data: exceptionsData, isLoading: exceptionsLoading } = useQuery({
    queryKey: ['settings', 'assessment_exceptions'],
    queryFn: async () => {
      try {
        const response = await api.get('/settings/assessment_exceptions');
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return null; // Setting doesn't exist yet
        }
        throw error;
      }
    }
  });

  // Fetch group filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['employee-filters'],
    queryFn: async () => {
      const response = await api.get('/employees/filters');
      return response.data;
    }
  });

  // Update group filters when data is fetched
  useEffect(() => {
    if (filterOptions) {
      setGroupFilters({
        managers: filterOptions.managers || [],
        divisions: filterOptions.divisions || [],
        locations: filterOptions.locations || [],
        units: filterOptions.units || []
      });
    }
  }, [filterOptions]);

  // Employee search handler with debounce
  useEffect(() => {
    if (employeeSearchTimeoutRef.current) {
      clearTimeout(employeeSearchTimeoutRef.current);
    }

    if (employeeSearchQuery.trim().length >= 2) {
      employeeSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await api.get(`/employees/search?q=${encodeURIComponent(employeeSearchQuery)}&limit=20`);
          setEmployeeSearchResults(response.data.employees || []);
          setShowEmployeeDropdown(true);
        } catch (error) {
          console.error('Error searching employees:', error);
          setEmployeeSearchResults([]);
        }
      }, 300);
    } else {
      setEmployeeSearchResults([]);
      setShowEmployeeDropdown(false);
    }

    return () => {
      if (employeeSearchTimeoutRef.current) {
        clearTimeout(employeeSearchTimeoutRef.current);
      }
    };
  }, [employeeSearchQuery]);

  // Group search handler with debounce
  useEffect(() => {
    if (groupSearchTimeoutRef.current) {
      clearTimeout(groupSearchTimeoutRef.current);
    }

    if (!exceptionForm.groupType) {
      setGroupSearchResults([]);
      setShowGroupDropdown(false);
      return;
    }

    const searchTerm = groupSearchQuery.trim().toLowerCase();
    
    groupSearchTimeoutRef.current = setTimeout(() => {
      let results = [];
      
      if (searchTerm.length >= 1) {
        // Filter based on search term
        switch (exceptionForm.groupType) {
          case 'manager':
            results = groupFilters.managers.filter(manager => 
              manager.name.toLowerCase().includes(searchTerm) ||
              manager.sid.toLowerCase().includes(searchTerm) ||
              (manager.jobTitle && manager.jobTitle.toLowerCase().includes(searchTerm))
            );
            break;
          case 'division':
            results = groupFilters.divisions
              .filter(div => div && div.toLowerCase().includes(searchTerm))
              .map(div => ({ value: div, label: div }));
            break;
          case 'location':
            results = groupFilters.locations
              .filter(loc => loc && loc.toLowerCase().includes(searchTerm))
              .map(loc => ({ value: loc, label: loc }));
            break;
          case 'unit':
            results = groupFilters.units
              .filter(unit => unit && unit.toLowerCase().includes(searchTerm))
              .map(unit => ({ value: unit, label: unit }));
            break;
          default:
            results = [];
        }
      } else {
        // Show all options when search is empty (on focus)
        switch (exceptionForm.groupType) {
          case 'manager':
            results = groupFilters.managers;
            break;
          case 'division':
            results = groupFilters.divisions
              .filter(div => div)
              .map(div => ({ value: div, label: div }));
            break;
          case 'location':
            results = groupFilters.locations
              .filter(loc => loc)
              .map(loc => ({ value: loc, label: loc }));
            break;
          case 'unit':
            results = groupFilters.units
              .filter(unit => unit)
              .map(unit => ({ value: unit, label: unit }));
            break;
          default:
            results = [];
        }
      }
      
      setGroupSearchResults(results);
      // Show dropdown if there are results and user is typing or has focused
      if (results.length > 0) {
        setShowGroupDropdown(true);
      }
    }, searchTerm.length >= 1 ? 200 : 0); // No delay when showing all options

    return () => {
      if (groupSearchTimeoutRef.current) {
        clearTimeout(groupSearchTimeoutRef.current);
      }
    };
  }, [groupSearchQuery, exceptionForm.groupType, groupFilters]);


  // Update form when data loads
  useEffect(() => {
    if (cyclesData?.parsedValue) {
      setCycles(Array.isArray(cyclesData.parsedValue) ? cyclesData.parsedValue : []);
    }
  }, [cyclesData]);

  useEffect(() => {
    if (exceptionsData?.parsedValue) {
      setExceptions(Array.isArray(exceptionsData.parsedValue) ? exceptionsData.parsedValue : []);
    }
  }, [exceptionsData]);


  // Save cycles mutation
  const saveCyclesMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/settings/assessment_cycles', {
        value: data,
        description: 'Assessment Cycles configuration - list of cycles with dates and activation periods',
        category: 'assessment',
        updatedBy: currentSid
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings', 'assessment_cycles']);
      toast({
        title: 'Success',
        description: 'Cycles saved successfully!',
        variant: 'default'
      });
      setShowCycleForm(false);
      setEditingCycle(null);
      setCycleForm({
        name: '',
        startDate: '',
        endDate: '',
        activationStartDate: '',
        activationEndDate: '',
        isActive: false,
        components: {
          systemAssessment: true,
          employeeSelfAssessment: true,
          assessorAssessment: true,
          managerAssessment: true
        }
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save cycles',
        variant: 'destructive'
      });
    }
  });

  // Save exceptions mutation
  const saveExceptionsMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/settings/assessment_exceptions', {
        value: data,
        description: 'Assessment Exceptions - employee-specific date overrides',
        category: 'assessment',
        updatedBy: currentSid
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings', 'assessment_exceptions']);
      toast({
        title: 'Success',
        description: 'Exceptions saved successfully!',
        variant: 'default'
      });
      setShowExceptionForm(false);
      setEditingException(null);
      setExceptionForm({
        employeeSid: '',
        startDate: '',
        endDate: '',
        reason: '',
        cycleId: ''
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save exceptions',
        variant: 'destructive'
      });
    }
  });


  // Cycle form handlers
  const handleCycleFormChange = (field, value) => {
    setCycleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle component toggle in cycle form
  const handleCycleComponentToggle = (componentName) => {
    setCycleForm(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentName]: !prev.components[componentName]
      }
    }));
  };

  const handleAddCycle = () => {
    setEditingCycle(null);
    setCycleForm({
      name: '',
      startDate: '',
      endDate: '',
      activationStartDate: '',
      activationEndDate: '',
      isActive: false,
      components: {
        systemAssessment: true,
        employeeSelfAssessment: true,
        assessorAssessment: true,
        managerAssessment: true
      }
    });
    setShowCycleForm(true);
  };

  const handleEditCycle = (cycle, index) => {
    setEditingCycle(index);
    setCycleForm({
      name: cycle.name || '',
      startDate: cycle.startDate || '',
      endDate: cycle.endDate || '',
      activationStartDate: cycle.activationStartDate || '',
      activationEndDate: cycle.activationEndDate || '',
      isActive: cycle.isActive || false,
      components: cycle.components || {
        systemAssessment: true,
        employeeSelfAssessment: true,
        managerAssessment: true
      }
    });
    setShowCycleForm(true);
  };

  const handleDeleteCycle = (index) => {
    if (window.confirm('Are you sure you want to delete this cycle?')) {
      const updatedCycles = cycles.filter((_, i) => i !== index);
      saveCyclesMutation.mutate(updatedCycles);
    }
  };

  const handleSaveCycle = () => {
    // Validation
    if (!cycleForm.name) {
      toast({
        title: 'Validation Error',
        description: 'Cycle name is required',
        variant: 'destructive'
      });
      return;
    }

    if (!cycleForm.startDate || !cycleForm.endDate) {
      toast({
        title: 'Validation Error',
        description: 'Start date and end date are required',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(cycleForm.startDate) > new Date(cycleForm.endDate)) {
      toast({
        title: 'Validation Error',
        description: 'Start date must be before end date',
        variant: 'destructive'
      });
      return;
    }

    if (cycleForm.activationStartDate && cycleForm.activationEndDate) {
      if (new Date(cycleForm.activationStartDate) > new Date(cycleForm.activationEndDate)) {
        toast({
          title: 'Validation Error',
          description: 'Activation start date must be before activation end date',
          variant: 'destructive'
        });
        return;
      }
    }

    // Validate that at least one component is enabled
    const enabledComponents = Object.values(cycleForm.components || {}).filter(Boolean);
    if (enabledComponents.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one assessment component must be enabled',
        variant: 'destructive'
      });
      return;
    }

    let updatedCycles;
    if (editingCycle !== null) {
      // Update existing cycle
      updatedCycles = [...cycles];
      updatedCycles[editingCycle] = { ...cycleForm, id: cycles[editingCycle].id || Date.now().toString() };
    } else {
      // Add new cycle
      updatedCycles = [...cycles, { ...cycleForm, id: Date.now().toString() }];
    }

    saveCyclesMutation.mutate(updatedCycles);
  };

  // Exception form handlers
  const handleExceptionFormChange = (field, value) => {
    console.log(`Updating exception form field: ${field} =`, value, `(type: ${typeof value}, length: ${value?.length})`);
    setExceptionForm(prev => {
      const updated = {
        ...prev,
        [field]: value || '' // Ensure we always have a string, even if value is null/undefined
      };
      console.log('Updated exception form:', updated);
      console.log('Updated exception form (stringified):', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddException = () => {
    console.log('Opening Add Exception form');
    setEditingException(null);
    setExceptionType('single');
    setEmployeeSearchQuery('');
    setEmployeeSearchResults([]);
    setShowEmployeeDropdown(false);
    const newForm = {
      employeeSid: '',
      employeeName: '',
      startDate: '',
      endDate: '',
      reason: '',
      cycleId: '',
      groupType: '',
      groupValue: '',
      groupLabel: ''
    };
    console.log('Setting exception form to:', newForm);
    setExceptionForm(newForm);
    setShowExceptionForm(true);
  };

  const handleEditException = (exception, index) => {
    setEditingException(index);
    // Determine if it's a single or group exception
    const isGroup = exception.groupType && exception.groupValue;
    setExceptionType(isGroup ? 'group' : 'single');
    
    if (isGroup) {
      setEmployeeSearchQuery('');
      setEmployeeSearchResults([]);
      setShowEmployeeDropdown(false);
      // Set the search query to the label for display
      setGroupSearchQuery(exception.groupLabel || exception.groupValue || '');
    } else {
      setEmployeeSearchQuery(exception.employeeName || exception.employeeSid || '');
      setGroupSearchQuery('');
      setGroupSearchResults([]);
      setShowGroupDropdown(false);
    }
    
    setExceptionForm({ ...exception });
    setShowExceptionForm(true);
  };

  const handleDeleteException = (index) => {
    if (window.confirm('Are you sure you want to delete this exception?')) {
      const updatedExceptions = exceptions.filter((_, i) => i !== index);
      saveExceptionsMutation.mutate(updatedExceptions);
    }
  };

  const handleSaveException = () => {
    // Debug: Log form state
    console.log('Exception Form State (raw):', exceptionForm);
    console.log('Exception Type:', exceptionType);
    
    const startDate = exceptionForm.startDate || '';
    const endDate = exceptionForm.endDate || '';
    const reason = (exceptionForm.reason || '').trim();

    // Validation - check dates first
    if (!startDate || !endDate) {
      const missingFields = [];
      if (!startDate) missingFields.push('Start Date');
      if (!endDate) missingFields.push('End Date');
      
      toast({
        title: 'Validation Error',
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: 'Validation Error',
        description: 'Exception start date must be before end date',
        variant: 'destructive'
      });
      return;
    }

    // Validate based on exception type
    if (exceptionType === 'single') {
      const employeeSid = (exceptionForm.employeeSid || '').trim();
      if (!employeeSid) {
        toast({
          title: 'Validation Error',
          description: 'Please select an employee',
          variant: 'destructive'
        });
        return;
      }

      // Prepare single exception data
      const exceptionData = {
        type: 'single',
        employeeSid: employeeSid,
        employeeName: exceptionForm.employeeName || '',
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        cycleId: exceptionForm.cycleId || ''
      };

      let updatedExceptions;
      if (editingException !== null) {
        updatedExceptions = [...exceptions];
        updatedExceptions[editingException] = { 
          ...exceptionData, 
          id: exceptions[editingException].id || Date.now().toString() 
        };
      } else {
        updatedExceptions = [...exceptions, { 
          ...exceptionData, 
          id: Date.now().toString() 
        }];
      }

      saveExceptionsMutation.mutate(updatedExceptions);
    } else {
      // Group exception
      const groupType = exceptionForm.groupType || '';
      const groupValue = (exceptionForm.groupValue || '').trim();
      
      if (!groupType || !groupValue) {
        toast({
          title: 'Validation Error',
          description: 'Please select a group type and value',
          variant: 'destructive'
        });
        return;
      }

      // Prepare group exception data
      const exceptionData = {
        type: 'group',
        groupType: groupType,
        groupValue: groupValue,
        groupLabel: exceptionForm.groupLabel || '',
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        cycleId: exceptionForm.cycleId || ''
      };

      let updatedExceptions;
      if (editingException !== null) {
        updatedExceptions = [...exceptions];
        updatedExceptions[editingException] = { 
          ...exceptionData, 
          id: exceptions[editingException].id || Date.now().toString() 
        };
      } else {
        updatedExceptions = [...exceptions, { 
          ...exceptionData, 
          id: Date.now().toString() 
        }];
      }

      saveExceptionsMutation.mutate(updatedExceptions);
    }
  };


  const isLoading = cyclesLoading || exceptionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="h-8 w-8 mr-3 text-blue-600" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">Configure application settings and preferences</p>
        </div>

        {/* Assessment Cycle Content */}
        {activeSubMenu === 'assessment-cycle' && (
          <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Assessment Cycle
                  </CardTitle>
                  <CardDescription>
                    Manage assessment cycles and employee exceptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('cycles')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'cycles'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Cycles ({cycles.length})
                </button>
                <button
                  onClick={() => setActiveTab('exceptions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'exceptions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Exceptions ({exceptions.length})
                </button>
              </nav>
            </div>

            {/* Cycles Tab */}
            {activeTab === 'cycles' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Assessment Cycles</h3>
                    <p className="text-sm text-gray-500">Create and manage assessment cycles with activation periods</p>
                  </div>
                  <Button onClick={handleAddCycle} className="loyverse-button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cycle
                  </Button>
                </div>

                {/* Cycles List */}
                {cycles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No cycles configured yet</p>
                    <p className="text-sm">Click "Add Cycle" to create your first assessment cycle</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cycles.map((cycle, index) => (
                      <div key={cycle.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-lg">{cycle.name}</h4>
                              {cycle.isActive && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-medium">Cycle Period:</span>{' '}
                                {cycle.startDate} to {cycle.endDate}
                              </div>
                              {cycle.activationStartDate && cycle.activationEndDate && (
                                <div>
                                  <span className="font-medium">Activation Period:</span>{' '}
                                  {cycle.activationStartDate} to {cycle.activationEndDate}
                                </div>
                              )}
                            </div>
                            {cycle.components && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs font-medium text-gray-700 mb-2">Enabled Components:</div>
                                <div className="flex flex-wrap gap-2">
                                  {cycle.components.systemAssessment && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                      <Target className="h-3 w-3 mr-1" />
                                      System
                                    </span>
                                  )}
                                  {cycle.components.employeeSelfAssessment && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                      <User className="h-3 w-3 mr-1" />
                                      Self
                                    </span>
                                  )}
                                  {cycle.components.assessorAssessment && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                                      <ClipboardCheck className="h-3 w-3 mr-1" />
                                      Assessor
                                    </span>
                                  )}
                                  {cycle.components.managerAssessment && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Manager
                                    </span>
                                  )}
                                  {(!cycle.components.systemAssessment && 
                                    !cycle.components.employeeSelfAssessment && 
                                    !cycle.components.assessorAssessment &&
                                    !cycle.components.managerAssessment) && (
                                    <span className="text-xs text-amber-600">No components enabled</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCycle(cycle, index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCycle(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cycle Form Modal */}
                {showCycleForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">
                          {editingCycle !== null ? 'Edit Cycle' : 'Add New Cycle'}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCycleForm(false);
                            setEditingCycle(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="cycleName">Cycle Name *</Label>
                          <Input
                            id="cycleName"
                            value={cycleForm.name}
                            onChange={(e) => handleCycleFormChange('name', e.target.value)}
                            placeholder="e.g., Q1 2024 Assessment Cycle"
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="startDate">Cycle Start Date *</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={cycleForm.startDate}
                              onChange={(e) => handleCycleFormChange('startDate', e.target.value)}
                              className="mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="endDate">Cycle End Date *</Label>
                            <Input
                              id="endDate"
                              type="date"
                              value={cycleForm.endDate}
                              onChange={(e) => handleCycleFormChange('endDate', e.target.value)}
                              className="mt-1"
                              required
                            />
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center mb-4">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <Label className="text-base font-semibold">Activation Period (Optional)</Label>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="activationStartDate">Activation Start Date</Label>
                              <Input
                                id="activationStartDate"
                                type="date"
                                value={cycleForm.activationStartDate || ''}
                                onChange={(e) => handleCycleFormChange('activationStartDate', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="activationEndDate">Activation End Date</Label>
                              <Input
                                id="activationEndDate"
                                type="date"
                                value={cycleForm.activationEndDate || ''}
                                onChange={(e) => handleCycleFormChange('activationEndDate', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center mb-4">
                            <Target className="h-4 w-4 mr-2 text-gray-500" />
                            <Label className="text-base font-semibold">Assessment Components</Label>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            Select which assessment components are enabled for this cycle
                          </p>
                          
                          <div className="space-y-3">
                            {/* System Assessment */}
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Target className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <Label className="text-sm font-semibold">System Assessment</Label>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Automated system-based competency assessment
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-pressed={cycleForm.components?.systemAssessment}
                                onClick={() => handleCycleComponentToggle('systemAssessment')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                  cycleForm.components?.systemAssessment ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                    cycleForm.components?.systemAssessment ? 'translate-x-5' : ''
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Employee Self Assessment */}
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <User className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <Label className="text-sm font-semibold">Employee Self Assessment</Label>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Employees assess their own competencies
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-pressed={cycleForm.components?.employeeSelfAssessment}
                                onClick={() => handleCycleComponentToggle('employeeSelfAssessment')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                  cycleForm.components?.employeeSelfAssessment ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                    cycleForm.components?.employeeSelfAssessment ? 'translate-x-5' : ''
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Assessor Assessment */}
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                  <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                  <Label className="text-sm font-semibold">Assessor Assessment</Label>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Assessors evaluate employee competencies
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-pressed={cycleForm.components?.assessorAssessment}
                                onClick={() => handleCycleComponentToggle('assessorAssessment')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                  cycleForm.components?.assessorAssessment ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                    cycleForm.components?.assessorAssessment ? 'translate-x-5' : ''
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Manager Assessment */}
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <UserCheck className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                  <Label className="text-sm font-semibold">Manager Assessment</Label>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Managers assess their team members' competencies
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-pressed={cycleForm.components?.managerAssessment}
                                onClick={() => handleCycleComponentToggle('managerAssessment')}
                                className={`relative w-11 h-6 rounded-full transition-colors ${
                                  cycleForm.components?.managerAssessment ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                                    cycleForm.components?.managerAssessment ? 'translate-x-5' : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={cycleForm.isActive}
                            onChange={(e) => handleCycleFormChange('isActive', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="isActive">Set as Active Cycle</Label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowCycleForm(false);
                              setEditingCycle(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveCycle}
                            disabled={saveCyclesMutation.isLoading}
                            className="loyverse-button-primary"
                          >
                            {saveCyclesMutation.isLoading ? 'Saving...' : 'Save Cycle'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Exceptions Tab */}
            {activeTab === 'exceptions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Employee Exceptions</h3>
                    <p className="text-sm text-gray-500">Add exceptions for employees who need different assessment dates</p>
                  </div>
                  <Button onClick={handleAddException} className="loyverse-button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exception
                  </Button>
                </div>

                {/* Exceptions List */}
                {exceptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No exceptions configured yet</p>
                    <p className="text-sm">Click "Add Exception" to create an exception for an employee</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exceptions.map((exception, index) => (
                      <div key={exception.id || index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {exception.type === 'group' || (exception.groupType && exception.groupValue) ? (
                                <h4 className="font-semibold">
                                  Group: {exception.groupLabel || exception.groupValue} ({exception.groupType})
                                </h4>
                              ) : (
                                <h4 className="font-semibold">
                                  Employee: {exception.employeeName || exception.employeeSid} {exception.employeeSid && `(${exception.employeeSid})`}
                                </h4>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <span className="font-medium">Period:</span>{' '}
                                {exception.startDate} to {exception.endDate}
                              </div>
                              {exception.reason && (
                                <div>
                                  <span className="font-medium">Reason:</span> {exception.reason}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditException(exception, index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteException(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Exception Form Modal */}
                {showExceptionForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">
                          {editingException !== null ? 'Edit Exception' : 'Add New Exception'}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowExceptionForm(false);
                            setEditingException(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {/* Exception Type Selection */}
                        <div>
                          <Label>Exception Type *</Label>
                          <div className="flex space-x-4 mt-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="exceptionType"
                                value="single"
                                checked={exceptionType === 'single'}
                                onChange={(e) => {
                                  setExceptionType('single');
                                  setExceptionForm(prev => ({
                                    ...prev,
                                    groupType: '',
                                    groupValue: '',
                                    groupLabel: ''
                                  }));
                                }}
                                className="w-4 h-4"
                              />
                              <span>Single Employee</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="radio"
                                name="exceptionType"
                                value="group"
                                checked={exceptionType === 'group'}
                                onChange={(e) => {
                                  setExceptionType('group');
                                  setExceptionForm(prev => ({
                                    ...prev,
                                    employeeSid: '',
                                    employeeName: ''
                                  }));
                                  setEmployeeSearchQuery('');
                                  setEmployeeSearchResults([]);
                                  setShowEmployeeDropdown(false);
                                }}
                                className="w-4 h-4"
                              />
                              <span>Group Exception</span>
                            </label>
                          </div>
                        </div>

                        {/* Single Employee Selection */}
                        {exceptionType === 'single' && (
                          <div className="relative">
                            <Label htmlFor="exceptionSid">Employee *</Label>
                            <Input
                              id="exceptionSid"
                              value={employeeSearchQuery}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEmployeeSearchQuery(value);
                                if (!value) {
                                  setExceptionForm(prev => ({
                                    ...prev,
                                    employeeSid: '',
                                    employeeName: ''
                                  }));
                                }
                              }}
                              onFocus={() => {
                                if (employeeSearchResults.length > 0) {
                                  setShowEmployeeDropdown(true);
                                }
                              }}
                              placeholder="Search by SID, name, or email..."
                              className="mt-1"
                              required
                            />
                            
                            {/* Employee Search Dropdown */}
                            {showEmployeeDropdown && employeeSearchResults.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {employeeSearchResults.map((employee) => (
                                  <div
                                    key={employee.sid}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => {
                                      setEmployeeSearchQuery(employee.full_name || `${employee.first_name} ${employee.last_name}` || employee.sid);
                                      setExceptionForm(prev => ({
                                        ...prev,
                                        employeeSid: employee.sid,
                                        employeeName: employee.full_name || `${employee.first_name} ${employee.last_name}` || employee.sid
                                      }));
                                      setShowEmployeeDropdown(false);
                                    }}
                                  >
                                    <div className="font-medium">{employee.full_name || `${employee.first_name} ${employee.last_name}`}</div>
                                    <div className="text-sm text-gray-500">
                                      SID: {employee.sid} {employee.job_title ? `• ${employee.job_title}` : ''}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {exceptionForm.employeeSid && (
                              <div className="mt-2 text-sm text-green-600">
                                Selected: {exceptionForm.employeeName || exceptionForm.employeeSid}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Group Exception Selection */}
                        {exceptionType === 'group' && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="groupType">Group By *</Label>
                              <select
                                id="groupType"
                                value={exceptionForm.groupType || ''}
                                onChange={(e) => {
                                  handleExceptionFormChange('groupType', e.target.value);
                                  handleExceptionFormChange('groupValue', '');
                                  handleExceptionFormChange('groupLabel', '');
                                  setGroupSearchQuery('');
                                  setGroupSearchResults([]);
                                  setShowGroupDropdown(false);
                                }}
                                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                              >
                                <option value="">Select group type...</option>
                                <option value="manager">Manager</option>
                                <option value="division">Division</option>
                                <option value="location">Location</option>
                                <option value="unit">Unit</option>
                              </select>
                            </div>

                            {exceptionForm.groupType && (
                              <div className="relative">
                                <Label htmlFor="groupValue">
                                  {exceptionForm.groupType === 'manager' && 'Search Manager *'}
                                  {exceptionForm.groupType === 'division' && 'Search Division *'}
                                  {exceptionForm.groupType === 'location' && 'Search Location *'}
                                  {exceptionForm.groupType === 'unit' && 'Search Unit *'}
                                </Label>
                                <Input
                                  id="groupValue"
                                  value={groupSearchQuery}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setGroupSearchQuery(value);
                                    if (!value) {
                                      handleExceptionFormChange('groupValue', '');
                                      handleExceptionFormChange('groupLabel', '');
                                    }
                                  }}
                                  onFocus={() => {
                                    // Trigger search to show all options when focused
                                    if (groupSearchQuery.length === 0) {
                                      // Force re-trigger the search effect by updating the query slightly
                                      // This will show all options
                                      setGroupSearchQuery('');
                                    }
                                    setShowGroupDropdown(true);
                                  }}
                                  onBlur={() => {
                                    // Delay hiding dropdown to allow click on dropdown items
                                    setTimeout(() => {
                                      setShowGroupDropdown(false);
                                    }, 200);
                                  }}
                                  placeholder={`Search ${exceptionForm.groupType}...`}
                                  className="mt-1"
                                  required
                                />
                                
                                {/* Group Search Dropdown */}
                                {showGroupDropdown && groupSearchResults.length > 0 && (
                                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {groupSearchResults.map((item) => {
                                      // Handle manager objects vs simple string values
                                      if (exceptionForm.groupType === 'manager') {
                                        const manager = item;
                                        return (
                                          <div
                                            key={manager.sid}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            onClick={() => {
                                              setGroupSearchQuery(manager.name);
                                              handleExceptionFormChange('groupValue', manager.sid);
                                              handleExceptionFormChange('groupLabel', manager.name);
                                              setShowGroupDropdown(false);
                                            }}
                                          >
                                            <div className="font-medium">{manager.name}</div>
                                            <div className="text-sm text-gray-500">
                                              SID: {manager.sid} {manager.jobTitle ? `• ${manager.jobTitle}` : ''}
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        // Division, Location, or Unit (simple string values)
                                        return (
                                          <div
                                            key={item.value || item}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                            onClick={() => {
                                              const value = item.value || item;
                                              setGroupSearchQuery(value);
                                              handleExceptionFormChange('groupValue', value);
                                              handleExceptionFormChange('groupLabel', value);
                                              setShowGroupDropdown(false);
                                            }}
                                          >
                                            <div className="font-medium">{item.label || item}</div>
                                          </div>
                                        );
                                      }
                                    })}
                                  </div>
                                )}
                                
                                {exceptionForm.groupValue && (
                                  <div className="mt-2 text-sm text-green-600">
                                    Selected: {exceptionForm.groupLabel || exceptionForm.groupValue}
                                    <br />
                                    <span className="text-gray-600">
                                      Exception will apply to all employees in: {exceptionForm.groupLabel || exceptionForm.groupValue}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="exceptionStartDate">Exception Start Date *</Label>
                            <Input
                              id="exceptionStartDate"
                              type="date"
                              value={exceptionForm.startDate || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('Start date input changed:', newValue, 'Type:', typeof newValue, 'Length:', newValue?.length);
                                // Direct state update to ensure it's captured
                                setExceptionForm(prev => {
                                  const updated = { ...prev, startDate: newValue || '' };
                                  console.log('Direct state update - startDate:', updated.startDate);
                                  return updated;
                                });
                              }}
                              onBlur={(e) => {
                                console.log('Start date onBlur:', e.target.value);
                              }}
                              className="mt-1"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="exceptionEndDate">Exception End Date *</Label>
                            <Input
                              id="exceptionEndDate"
                              type="date"
                              value={exceptionForm.endDate || ''}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('End date input changed:', newValue, 'Type:', typeof newValue, 'Length:', newValue?.length);
                                // Direct state update to ensure it's captured
                                setExceptionForm(prev => {
                                  const updated = { ...prev, endDate: newValue || '' };
                                  console.log('Direct state update - endDate:', updated.endDate);
                                  return updated;
                                });
                              }}
                              onBlur={(e) => {
                                console.log('End date onBlur:', e.target.value);
                              }}
                              className="mt-1"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="exceptionReason">Reason</Label>
                          <Input
                            id="exceptionReason"
                            value={exceptionForm.reason}
                            onChange={(e) => handleExceptionFormChange('reason', e.target.value)}
                            placeholder="e.g., Extended leave, Special project"
                            className="mt-1"
                          />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowExceptionForm(false);
                              setEditingException(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              console.log('Save Exception button clicked');
                              console.log('Current form state:', exceptionForm);
                              handleSaveException();
                            }}
                            disabled={saveExceptionsMutation.isLoading}
                            className="loyverse-button-primary"
                            type="button"
                          >
                            {saveExceptionsMutation.isLoading ? 'Saving...' : 'Save Exception'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}

      </div>
    </div>
  );
};

export default Settings;
