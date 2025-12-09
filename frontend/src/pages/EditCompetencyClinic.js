import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { getLevelDisplayName } from '../utils/competencyLevels';
import { useUser } from '../contexts/UserContext';
import {
  ArrowLeft,
  BookOpen,
  Save,
  Plus,
  Edit,
  Trash2,
  X,
  Target,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const EditCompetencyClinic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  
  const [activeTab, setActiveTab] = useState('definition'); // definition, levels (includes elements and indicators)
  const [expandedLevels, setExpandedLevels] = useState({});
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [editingElementId, setEditingElementId] = useState(null);
  const [editingIndicatorId, setEditingIndicatorId] = useState(null);
  
  // Form states
  const [definitionForm, setDefinitionForm] = useState({ definition: '' });
  const [levelForm, setLevelForm] = useState({ levelId: '', description: '', indicators: [] });
  const [elementForm, setElementForm] = useState({ levelId: '', elementId: '', name: '', description: '' });
  const [indicatorForm, setIndicatorForm] = useState({ elementId: '', indicatorId: '', action: '' });
  const [newIndicatorText, setNewIndicatorText] = useState('');
  
  // Fetch competency data
  const { data: competency, isLoading } = useQuery({
    queryKey: ['competency-full', id],
    queryFn: async () => {
      const response = await api.get(`/competencies/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  // Update form when competency data loads
  useEffect(() => {
    if (competency) {
      setDefinitionForm({ definition: competency.definition || competency.description || '' });
    }
  }, [competency]);

  // Fetch employee name
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      return response.data;
    }
  });

  const employee = employeesData?.employees?.find(e => e.sid === currentSid);
  const requestedByName = employee ? `${employee.first_name} ${employee.last_name}` : currentSid;

  // Create edit request mutation
  const createEditRequestMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/competency-edit-requests', {
        competencyId: id,
        requestedBy: currentSid,
        requestedByName,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Edit Request Submitted',
        description: 'Your changes have been submitted for admin review.',
        variant: 'default'
      });
      queryClient.invalidateQueries(['competency-full', id]);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit edit request',
        variant: 'destructive'
      });
    }
  });

  // Save definition edit
  const handleSaveDefinition = () => {
    const currentDefinition = competency?.definition || competency?.description || '';
    if (!definitionForm.definition || definitionForm.definition === currentDefinition) {
      toast({
        title: 'No Changes',
        description: 'No changes detected in the definition.',
        variant: 'default'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'DEFINITION',
      changes: {
        oldValue: currentDefinition,
        newValue: definitionForm.definition
      }
    });
  };

  // Save level description edit
  const handleSaveLevelDescription = (level) => {
    if (!levelForm.description || levelForm.description === level.description) {
      toast({
        title: 'No Changes',
        description: 'No changes detected in the level description.',
        variant: 'default'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'LEVEL_DESCRIPTION',
      changes: {
        levelId: level.id,
        oldValue: level.description,
        newValue: levelForm.description
      }
    });
    setEditingLevelId(null);
    setLevelForm({ levelId: '', description: '', indicators: [] });
  };

  // Save level indicators edit
  const handleSaveLevelIndicators = (level) => {
    const newIndicators = levelForm.indicators;
    const oldIndicators = Array.isArray(level.indicators) ? level.indicators : [];

    if (JSON.stringify(newIndicators) === JSON.stringify(oldIndicators)) {
      toast({
        title: 'No Changes',
        description: 'No changes detected in the level indicators.',
        variant: 'default'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'LEVEL_INDICATORS',
      changes: {
        levelId: level.id,
        oldValue: oldIndicators,
        newValue: newIndicators
      }
    });
    setEditingLevelId(null);
    setLevelForm({ levelId: '', description: '', indicators: [] });
  };

  // Add new element
  const handleAddElement = () => {
    if (!elementForm.levelId || !elementForm.name) {
      toast({
        title: 'Missing Fields',
        description: 'Please select a level and enter element name.',
        variant: 'destructive'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'ELEMENT_ADD',
      changes: {
        levelId: elementForm.levelId,
        name: elementForm.name,
        description: elementForm.description || '',
        order: 0
      }
    });
    setElementForm({ levelId: '', elementId: '', name: '', description: '' });
  };

  // Edit existing element
  const handleEditElement = (element, levelId) => {
    if (!elementForm.name || elementForm.name === element.name) {
      toast({
        title: 'No Changes',
        description: 'No changes detected.',
        variant: 'default'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'ELEMENT_EDIT',
      changes: {
        elementId: element.id,
        levelId,
        oldValue: { name: element.name, description: element.description },
        newValue: { name: elementForm.name, description: elementForm.description || '' }
      }
    });
    setEditingElementId(null);
    setElementForm({ levelId: '', elementId: '', name: '', description: '' });
  };

  // Delete element
  const handleDeleteElement = (element) => {
    if (!window.confirm(`Are you sure you want to delete element "${element.name}"?`)) {
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'ELEMENT_DELETE',
      changes: {
        elementId: element.id,
        elementName: element.name
      }
    });
  };

  // Add new indicator
  const handleAddIndicator = (elementId) => {
    if (!indicatorForm.action || !indicatorForm.action.trim()) {
      toast({
        title: 'Missing Field',
        description: 'Please enter the indicator action.',
        variant: 'destructive'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'INDICATOR_ADD',
      changes: {
        elementId,
        action: indicatorForm.action,
        order: 0
      }
    });
    setIndicatorForm({ elementId: '', indicatorId: '', action: '' });
  };

  // Edit existing indicator
  const handleEditIndicator = (indicator, elementId) => {
    if (!indicatorForm.action || indicatorForm.action === indicator.action) {
      toast({
        title: 'No Changes',
        description: 'No changes detected.',
        variant: 'default'
      });
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'INDICATOR_EDIT',
      changes: {
        indicatorId: indicator.id,
        elementId,
        oldValue: indicator.action,
        newValue: indicatorForm.action
      }
    });
    setEditingIndicatorId(null);
    setIndicatorForm({ elementId: '', indicatorId: '', action: '' });
  };

  // Delete indicator
  const handleDeleteIndicator = (indicator) => {
    if (!window.confirm(`Are you sure you want to delete this indicator?`)) {
      return;
    }

    createEditRequestMutation.mutate({
      editType: 'INDICATOR_DELETE',
      changes: {
        indicatorId: indicator.id,
        indicatorAction: indicator.action
      }
    });
  };

  const levelOrder = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
  const sortedLevels = [...(competency?.levels || [])].sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
  );

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

  if (!competency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Competency not found</h2>
          <Button onClick={() => navigate('/kafu-clinic')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Kafu Clinic
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{competency.name}</h1>
                {competency.code && (
                  <p className="text-sm text-gray-500 font-mono mt-1">Code: {competency.code}</p>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Edit Mode - Pending Review</p>
                <p>All changes you make will be submitted for admin review. Changes will not be applied until approved by an administrator.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex gap-4 px-6">
              <button
                onClick={() => setActiveTab('definition')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'definition'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Definition
                </div>
              </button>
              <button
                onClick={() => setActiveTab('levels')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'levels'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Levels, Elements & Indicators
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Definition Tab */}
            {activeTab === 'definition' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-2 block">Competency Definition</Label>
                  <Textarea
                    value={definitionForm.definition}
                    onChange={(e) => setDefinitionForm({ definition: e.target.value })}
                    placeholder="Enter competency definition"
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveDefinition} disabled={createEditRequestMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Submit for Review
                  </Button>
                  <Button variant="outline" onClick={() => setDefinitionForm({ definition: competency?.definition || competency?.description || '' })}>
                    Reset
                  </Button>
                </div>
              </div>
            )}

            {/* Levels Tab - Now includes Elements and Indicators */}
            {activeTab === 'levels' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Edit level descriptions, indicators, elements, and performance indicators. Changes will be submitted for admin review.
                </p>
                {sortedLevels.map((level) => {
                  const isExpanded = expandedLevels[level.id];
                  const isEditing = editingLevelId === level.id;
                  const elements = level.elements || [];
                  
                  return (
                    <Card key={level.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sm">
                              {getLevelDisplayName(level.level)}
                            </Badge>
                            <CardTitle className="text-lg">{level.title || level.level}</CardTitle>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setExpandedLevels(prev => ({ ...prev, [level.id]: !prev[level.id] }));
                              if (!isExpanded) {
                                setLevelForm({
                                  levelId: level.id,
                                  description: level.description || '',
                                  indicators: Array.isArray(level.indicators) ? [...level.indicators] : []
                                });
                              }
                            }}
                          >
                            {isExpanded ? <ChevronUp /> : <ChevronDown />}
                          </Button>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="space-y-6">
                          {/* Level Description */}
                          <div className="border-b pb-4">
                            <Label className="text-sm font-semibold mb-2 block">Level Description</Label>
                            <Textarea
                              value={isEditing ? levelForm.description : level.description || ''}
                              onChange={(e) => setLevelForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Enter level description"
                              className="min-h-[100px]"
                              disabled={!isEditing}
                            />
                            <div className="flex gap-2 mt-2">
                              {!isEditing ? (
                                <Button size="sm" onClick={() => {
                                  setEditingLevelId(level.id);
                                  setLevelForm(prev => ({ ...prev, levelId: level.id }));
                                }}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit Description
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" onClick={() => handleSaveLevelDescription(level)}>
                                    <Save className="h-3 w-3 mr-1" />
                                    Submit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setEditingLevelId(null);
                                    setLevelForm(prev => ({ ...prev, description: level.description || '' }));
                                  }}>
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Elements Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <Label className="text-sm font-semibold">Elements ({elements.length})</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setElementForm({ levelId: level.id, elementId: '', name: '', description: '' });
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Element
                              </Button>
                            </div>

                            {/* Add New Element Form */}
                            {elementForm.levelId === level.id && !elementForm.elementId && (
                              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-blue-900 mb-3">Add New Element</h4>
                                <div className="space-y-3">
                                  <div>
                                    <Label>Element Name *</Label>
                                    <Input
                                      value={elementForm.name}
                                      onChange={(e) => setElementForm(prev => ({ ...prev, name: e.target.value }))}
                                      placeholder="Enter element name"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleAddElement} disabled={!elementForm.name}>
                                      <Save className="h-3 w-3 mr-1" />
                                      Add Element
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setElementForm({ levelId: '', elementId: '', name: '', description: '' })}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Existing Elements */}
                            {elements.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No elements defined for this level</p>
                            ) : (
                              <div className="space-y-4">
                                {elements.map((element) => {
                                  const isEditingElement = editingElementId === element.id;
                                  const indicators = Array.isArray(element.performanceIndicators) ? element.performanceIndicators : [];
                                  const isAddingIndicator = indicatorForm.elementId === element.id && !indicatorForm.indicatorId;
                                  
                                  return (
                                    <div key={element.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                      {/* Element Header */}
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          {isEditingElement ? (
                                            <div className="space-y-3">
                                              <div>
                                                <Label>Element Name *</Label>
                                                <Input
                                                  value={elementForm.name}
                                                  onChange={(e) => setElementForm(prev => ({ ...prev, name: e.target.value }))}
                                                  placeholder="Enter element name"
                                                />
                                              </div>
                                              <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleEditElement(element, level.id)}>
                                                  <Save className="h-3 w-3 mr-1" />
                                                  Submit
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => {
                                                  setEditingElementId(null);
                                                  setElementForm({ levelId: '', elementId: '', name: '', description: '' });
                                                }}>
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              <p className="font-semibold text-gray-900">{element.name}</p>
                                            </div>
                                          )}
                                        </div>
                                        {!isEditingElement && (
                                          <div className="flex gap-2 ml-4">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setEditingElementId(element.id);
                                                setElementForm({
                                                  levelId: level.id,
                                                  elementId: element.id,
                                                  name: element.name,
                                                  description: element.description || ''
                                                });
                                              }}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDeleteElement(element)}
                                            >
                                              <Trash2 className="h-3 w-3 text-red-600" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Performance Indicators for this Element */}
                                      {!isEditingElement && (
                                        <div className="mt-3">
                                          {/* Add Indicator Button - Directly under element */}
                                          <div className="mb-3">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setIndicatorForm({ elementId: element.id, indicatorId: '', action: '' });
                                              }}
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              Add Indicator
                                            </Button>
                                          </div>

                                          {/* Add New Indicator */}
                                          {isAddingIndicator && (
                                            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                              <Label className="text-xs font-semibold mb-2 block">New Indicator</Label>
                                              <div className="flex gap-2">
                                                <Input
                                                  value={indicatorForm.action}
                                                  onChange={(e) => setIndicatorForm(prev => ({ ...prev, action: e.target.value }))}
                                                  placeholder="Enter indicator action"
                                                  className="flex-1"
                                                />
                                                <Button size="sm" onClick={() => handleAddIndicator(element.id)}>
                                                  <Save className="h-3 w-3 mr-1" />
                                                  Add
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setIndicatorForm({ elementId: '', indicatorId: '', action: '' })}>
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Existing Indicators */}
                                          {indicators.length > 0 && (
                                            <div className="space-y-2">
                                              <Label className="text-xs font-semibold text-gray-700 block mb-2">
                                                Performance Indicators ({indicators.length})
                                              </Label>
                                              {indicators.map((indicator) => {
                                              const isEditingIndicator = editingIndicatorId === indicator.id;
                                              
                                              return (
                                                <div key={indicator.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                                                  {isEditingIndicator ? (
                                                    <>
                                                      <Input
                                                        value={indicatorForm.action}
                                                        onChange={(e) => setIndicatorForm(prev => ({ ...prev, action: e.target.value }))}
                                                        className="flex-1"
                                                      />
                                                      <Button size="sm" onClick={() => handleEditIndicator(indicator, element.id)}>
                                                        <Save className="h-3 w-3" />
                                                      </Button>
                                                      <Button size="sm" variant="outline" onClick={() => {
                                                        setEditingIndicatorId(null);
                                                        setIndicatorForm({ elementId: '', indicatorId: '', action: '' });
                                                      }}>
                                                        Cancel
                                                      </Button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <span className="text-orange-500">▸</span>
                                                      <span className="flex-1 text-sm text-gray-700">{indicator.action || indicator}</span>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                          setEditingIndicatorId(indicator.id);
                                                          setIndicatorForm({
                                                            elementId: element.id,
                                                            indicatorId: indicator.id,
                                                            action: indicator.action || indicator
                                                          });
                                                        }}
                                                      >
                                                        <Edit className="h-3 w-3" />
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteIndicator(indicator)}
                                                      >
                                                        <Trash2 className="h-3 w-3 text-red-600" />
                                                      </Button>
                                                    </>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            </div>
                                          )}
                                          {indicators.length === 0 && !isAddingIndicator && (
                                            <p className="text-xs text-gray-500 italic">No indicators defined</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {/* Level Indicators */}
                          <div className="border-t pt-4 mt-4">
                            <Label className="text-sm font-semibold mb-2 block">Level Indicators</Label>
                            {isEditing ? (
                              <div className="space-y-2">
                                {levelForm.indicators.map((ind, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Input
                                      value={ind}
                                      onChange={(e) => {
                                        const newIndicators = [...levelForm.indicators];
                                        newIndicators[idx] = e.target.value;
                                        setLevelForm(prev => ({ ...prev, indicators: newIndicators }));
                                      }}
                                      placeholder="Indicator"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newIndicators = levelForm.indicators.filter((_, i) => i !== idx);
                                        setLevelForm(prev => ({ ...prev, indicators: newIndicators }));
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLevelForm(prev => ({ ...prev, indicators: [...prev.indicators, ''] }))}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Indicator
                                </Button>
                                <div className="flex gap-2 mt-2">
                                  <Button size="sm" onClick={() => handleSaveLevelIndicators(level)}>
                                    <Save className="h-3 w-3 mr-1" />
                                    Submit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setEditingLevelId(null);
                                    setLevelForm(prev => ({
                                      ...prev,
                                      indicators: Array.isArray(level.indicators) ? [...level.indicators] : []
                                    }));
                                  }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {Array.isArray(level.indicators) && level.indicators.length > 0 ? (
                                  <ul className="space-y-1 mb-2">
                                    {level.indicators.map((ind, idx) => (
                                      <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                        <span className="text-green-600">•</span>
                                        <span>{ind}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No indicators defined</p>
                                )}
                                <Button size="sm" variant="outline" onClick={() => {
                                  setEditingLevelId(level.id);
                                  setLevelForm(prev => ({
                                    ...prev,
                                    levelId: level.id,
                                    indicators: Array.isArray(level.indicators) ? [...level.indicators] : []
                                  }));
                                }}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit Indicators
                                </Button>
                              </div>
                            )}
                          </div>
                      </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCompetencyClinic;

