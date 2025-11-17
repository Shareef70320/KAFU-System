import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';
import api from '../lib/api';
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
  Check
} from 'lucide-react';

const AddCompetency = () => {
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
    description: '',
    relatedDivision: '',
    relatedDocuments: [],
    isActive: true
  });

  // Initialize with all 4 required levels
  const [levels, setLevels] = useState([
    { id: 'temp-basic', level: 'BASIC', title: 'BASIC Level', description: '', indicators: [] },
    { id: 'temp-intermediate', level: 'INTERMEDIATE', title: 'INTERMEDIATE Level', description: '', indicators: [] },
    { id: 'temp-advanced', level: 'ADVANCED', title: 'ADVANCED Level', description: '', indicators: [] },
    { id: 'temp-mastery', level: 'MASTERY', title: 'MASTERY Level', description: '', indicators: [] }
  ]);
  const [elements, setElements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allFamilies, setAllFamilies] = useState([]);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [elementForm, setElementForm] = useState({ name: '', description: '' });
  const [allTypes] = useState([
    'TECHNICAL',
    'NON_TECHNICAL'
  ]);

  // Fetch all competencies once to derive families list (for code generation)
  const { data: allComps } = useQuery({
    queryKey: ['competencies-for-edit'],
    queryFn: async () => {
      const res = await api.get('/competencies', { params: { page: 1, limit: 1000 } });
      return res.data?.competencies || [];
    }
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

  // Function to generate suggested competency code
  const generateSuggestedCode = useCallback((type, family, competenciesList) => {
    try {
      // Get type prefix (first 3-4 letters)
      const typePrefix = type.substring(0, 4).toUpperCase();
      
      // Get family prefix (first 3-4 letters, remove spaces/special chars)
      const familyPrefix = family.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Find the next sequence number for this type-family combination
      const existingCodes = competenciesList
        .filter(c => c.code && c.code.startsWith(`${typePrefix}-${familyPrefix}-`))
        .map(c => {
          const parts = c.code.split('-');
          const seq = parseInt(parts[parts.length - 1]);
          return isNaN(seq) ? 0 : seq;
        });
      
      const nextSeq = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
      const suggested = `${typePrefix}-${familyPrefix}-${nextSeq.toString().padStart(3, '0')}`;
      
      setFormData(prev => ({ ...prev, code: suggested }));
    } catch (error) {
      console.error('Error generating code:', error);
    }
  }, []);

  // Auto-generate code when type and family are both entered
  useEffect(() => {
    if (formData.type && formData.family && allComps && allComps.length > 0) {
      // Only auto-generate if code is empty or was previously auto-generated
      // This allows users to manually edit the code without it being overwritten
      const currentCode = formData.code || '';
      if (!currentCode || currentCode.match(/^[A-Z]{4}-[A-Z0-9]{4}-\d{3}$/)) {
        generateSuggestedCode(formData.type, formData.family, allComps);
      }
    } else {
      if (!formData.type || !formData.family) {
        setFormData(prev => ({ ...prev, code: '' }));
      }
    }
  }, [formData.type, formData.family, allComps, generateSuggestedCode]);

  // Create competency mutation
  const createCompetencyMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/competencies', data);
      return response.data;
    },
    onSuccess: async (newCompetency) => {
      queryClient.invalidateQueries(['competencies']);
      queryClient.invalidateQueries(['competencies-for-edit']);
      
      // Add elements if any
      if (elements.length > 0) {
        try {
          const elementsData = elements.map(el => ({
            name: el.name.trim(),
            description: el.description?.trim() || null
          }));
          
          await api.post(`/competencies/${newCompetency.id}/elements/bulk`, { elements: elementsData });
        } catch (error) {
          console.error('Error adding elements:', error);
          toast({
            title: 'Warning',
            description: 'Competency created but some elements could not be added',
            variant: 'default'
          });
        }
      }

      toast({
        title: 'Success',
        description: 'Competency created successfully!',
        variant: 'default'
      });
      
      // Navigate to edit page to allow adding documents and more elements
      navigate(`/competencies/edit/${newCompetency.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create competency',
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

  // Element management (local state only, will be added after competency creation)
  const handleAddElement = () => {
    if (!elementForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Element name is required',
        variant: 'destructive'
      });
      return;
    }
    const newElement = {
      id: `temp-${Date.now()}`,
      name: elementForm.name.trim(),
      description: elementForm.description?.trim() || null,
      isActive: true
    };
    setElements(prev => [...prev, newElement]);
    setElementForm({ name: '', description: '' });
    setShowAddElementModal(false);
  };

  const handleEditElement = (element) => {
    setEditingElement(element);
    setElementForm({ name: element.name, description: element.description || '' });
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
    setElements(prev => prev.map(el => 
      el.id === editingElement.id 
        ? { ...el, name: elementForm.name.trim(), description: elementForm.description?.trim() || null }
        : el
    ));
    setEditingElement(null);
    setElementForm({ name: '', description: '' });
    setShowAddElementModal(false);
  };

  const handleDeleteElement = (elementId) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
  };

  const handleBulkAddElements = () => {
    const elementsText = window.prompt('Enter element names, one per line:');
    if (!elementsText) return;
    
    const elementNames = elementsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (elementNames.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid element names provided',
        variant: 'destructive'
      });
      return;
    }

    const newElements = elementNames.map((name, index) => ({
      id: `temp-${Date.now()}-${index}`,
      name: name,
      description: null,
      isActive: true
    }));
    
    setElements(prev => [...prev, ...newElements]);
    toast({
      title: 'Success',
      description: `Added ${elementNames.length} elements to the list`,
      variant: 'default'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation
      if (!formData.name || !formData.type || !formData.family || !formData.definition) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields: Name, Type, Family, and Definition',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      const createData = {
        ...formData,
        code: formData.code && formData.code.trim() ? formData.code.trim() : undefined,
        levels: levels.map(level => ({
          level: level.level,
          title: `${level.level} Level`,
          description: level.description,
          indicators: level.indicators || []
        }))
      };

      await createCompetencyMutation.mutateAsync(createData);
    } catch (error) {
      console.error('Create error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Add New Competency</h1>
          <p className="text-gray-600 mt-2">Create a new competency in the framework</p>
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
                  <Label htmlFor="name">Competency Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter competency name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="code">Competency Code <span className="text-gray-500 text-xs">(Auto-generated)</span></Label>
                  <Input
                    id="code"
                    value={formData.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="Will be generated after selecting Type and Family"
                    className="font-mono"
                  />
                  {formData.type && formData.family && formData.code && (
                    <p className="text-xs text-gray-500 mt-1">Code auto-generated. You can edit if needed.</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="type">Type *</Label>
                  <select
                    id="type"
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-900"
                    value={formData.type || ''}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    required
                  >
                    {!formData.type && <option value="" disabled>Select Type</option>}
                    {allTypes.map(t => (
                      <option key={t} value={t}>{t === 'TECHNICAL' ? 'Technical' : 'Non Technical'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="family">Competency Family *</Label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="family"
                      className="loyverse-input mt-1 flex-1"
                      value={formData.family}
                      onChange={(e) => handleInputChange('family', e.target.value)}
                      required
                    >
                      <option value="">Select family</option>
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
                  {formData.family && !allFamilies.includes(formData.family) && (
                    <p className="text-xs text-amber-600 mt-1">Family not found in list. Please add it first.</p>
                  )}
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
                <Label htmlFor="definition">Definition *</Label>
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

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter additional description (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
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

          {/* Competency Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-orange-600" />
                  Competency Elements
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={handleBulkAddElements} 
                    variant="outline" 
                    size="sm"
                    title="Bulk add elements from list"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Bulk Add
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      setEditingElement(null);
                      setElementForm({ name: '', description: '' });
                      setShowAddElementModal(true);
                    }} 
                    variant="outline" 
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Element
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {elements.length === 0 ? (
                <p className="text-gray-500 text-sm">No elements added yet. Click "Add Element" to get started. Elements will be added after the competency is created.</p>
              ) : (
                <div className="space-y-3">
                  {elements.map((element) => (
                    <div 
                      key={element.id} 
                      className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{element.name}</h4>
                          {!element.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">Inactive</span>
                          )}
                        </div>
                        {element.description && (
                          <p className="text-sm text-gray-600">{element.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditElement(element)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteElement(element.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                Competency Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {levels.map((level, index) => (
                  <div key={level.id || index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div>
                          <Label htmlFor={`level-${index}`}>Level</Label>
                          <Input
                            id={`level-${index}`}
                            value={level.level}
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
                            {level.level}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <textarea
                        id={`description-${index}`}
                        value={level.description}
                        onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                        placeholder={`Enter description for ${level.level} level`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
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
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
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
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={editingElement ? handleUpdateElement : handleAddElement}
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
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Competency
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompetency;

