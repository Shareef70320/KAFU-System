import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
// Use native selects for Type/Family, keep Select for level dropdown
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
import { getLevelDisplayLabel, getLevelDisplayName } from '../utils/competencyLevels';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  BookOpen, 
  Building2, 
  Award,
  Target,
  Edit,
  X,
  Check,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const EditCompetency = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'TECHNICAL',
    family: '',
    definition: '',
    relatedDivision: '',
    relatedDocuments: [],
    isActive: true
  });

  const [levels, setLevels] = useState([]);
  const [elementsByLevel, setElementsByLevel] = useState({}); // { levelId: [elements] }
  const [isLoading, setIsLoading] = useState(false);
  const [allFamilies, setAllFamilies] = useState([]);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [selectedLevelForElement, setSelectedLevelForElement] = useState(null);
  const [editingElement, setEditingElement] = useState(null);
  const [elementForm, setElementForm] = useState({ name: '', description: '' });
  const [expandedElements, setExpandedElements] = useState({}); // { elementId: true/false }
  const [showAddIndicatorModal, setShowAddIndicatorModal] = useState(false);
  const [selectedElementForIndicator, setSelectedElementForIndicator] = useState(null);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [indicatorForm, setIndicatorForm] = useState({ action: '' });
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [selectedLevelForBulkAdd, setSelectedLevelForBulkAdd] = useState(null);
  const [bulkAddText, setBulkAddText] = useState('');
  const [isProcessingBulkAdd, setIsProcessingBulkAdd] = useState(false);
  const [showBulkAddAllModal, setShowBulkAddAllModal] = useState(false);
  const [bulkAddAllText, setBulkAddAllText] = useState('');
  const [isProcessingBulkAddAll, setIsProcessingBulkAddAll] = useState(false);
  const [allTypes, setAllTypes] = useState([
    'TECHNICAL',
    'NON_TECHNICAL'
  ]);

  // Fetch competency data
  const { data: competency, isLoading: competencyLoading } = useQuery({
    queryKey: ['competency', id],
    queryFn: async () => {
      const response = await api.get(`/competencies/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  // Fetch competency families from API
  const { data: familiesData } = useQuery({
    queryKey: ['competency-families'],
    queryFn: async () => {
      const res = await api.get('/competency-families');
      return res.data || [];
    }
  });

  useEffect(() => {
    if (familiesData && Array.isArray(familiesData)) {
      // Filter families by selected type and active status
      const fams = familiesData
        .filter(f => {
          const isActive = f.isActive !== false;
          const matchesType = !formData.type || !f.type || f.type === formData.type;
          return isActive && matchesType;
        })
        .map(f => f.name)
        .sort();
      setAllFamilies(fams);
    }
  }, [familiesData, formData.type]);

  // Update form data when competency loads
  useEffect(() => {
    if (competency) {
      const normType = (competency.type || 'TECHNICAL').toString();
      const normFamily = (competency.family || '').toString().trim();
      const normDivision = (competency.relatedDivision || '').toString().trim();
      setFormData({
        code: competency.code || '',
        name: competency.name || '',
        type: normType,
        family: normFamily,
        definition: competency.definition || '',
        relatedDivision: normDivision,
        relatedDocuments: Array.isArray(competency.relatedDocuments) ? competency.relatedDocuments : [],
        isActive: competency.isActive !== false
      });
      
      // Ensure all 4 levels exist, merge with existing data
      const requiredLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];
      const existingLevels = competency.levels || [];
      const mergedLevels = requiredLevels.map(levelType => {
        const existing = existingLevels.find(l => l.level === levelType);
        return existing || {
          id: `temp-${levelType.toLowerCase()}`,
          level: levelType,
          title: getLevelDisplayLabel(levelType),
          description: '',
          indicators: []
        };
      });
      setLevels(mergedLevels);
      
      // Group elements by level (elements are nested under levels)
      const grouped = {};
      mergedLevels.forEach(level => {
        // Elements are nested under levels.levels[].elements
        const levelData = competency.levels?.find(l => l.id === level.id);
        grouped[level.id] = levelData?.elements || [];
      });
      setElementsByLevel(grouped);
    }
  }, [competency]);

  // Update competency mutation
  const updateCompetencyMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/competencies/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competencies']);
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Competency updated successfully!',
        variant: 'default'
      });
      navigate('/competencies');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update competency',
        variant: 'destructive'
      });
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLevelChange = (levelIndex, field, value) => {
    setLevels(prev => prev.map((level, index) => 
      index === levelIndex ? { ...level, [field]: value } : level
    ));
  };

  // Levels are fixed - always 4 levels: BASIC, INTERMEDIATE, ADVANCED, MASTERY

  // Document upload state
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('OTHER');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docDescription, setDocDescription] = useState('');
  const [docFile, setDocFile] = useState(null);

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    const form = new FormData();
    form.append('document', docFile);
    form.append('title', docTitle || docFile.name);
    form.append('description', docDescription || '');
    form.append('documentType', docType);
    form.append('version', docVersion || '1.0');
    try {
      await api.post(`/competencies/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ title: 'Uploaded', description: 'Document uploaded successfully' });
      // refresh competency
      queryClient.invalidateQueries(['competency', id]);
      setDocTitle(''); setDocType('OTHER'); setDocVersion('1.0'); setDocDescription(''); setDocFile(null);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.response?.data?.message || 'Error uploading document', variant: 'destructive' });
    }
  };

  // Levels cannot be removed - always 4 levels required

  // Element mutations
  const createElementMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/competencies/${id}/elements`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Element added successfully!',
        variant: 'default'
      });
      setShowAddElementModal(false);
      setElementForm({ name: '', description: '' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add element',
        variant: 'destructive'
      });
    }
  });

  const updateElementMutation = useMutation({
    mutationFn: async ({ elementId, data }) => {
      const response = await api.put(`/competencies/${id}/elements/${elementId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Element updated successfully!',
        variant: 'default'
      });
      setEditingElement(null);
      setElementForm({ name: '', description: '' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update element',
        variant: 'destructive'
      });
    }
  });

  const deleteElementMutation = useMutation({
    mutationFn: async (elementId) => {
      const response = await api.delete(`/competencies/${id}/elements/${elementId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Element deleted successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete element',
        variant: 'destructive'
      });
    }
  });

  // Performance Indicator mutations
  const createIndicatorMutation = useMutation({
    mutationFn: async ({ elementId, data }) => {
      const response = await api.post(`/competencies/${id}/elements/${elementId}/indicators`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Performance indicator added successfully!',
        variant: 'default'
      });
      setShowAddIndicatorModal(false);
      setIndicatorForm({ action: '' });
      setSelectedElementForIndicator(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add performance indicator',
        variant: 'destructive'
      });
    }
  });

  const updateIndicatorMutation = useMutation({
    mutationFn: async ({ elementId, indicatorId, data }) => {
      const response = await api.put(`/competencies/${id}/elements/${elementId}/indicators/${indicatorId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Performance indicator updated successfully!',
        variant: 'default'
      });
      setEditingIndicator(null);
      setIndicatorForm({ action: '' });
      setShowAddIndicatorModal(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update performance indicator',
        variant: 'destructive'
      });
    }
  });

  const deleteIndicatorMutation = useMutation({
    mutationFn: async ({ elementId, indicatorId }) => {
      const response = await api.delete(`/competencies/${id}/elements/${elementId}/indicators/${indicatorId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency', id]);
      toast({
        title: 'Success',
        description: 'Performance indicator deleted successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete performance indicator',
        variant: 'destructive'
      });
    }
  });

  const handleAddElement = () => {
    if (!elementForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Element name is required',
        variant: 'destructive'
      });
      return;
    }
    if (!selectedLevelForElement) {
      toast({
        title: 'Error',
        description: 'Please select a competency level for this element',
        variant: 'destructive'
      });
      return;
    }
    createElementMutation.mutate({
      name: elementForm.name.trim(),
      description: elementForm.description.trim() || null,
      levelId: selectedLevelForElement
    });
  };

  const handleEditElement = (element) => {
    setEditingElement(element);
    setElementForm({ name: element.name, description: element.description || '' });
    setSelectedLevelForElement(element.competencyLevelId);
    setShowAddElementModal(true);
  };

  const handleUpdateElement = () => {
    if (!elementForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Element name is required',
        variant: 'destructive'
      });
      return;
    }
    if (!selectedLevelForElement) {
      toast({
        title: 'Error',
        description: 'Please select a competency level for this element',
        variant: 'destructive'
      });
      return;
    }
    updateElementMutation.mutate({
      elementId: editingElement.id,
      data: {
        name: elementForm.name.trim(),
        description: elementForm.description.trim() || null,
        levelId: selectedLevelForElement
      }
    });
  };

  const handleDeleteElement = (elementId) => {
    if (window.confirm('Are you sure you want to delete this element?')) {
      deleteElementMutation.mutate(elementId);
    }
  };

  const handleAddIndicator = (element) => {
    setSelectedElementForIndicator(element);
    setEditingIndicator(null);
    setIndicatorForm({ action: '' });
    setShowAddIndicatorModal(true);
  };

  const handleEditIndicator = (element, indicator) => {
    setSelectedElementForIndicator(element);
    setEditingIndicator(indicator);
    setIndicatorForm({ action: indicator.action });
    setShowAddIndicatorModal(true);
  };

  const handleSaveIndicator = () => {
    if (!indicatorForm.action.trim()) {
      toast({
        title: 'Error',
        description: 'Action is required',
        variant: 'destructive'
      });
      return;
    }
    if (editingIndicator) {
      updateIndicatorMutation.mutate({
        elementId: selectedElementForIndicator.id,
        indicatorId: editingIndicator.id,
        data: {
          action: indicatorForm.action.trim()
        }
      });
    } else {
      createIndicatorMutation.mutate({
        elementId: selectedElementForIndicator.id,
        data: {
          action: indicatorForm.action.trim()
        }
      });
    }
  };

  const handleDeleteIndicator = (element, indicator) => {
    if (window.confirm('Are you sure you want to delete this performance indicator?')) {
      deleteIndicatorMutation.mutate({
        elementId: element.id,
        indicatorId: indicator.id
      });
    }
  };

  const toggleElementExpansion = (elementId) => {
    setExpandedElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  };

  const parseBulkAddText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const elements = [];
    let currentElement = null;

    for (const line of lines) {
      // Check if line starts with a number (element)
      const elementMatch = line.match(/^\d+\.\s*(.+)$/);
      if (elementMatch) {
        // Save previous element if exists
        if (currentElement) {
          elements.push(currentElement);
        }
        // Start new element
        currentElement = {
          name: elementMatch[1].trim(),
          indicators: []
        };
      } else if (currentElement) {
        // Check if line starts with bullet (indicator)
        const indicatorMatch = line.match(/^[-•*]\s*(.+)$/);
        if (indicatorMatch) {
          currentElement.indicators.push(indicatorMatch[1].trim());
        }
      }
    }

    // Don't forget the last element
    if (currentElement) {
      elements.push(currentElement);
    }

    return elements;
  };

  const handleBulkAddElements = (levelId) => {
    if (!levelId) {
      toast({
        title: 'Error',
        description: 'Please select a level first',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedLevelForBulkAdd(levelId);
    setBulkAddText('');
    setShowBulkAddModal(true);
  };

  const handleProcessBulkAdd = async () => {
    if (!bulkAddText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter elements and indicators',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessingBulkAdd(true);

    try {
      const parsedData = parseBulkAddText(bulkAddText);
      
      if (parsedData.length === 0) {
        toast({
          title: 'Error',
          description: 'No valid elements found. Format: 1. Element Name\n   - Indicator 1',
          variant: 'destructive'
        });
        setIsProcessingBulkAdd(false);
        return;
      }

      // Create elements first
      const elementsData = parsedData.map(el => ({ name: el.name }));
      const elementsResponse = await api.post(`/competencies/${id}/elements/bulk`, { 
        elements: elementsData, 
        levelId: selectedLevelForBulkAdd 
      });

      // Get created elements (they should be in order)
      const createdElements = elementsResponse.data.elements || [];
      
      // Create indicators for each element
      let totalIndicators = 0;
      for (let i = 0; i < parsedData.length && i < createdElements.length; i++) {
        const element = createdElements[i];
        const parsedElement = parsedData[i];
        
        if (parsedElement.indicators && parsedElement.indicators.length > 0) {
          // Create indicators for this element
          for (const indicatorAction of parsedElement.indicators) {
            try {
              await api.post(`/competencies/${id}/elements/${element.id}/indicators`, {
                action: indicatorAction
              });
              totalIndicators++;
            } catch (error) {
              console.error(`Failed to create indicator for element ${element.name}:`, error);
            }
          }
        }
      }

      // Refresh data
      queryClient.invalidateQueries(['competency', id]);
      
      toast({
        title: 'Success',
        description: `Added ${parsedData.length} elements and ${totalIndicators} performance indicators successfully!`,
        variant: 'default'
      });

      setShowBulkAddModal(false);
      setBulkAddText('');
      setSelectedLevelForBulkAdd(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add elements and indicators',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingBulkAdd(false);
    }
  };

  // Parse bulk add for whole competency: Level, Element (numbered), Indicators (bullets or sentences ending with '.')
  const parseBulkAddAllText = (text) => {
    const lines = text.split('\n').map(line => line.trimEnd()).filter(line => line.length > 0);
    const result = {
      BASIC: [],
      INTERMEDIATE: [],
      ADVANCED: [],
      MASTERY: []
    };

    // Level header can be like:
    // "Aware:", "Knowledge Level – Performance Indicators", "🔹 Basic Level – Performance Indicators (Awareness)"
    // We only treat a line as a level header if it STARTS with the level word (optionally after bullets/emojis)
    const levelHeaderRegex = /^(?:[-•*]\s*)?(?:🔹\s*)?(basic|intermediate|advanced|mastery|aware|knowledge|skilled)\b/i;
    let currentLevelCode = null;
    let currentElement = null;

    const mapToLevelCode = (headerWord) => {
      const h = headerWord.toLowerCase();
      if (h.startsWith('basic') || h.startsWith('aware')) return 'BASIC';
      if (h.startsWith('intermediate') || h.startsWith('knowledge')) return 'INTERMEDIATE';
      if (h.startsWith('advanced') || h.startsWith('skilled')) return 'ADVANCED';
      if (h.startsWith('mastery')) return 'MASTERY';
      return null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Level header: look for level word at the start of the line
      const levelMatch = line.match(levelHeaderRegex);
      if (levelMatch) {
        // Push last element if exists
        if (currentLevelCode && currentElement) {
          result[currentLevelCode].push(currentElement);
          currentElement = null;
        }
        currentLevelCode = mapToLevelCode(levelMatch[1]) || null;
        continue;
      }

      if (!currentLevelCode) {
        // Ignore lines before any level header
        continue;
      }

      // Element line: starts with number.
      const elementMatch = line.match(/^\d+\.\s*(.+)$/);
      if (elementMatch) {
        // Save previous element
        if (currentElement) {
          result[currentLevelCode].push(currentElement);
        }
        currentElement = {
          name: elementMatch[1].trim(),
          indicators: []
        };
        continue;
      }

      // Indicator line under current element
      if (currentElement) {
        // Accept either bullet-prefixed or plain lines (optionally ending with '.')
        const bulletMatch = line.match(/^[-•*]\s*(.+)$/);
        if (bulletMatch) {
          const text = bulletMatch[1].trim();
          if (text) currentElement.indicators.push(text);
        } else {
          // Treat the entire line as a single indicator
          let text = line.trim();
          if (!text) continue;
          // Ensure it ends with a full stop for consistency
          if (!text.endsWith('.')) {
            text = text + '.';
          }
          currentElement.indicators.push(text);
        }
      }
    }

    // Push last element
    if (currentLevelCode && currentElement) {
      result[currentLevelCode].push(currentElement);
    }

    return result;
  };

  const handleBulkAddAll = () => {
    setBulkAddAllText('');
    setShowBulkAddAllModal(true);
  };

  const handleProcessBulkAddAll = async () => {
    if (!bulkAddAllText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter levels, elements, and indicators',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessingBulkAddAll(true);

    try {
      const parsed = parseBulkAddAllText(bulkAddAllText);

      // Build map from level code to actual level id in this competency
      // IMPORTANT: use backend levels (competency.levels) to avoid using temporary client-only IDs
      const levelIdByCode = {};
      if (competency && Array.isArray(competency.levels)) {
        competency.levels.forEach((lvl) => {
          if (lvl.level && !levelIdByCode[lvl.level]) {
            levelIdByCode[lvl.level] = lvl.id;
          }
        });
      }

      let totalElements = 0;
      let totalIndicators = 0;

      // For each level code, create elements and indicators SEQUENTIALLY
      for (const code of ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY']) {
        const items = parsed[code] || [];
        if (!items.length) continue;

        const levelId = levelIdByCode[code];
        if (!levelId) continue;

        for (const item of items) {
          // Create element and get its real ID
          const elementResp = await api.post(`/competencies/${id}/elements`, {
            name: item.name,
            levelId
          });
          const element = elementResp.data;
          totalElements++;

          // Create indicators for this element
          if (item.indicators && item.indicators.length > 0) {
            for (const action of item.indicators) {
              try {
                await api.post(`/competencies/${id}/elements/${element.id}/indicators`, {
                  action
                });
                totalIndicators++;
              } catch (err) {
                console.error(`Failed to create indicator for ${element.name}:`, err);
              }
            }
          }
        }
      }

      // Refresh competency
      queryClient.invalidateQueries(['competency', id]);

      toast({
        title: 'Success',
        description: `Added ${totalElements} elements and ${totalIndicators} performance indicators across all levels.`,
        variant: 'default'
      });

      setShowBulkAddAllModal(false);
      setBulkAddAllText('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to bulk add elements and indicators',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingBulkAddAll(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For now, we only update the core competency fields (code, name, type, family, definition, etc.)
      // Levels and their elements/indicators are managed via dedicated endpoints and should not be
      // recreated on every save, otherwise elements & indicators get deleted by cascade.
      await updateCompetencyMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (competencyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading competency...</p>
        </div>
      </div>
    );
  }

  if (!competency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Competency not found</p>
          <Button onClick={() => navigate('/competencies')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competencies
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/competencies')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Competencies
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Competency</h1>
          <p className="text-gray-600 mt-2">Modify competency details and levels</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Competency Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter competency name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Competency Code <span className="text-gray-500 text-xs">(Unique)</span></Label>
                  <Input
                    id="code"
                    value={formData.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="e.g., TECH-ICT-001"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier for this competency</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-900"
                    value={formData.type || ''}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                  >
                    {!formData.type && <option value="" disabled>Select Type</option>}
                    {formData.type && !allTypes.includes(formData.type) && (
                      <option value={formData.type}>{String(formData.type).replaceAll('_',' ')}</option>
                    )}
                    {allTypes.map(t => (
                      <option key={t} value={t}>{t === 'TECHNICAL' ? 'Technical' : 'Non Technical'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="family">Competency Family</Label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="family"
                      className="loyverse-input mt-1 flex-1"
                      value={formData.family}
                      onChange={(e) => handleInputChange('family', e.target.value)}
                    >
                      {/* Ensure current value is selectable even if not in list */}
                      {formData.family && !allFamilies.includes(formData.family) && (
                        <option value={formData.family}>{formData.family}</option>
                      )}
                      {allFamilies.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/competency-families')}
                      title="Manage families"
                    >
                      <Building2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="relatedDivision">Related Division</Label>
                  <Input
                    id="relatedDivision"
                    value={formData.relatedDivision || ''}
                    onChange={(e) => handleInputChange('relatedDivision', e.target.value)}
                    placeholder="Select or type division"
                  />
                </div>
              </div>
              

              <div>
                <Label htmlFor="definition">Definition</Label>
                <textarea
                  id="definition"
                  value={formData.definition}
                  onChange={(e) => handleInputChange('definition', e.target.value)}
                  placeholder="Enter competency definition"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                />
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="relatedDocuments">Related Documents (comma-separated URLs)</Label>
                <Input
                  id="relatedDocuments"
                  value={(formData.relatedDocuments || []).join(', ')}
                  onChange={(e) => handleInputChange('relatedDocuments', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="https://doc1, https://doc2"
                />
              </div>
            </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </CardContent>
          </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-purple-600" />
              Related Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {competency?.documents?.length > 0 && (
              <div className="space-y-2">
                {competency.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between border rounded p-2">
                    <div className="text-sm truncate mr-2">
                      <span className="font-medium">{doc.title}</span>
                      <span className="text-gray-500 ml-2">{doc.documentType} • v{doc.version}</span>
                    </div>
                    <a href={`/${doc.filePath}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">View</a>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="docTitle">Title</Label>
                <Input id="docTitle" value={docTitle} onChange={e=>setDocTitle(e.target.value)} placeholder="Document title" />
              </div>
              <div>
                <Label htmlFor="docType">Type</Label>
                <select id="docType" className="loyverse-input mt-1 w-full" value={docType} onChange={e=>setDocType(e.target.value)}>
                  <option value="SOP">SOP</option>
                  <option value="MANUAL">MANUAL</option>
                  <option value="GUIDELINE">GUIDELINE</option>
                  <option value="PROCEDURE">PROCEDURE</option>
                  <option value="REFERENCE">REFERENCE</option>
                  <option value="TRAINING_MATERIAL">TRAINING_MATERIAL</option>
                  <option value="POLICY">POLICY</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <Label htmlFor="docVersion">Version</Label>
                <Input id="docVersion" value={docVersion} onChange={e=>setDocVersion(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="docFile">File</Label>
                <Input id="docFile" type="file" onChange={e=>setDocFile(e.target.files?.[0]||null)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="docDescription">Description</Label>
                <Input id="docDescription" value={docDescription} onChange={e=>setDocDescription(e.target.value)} placeholder="Short description (optional)" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={!docFile}>Upload Document</Button>
              </div>
            </form>
          </CardContent>
        </Card>

          {/* Competency Levels with Elements */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Competency Levels & Elements
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBulkAddAll}
                  title="Bulk add elements and indicators for all levels"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Bulk Add (All Levels)
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {levels.map((level, index) => {
                  const levelElements = elementsByLevel[level.id] || [];
                  return (
                    <div key={level.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <Label htmlFor={`level-${index}`}>Level</Label>
                          <Input
                            id={`level-${index}`}
                            value={getLevelDisplayName(level.level)}
                            disabled
                            className="font-mono bg-gray-50 cursor-not-allowed"
                          />
                          </div>
                          <div className="flex items-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              level.level === 'BASIC' ? 'bg-gray-100 text-gray-800' :
                              level.level === 'INTERMEDIATE' ? 'bg-blue-100 text-blue-800' :
                              level.level === 'ADVANCED' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                            {getLevelDisplayName(level.level)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Label htmlFor={`description-${index}`}>Description</Label>
                      <textarea
                        id={`description-${index}`}
                        value={level.description}
                        onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                        placeholder={`Enter description for ${getLevelDisplayName(level.level)} level`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                      </div>

                      {/* Elements for this level */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-orange-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Elements ({levelElements.length})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              onClick={() => handleBulkAddElements(level.id)} 
                              variant="outline" 
                              size="sm"
                              title="Bulk add elements for this level"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Bulk Add
                            </Button>
                            <Button 
                              type="button" 
                              onClick={() => {
                                setEditingElement(null);
                                setElementForm({ name: '', description: '' });
                                setSelectedLevelForElement(level.id);
                                setShowAddElementModal(true);
                              }} 
                              variant="outline" 
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Element
                            </Button>
                          </div>
                        </div>
                        {levelElements.length === 0 ? (
                          <p className="text-gray-500 text-sm italic">No elements added for this level yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {levelElements.map((element) => {
                              const isExpanded = expandedElements[element.id];
                              const indicators = element.performanceIndicators || [];
                              return (
                                <div 
                                  key={element.id} 
                                  className="border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start justify-between p-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <button
                                          type="button"
                                          onClick={() => toggleElementExpansion(element.id)}
                                          className="text-gray-400 hover:text-gray-600"
                                        >
                                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </button>
                                        <h5 className="text-sm font-medium text-gray-900">{element.name}</h5>
                                        {!element.isActive && (
                                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Inactive</span>
                                        )}
                                        {indicators.length > 0 && (
                                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                            {indicators.length} indicator{indicators.length !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                      {element.description && (
                                        <p className="text-xs text-gray-600 ml-6">{element.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAddIndicator(element)}
                                        className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700"
                                        title="Add Performance Indicator"
                                      >
                                        <Target className="h-3 w-3 mr-1" />
                                        Add Indicator
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditElement(element)}
                                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteElement(element.id)}
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Performance Indicators Section */}
                                  {isExpanded && (
                                    <div className="px-2 pb-2 border-t border-gray-100 mt-2 pt-2">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center">
                                          <Target className="h-3 w-3 mr-1 text-purple-600" />
                                          <span className="text-xs font-medium text-gray-700">
                                            Performance Indicators ({indicators.length})
                                          </span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleAddIndicator(element)}
                                          className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700"
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add Indicator
                                        </Button>
                                      </div>
                                      {indicators.length === 0 ? (
                                        <p className="text-gray-400 text-xs italic ml-4">No performance indicators added yet.</p>
                                      ) : (
                                        <div className="space-y-1 ml-4">
                                          {indicators.map((indicator) => (
                                            <div 
                                              key={indicator.id}
                                              className="flex items-start justify-between p-1.5 bg-purple-50 rounded border border-purple-100"
                                            >
                                              <div className="flex items-start gap-2 flex-1">
                                                <Check className="h-3 w-3 mt-0.5 text-purple-600 flex-shrink-0" />
                                                <span className="text-xs text-gray-700">{indicator.action}</span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleEditIndicator(element, indicator)}
                                                  className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700"
                                                >
                                                  <Edit className="h-2.5 w-2.5" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDeleteIndicator(element, indicator)}
                                                  className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                                >
                                                  <Trash2 className="h-2.5 w-2.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Add/Edit Element Modal */}
          {showAddElementModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingElement ? 'Edit Element' : 'Add Element'}
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddElementModal(false);
                      setEditingElement(null);
                      setElementForm({ name: '', description: '' });
                      setSelectedLevelForElement(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="element-level">Competency Level *</Label>
                    <select
                      id="element-level"
                      value={selectedLevelForElement || ''}
                      onChange={(e) => setSelectedLevelForElement(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a level</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {getLevelDisplayName(level.level)} - {level.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="element-name">Element Name *</Label>
                    <Input
                      id="element-name"
                      value={elementForm.name}
                      onChange={(e) => setElementForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter element name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="element-description">Description (Optional)</Label>
                    <textarea
                      id="element-description"
                      value={elementForm.description}
                      onChange={(e) => setElementForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter element description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddElementModal(false);
                        setEditingElement(null);
                        setElementForm({ name: '', description: '' });
                        setSelectedLevelForElement(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={editingElement ? handleUpdateElement : handleAddElement}
                      disabled={createElementMutation.isLoading || updateElementMutation.isLoading}
                    >
                      {editingElement ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Update
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/competencies')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Bulk Add Elements Modal (single level) */}
        {showBulkAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Bulk Add Elements with Performance Indicators</h3>
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-add-text">Elements and Indicators</Label>
                    <textarea
                      id="bulk-add-text"
                      value={bulkAddText}
                      onChange={(e) => setBulkAddText(e.target.value)}
                      placeholder={`Format:
1. Element Name
   - Performance Indicator 1
   - Performance Indicator 2
2. Another Element
   - Indicator 1
   - Indicator 2`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={15}
                    />
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium mb-1">Format Instructions:</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Elements must start with a number followed by a dot (e.g., "1. Element Name")</li>
                      <li>Indicators must start with a bullet (-, •, or *) and be indented under their element</li>
                      <li>Each element can have multiple indicators</li>
                      <li>Example: <code className="bg-blue-100 px-1 rounded">1. Element Name\n   - Indicator 1</code></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBulkAddModal(false);
                    setBulkAddText('');
                    setSelectedLevelForBulkAdd(null);
                  }}
                  disabled={isProcessingBulkAdd}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleProcessBulkAdd}
                  disabled={isProcessingBulkAdd || !bulkAddText.trim()}
                >
                  {isProcessingBulkAdd ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Elements & Indicators
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Add for Whole Competency Modal */}
        {showBulkAddAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Bulk Add for Whole Competency</h3>
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-add-all-text">Levels, Elements, and Indicators</Label>
                    <textarea
                      id="bulk-add-all-text"
                      value={bulkAddAllText}
                      onChange={(e) => setBulkAddAllText(e.target.value)}
                      placeholder={`Format example:\n\nAware:\n1. Element Name\n   - Performance Indicator 1\n   - Performance Indicator 2\n\nKnowledge:\n1. Another Element\n   - Indicator 1\n\nSkilled:\n1. Skilled Element\n   - Indicator 1\n\nMastery:\n1. Mastery Element\n   - Indicator 1`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={18}
                    />
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium mb-1">Format Instructions:</p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>Start each section with the level name: Aware, Knowledge, Skilled, Mastery (or BASIC, INTERMEDIATE, ADVANCED, MASTERY)</li>
                      <li>Elements must start with a number and dot under the level (e.g., <code>1. Element Name</code>)</li>
                      <li>Indicators must start with a bullet (-, •, or *) and be under their element</li>
                      <li>Each level can have multiple elements; each element can have multiple indicators</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-top pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBulkAddAllModal(false);
                    setBulkAddAllText('');
                  }}
                  disabled={isProcessingBulkAddAll}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleProcessBulkAddAll}
                  disabled={isProcessingBulkAddAll || !bulkAddAllText.trim()}
                >
                  {isProcessingBulkAddAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add All Levels
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Performance Indicator Modal */}
        {showAddIndicatorModal && selectedElementForIndicator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingIndicator ? 'Edit' : 'Add'} Performance Indicator
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="indicator-action">Action/Task *</Label>
                  <textarea
                    id="indicator-action"
                    value={indicatorForm.action}
                    onChange={(e) => setIndicatorForm(prev => ({ ...prev, action: e.target.value }))}
                    placeholder="Enter the action or task that can be checked and measured"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For element: <strong>{selectedElementForIndicator.name}</strong>
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddIndicatorModal(false);
                      setEditingIndicator(null);
                      setIndicatorForm({ action: '' });
                      setSelectedElementForIndicator(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveIndicator}
                    disabled={createIndicatorMutation.isLoading || updateIndicatorMutation.isLoading}
                  >
                    {editingIndicator ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditCompetency;
