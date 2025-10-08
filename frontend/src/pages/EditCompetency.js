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
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  BookOpen, 
  Building2, 
  Award,
  Target
} from 'lucide-react';

const EditCompetency = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'TECHNICAL',
    family: '',
    definition: '',
    relatedDivision: '',
    relatedDocuments: [],
    isActive: true
  });

  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allFamilies, setAllFamilies] = useState([]);
  const [allTypes, setAllTypes] = useState([
    'TECHNICAL',
    'NON_TECHNICAL',
    'BEHAVIORAL',
    'LEADERSHIP',
    'FUNCTIONAL',
    'CERTIFICATION_AND_COMPLIANCE',
    'COMMERCIAL',
    'FINANCE_AND_PROCUREMENT',
    'FIRE',
    'HR_AND_ADMIN',
    'HSE',
    'ICT',
    'INTERNAL_AUDIT',
    'LEGAL_AND_REGULATORY',
    'MAINTENANCE',
    'MEDIA',
    'OPERATIONS',
    'QUALITY',
    'SECURITY',
    'TECHNICAL_SERVICES'
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

  // Fetch all competencies once to derive families list
  const { data: allComps } = useQuery({
    queryKey: ['competencies-for-edit'],
    queryFn: async () => {
      const res = await api.get('/competencies', { params: { page: 1, limit: 1000 } });
      return res.data?.competencies || [];
    }
  });

  useEffect(() => {
    if (allComps && Array.isArray(allComps)) {
      const fams = Array.from(new Set(allComps.map(c => c.family).filter(Boolean))).sort();
      setAllFamilies(fams);
    }
  }, [allComps]);

  // Update form data when competency loads
  useEffect(() => {
    if (competency) {
      const normType = (competency.type || 'TECHNICAL').toString();
      const normFamily = (competency.family || '').toString().trim();
      const normDivision = (competency.relatedDivision || '').toString().trim();
      setFormData({
        name: competency.name || '',
        type: normType,
        family: normFamily,
        definition: competency.definition || '',
        relatedDivision: normDivision,
        relatedDocuments: Array.isArray(competency.relatedDocuments) ? competency.relatedDocuments : [],
        isActive: competency.isActive !== false
      });
      setLevels(competency.levels || []);
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

  const addLevel = () => {
    const newLevel = {
      id: `temp-${Date.now()}`,
      level: 'BASIC',
      title: 'BASIC Level',
      description: '',
      indicators: []
    };
    setLevels(prev => [...prev, newLevel]);
  };

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

  const removeLevel = (levelIndex) => {
    setLevels(prev => prev.filter((_, index) => index !== levelIndex));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        ...formData,
        levels: levels.map(level => ({
          id: level.id,
          level: level.level,
          title: `${level.level} Level`,
          description: level.description,
          indicators: level.indicators || []
        }))
      };

      await updateCompetencyMutation.mutateAsync(updateData);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                      <option key={t} value={t}>{t.replaceAll('_',' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="family">Competency Family</Label>
                  <select
                    id="family"
                    className="loyverse-input mt-1 w-full"
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
                </div>
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
                <Label htmlFor="relatedDivision">Related Division</Label>
                <Input
                  id="relatedDivision"
                  value={formData.relatedDivision || ''}
                  onChange={(e) => handleInputChange('relatedDivision', e.target.value)}
                  placeholder="Select or type division"
                />
              </div>
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

          {/* Competency Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-600" />
                  Competency Levels
                </div>
                <Button type="button" onClick={addLevel} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
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
                          <Select
                            value={level.level}
                            onValueChange={(value) => handleLevelChange(index, 'level', value)}
                          >
                            <option value="BASIC">Basic</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="MASTERY">Mastery</option>
                          </Select>
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
                      {levels.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLevel(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <textarea
                        id={`description-${index}`}
                        value={level.description}
                        onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                        placeholder="Enter level description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
      </div>
    </div>
  );
};

export default EditCompetency;
