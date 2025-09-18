import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  Target, 
  Edit, 
  Save, 
  X, 
  Plus,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Shield,
  UserCheck,
  BarChart3
} from 'lucide-react';

const JobCriticality = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Icon mapping
  const iconMap = {
    Target,
    AlertTriangle,
    Shield,
    DollarSign,
    UserCheck,
    Users
  };

  // Fetch criteria from backend
  const { data: criteriaData, isLoading } = useQuery({
    queryKey: ['job-criticality-criteria'],
    queryFn: async () => {
      const response = await api.get('/job-criticality');
      return response.data.criteria;
    }
  });

  const criteria = criteriaData || [];

  // Update criteria mutation
  const updateCriteriaMutation = useMutation({
    mutationFn: async ({ id, definition, weight }) => {
      const response = await api.put(`/job-criticality/${id}`, {
        definition,
        weight
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job-criticality-criteria']);
      toast({
        title: 'Success',
        description: 'Criteria updated successfully!',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update criteria',
        variant: 'destructive'
      });
    }
  });

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleEditCriteria = (criteriaId) => {
    const criterion = criteria.find(c => c.id === criteriaId);
    setEditingCriteria(criteriaId);
    setEditData({
      definition: criterion.definition || '',
      weight: parseFloat(criterion.weight || 0)
    });
    setIsEditing(true);
  };

  const handleSaveCriteria = (criteriaId) => {
    updateCriteriaMutation.mutate({
      id: criteriaId,
      definition: editData.definition,
      weight: editData.weight
    });
    setEditingCriteria(null);
    setIsEditing(false);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingCriteria(null);
    setIsEditing(false);
  };

  const handleDefinitionChange = (criteriaId, value) => {
    setEditData(prev => ({ ...prev, definition: value }));
  };

  const handleWeightChange = (criteriaId, value) => {
    const weight = Math.max(0, Math.min(1, parseFloat(value) || 0));
    setEditData(prev => ({ ...prev, weight }));
  };

  const getTotalWeight = () => {
    return criteria.reduce((total, c) => total + parseFloat(c.weight || 0), 0);
  };

  const getWeightStatus = () => {
    const total = getTotalWeight();
    if (total === 0) return { status: 'empty', message: 'No weights assigned' };
    if (total < 1) return { status: 'under', message: `Total weight: ${(total * 100).toFixed(1)}% (under 100%)` };
    if (total === 1) return { status: 'perfect', message: `Total weight: ${(total * 100).toFixed(1)}% (perfect!)` };
    return { status: 'over', message: `Total weight: ${(total * 100).toFixed(1)}% (over 100%)` };
  };

  const weightStatus = getWeightStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading criteria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Job Criticality Evaluation</h1>
          <p className="text-gray-600 mt-2">
            Define and configure criteria for evaluating job criticality in your organization
          </p>
        </div>

        {/* Weight Status */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-gray-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Weight Distribution</h3>
                  <p className={`text-sm ${
                    weightStatus.status === 'perfect' ? 'text-green-600' :
                    weightStatus.status === 'under' ? 'text-yellow-600' :
                    weightStatus.status === 'over' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {weightStatus.message}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{(getTotalWeight() * 100).toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Total Weight</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Criteria List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {criteria.map((criterion) => {
            const IconComponent = iconMap[criterion.icon] || Target;
            const isEditing = editingCriteria === criterion.id;
            
            return (
              <Card key={criterion.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getColorClasses(criterion.color).split(' ')[0]}`}>
                        <IconComponent className={`h-5 w-5 ${getColorClasses(criterion.color).split(' ')[1]}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{criterion.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getColorClasses(criterion.color)}`}>
                            Weight: {(parseFloat(criterion.weight || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!isEditing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCriteria(criterion.id)}
                          disabled={isEditing}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveCriteria(criterion.id)}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`definition-${criterion.id}`}>Definition</Label>
                        <Textarea
                          id={`definition-${criterion.id}`}
                          value={editData.definition || ''}
                          onChange={(e) => handleDefinitionChange(criterion.id, e.target.value)}
                          placeholder="Enter the definition and description for this criteria..."
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`weight-${criterion.id}`}>Weight (0-1)</Label>
                        <Input
                          id={`weight-${criterion.id}`}
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={editData.weight || 0}
                          onChange={(e) => handleWeightChange(criterion.id, e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter a weight between 0 and 1 (e.g., 0.15 for 15%)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Definition</h4>
                        {criterion.definition ? (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {criterion.definition}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            No definition provided. Click Edit to add one.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Weight</h4>
                          <p className="text-lg font-semibold text-gray-900">{(parseFloat(criterion.weight || 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getColorClasses(criterion.color).split(' ')[0]}`}
                            style={{ width: `${parseFloat(criterion.weight || 0) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>1. Define Each Criteria:</strong> Click "Edit" on each criteria card to add a clear definition 
                that explains what this criteria measures and how it should be evaluated.
              </p>
              <p>
                <strong>2. Set Weights:</strong> Assign a weight percentage (0-100%) to each criteria based on its 
                importance in determining job criticality. The total should ideally equal 100%.
              </p>
              <p>
                <strong>3. Weight Guidelines:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Higher weights for criteria that have more impact on organizational success</li>
                <li>Consider the strategic importance of each factor</li>
                <li>Ensure weights reflect your organization's priorities</li>
                <li>Total weight can be adjusted based on your evaluation methodology</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobCriticality;
