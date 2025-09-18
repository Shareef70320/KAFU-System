import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  X, 
  Plus, 
  Trash2, 
  BookOpen, 
  Target, 
  Award,
  FileText,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';

const CreateQuestionModal = ({ isOpen, onClose, competencies, levels, onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    text: '',
    type: 'MULTIPLE_CHOICE',
    competencyId: '',
    competencyLevelId: '',
    points: 1,
    explanation: '',
    isActive: true,
    correctAnswer: '', // For True/False questions
    options: [
      { text: '', isCorrect: false, orderIndex: 1 },
      { text: '', isCorrect: false, orderIndex: 2 }
    ]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        text: '',
        type: 'MULTIPLE_CHOICE',
        competencyId: '',
        competencyLevelId: '',
        points: 1,
        explanation: '',
        isActive: true,
        options: [
          { text: '', isCorrect: false, orderIndex: 1 },
          { text: '', isCorrect: false, orderIndex: 2 }
        ]
      });
      setErrors({});
    }
  }, [isOpen]);

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: (questionData) => api.post('/questions', questionData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question created successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({
        ...prev,
        options: [
          ...prev.options,
          { 
            text: '', 
            isCorrect: false, 
            orderIndex: prev.options.length + 1 
          }
        ]
      }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options
        .filter((_, i) => i !== index)
        .map((option, i) => ({
          ...option,
          orderIndex: i + 1
        }));
      
      setFormData(prev => ({
        ...prev,
        options: newOptions
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.text.trim()) {
      newErrors.text = 'Question text is required';
    } else if (formData.text.length < 10) {
      newErrors.text = 'Question text must be at least 10 characters';
    }

    if (!formData.competencyId) {
      newErrors.competencyId = 'Competency is required';
    }

    if (!formData.competencyLevelId) {
      newErrors.competencyLevelId = 'Competency level is required';
    }

    if (!formData.points || formData.points < 1) {
      newErrors.points = 'Points must be at least 1';
    }

    // Type-specific validation
    if (formData.type === 'MULTIPLE_CHOICE') {
      const validOptions = formData.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        newErrors.options = 'Multiple choice questions need at least 2 options';
      } else if (validOptions.filter(opt => opt.isCorrect).length === 0) {
        newErrors.options = 'At least one option must be marked as correct';
      } else if (validOptions.filter(opt => opt.isCorrect).length === validOptions.length) {
        newErrors.options = 'Not all options can be correct';
      }
    } else if (formData.type === 'TRUE_FALSE') {
      if (!formData.correctAnswer) {
        newErrors.correctAnswer = 'Please select the correct answer (True or False)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const questionData = {
        text: formData.text.trim(),
        type: formData.type,
        competencyId: formData.competencyId,
        competencyLevelId: formData.competencyLevelId,
        points: parseInt(formData.points),
        explanation: formData.explanation.trim() || null,
        createdBy: 'admin', // TODO: Get from auth context
        correctAnswer: formData.type === 'TRUE_FALSE' ? formData.correctAnswer : null,
        options: formData.type === 'MULTIPLE_CHOICE' 
          ? formData.options.filter(opt => opt.text.trim())
          : []
      };

      await createQuestionMutation.mutateAsync(questionData);
    } catch (error) {
      console.error('Error creating question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionTypeDescription = (type) => {
    const descriptions = {
      'MULTIPLE_CHOICE': 'Select one correct answer from multiple options',
      'TRUE_FALSE': 'Answer with True or False',
      'SHORT_ANSWER': 'Provide a brief written response',
      'ESSAY': 'Provide a detailed written response'
    };
    return descriptions[type] || '';
  };

  const getLevelDescription = (levelId) => {
    const level = levels.find(l => l.id === levelId);
    return level ? level.level : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Create New Question</h2>
            <p className="text-sm text-gray-600 mt-1">Add a new question to the question bank</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="text" className="text-sm font-medium">
              Question Text *
            </Label>
            <textarea
              id="text"
              value={formData.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              placeholder="Enter your question here..."
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y ${
                errors.text ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={4}
            />
            {errors.text && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.text}
              </p>
            )}
          </div>

          {/* Question Type and Competency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Question Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">
                Question Type *
              </Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="TRUE_FALSE">True/False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="ESSAY">Essay</option>
              </select>
              <p className="text-xs text-gray-500">
                {getQuestionTypeDescription(formData.type)}
              </p>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label htmlFor="points" className="text-sm font-medium">
                Points *
              </Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => handleInputChange('points', parseInt(e.target.value) || 1)}
                className={errors.points ? 'border-red-500' : ''}
              />
              {errors.points && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.points}
                </p>
              )}
            </div>
          </div>

          {/* True/False Correct Answer */}
          {formData.type === 'TRUE_FALSE' && (
            <div className="space-y-2">
              <Label htmlFor="correctAnswer" className="text-sm font-medium">
                Correct Answer *
              </Label>
              <select
                id="correctAnswer"
                value={formData.correctAnswer}
                onChange={(e) => handleInputChange('correctAnswer', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.correctAnswer ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select correct answer</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
              {errors.correctAnswer && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.correctAnswer}
                </p>
              )}
            </div>
          )}

          {/* Competency and Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Competency */}
            <div className="space-y-2">
              <Label htmlFor="competencyId" className="text-sm font-medium">
                Competency *
              </Label>
              <select
                id="competencyId"
                value={formData.competencyId}
                onChange={(e) => handleInputChange('competencyId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.competencyId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a competency</option>
                {competencies.map(competency => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name} ({competency.type})
                  </option>
                ))}
              </select>
              {errors.competencyId && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.competencyId}
                </p>
              )}
            </div>

            {/* Competency Level */}
            <div className="space-y-2">
              <Label htmlFor="competencyLevelId" className="text-sm font-medium">
                Competency Level *
              </Label>
              <select
                id="competencyLevelId"
                value={formData.competencyLevelId}
                onChange={(e) => handleInputChange('competencyLevelId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.competencyLevelId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a level</option>
                {levels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.level}
                  </option>
                ))}
              </select>
              {formData.competencyLevelId && (
                <p className="text-xs text-gray-500">
                  {getLevelDescription(formData.competencyLevelId)}
                </p>
              )}
              {errors.competencyLevelId && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.competencyLevelId}
                </p>
              )}
            </div>
          </div>

          {/* Multiple Choice Options */}
          {formData.type === 'MULTIPLE_CHOICE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Answer Options *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={formData.options.length >= 6}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <Input
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Correct</span>
                      </label>
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {errors.options && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.options}
                </p>
              )}
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation" className="text-sm font-medium">
              Explanation (Optional)
            </Label>
            <textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
              placeholder="Provide an explanation for the correct answer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
              rows={3}
            />
            <p className="text-xs text-gray-500">
              This explanation will be shown to users after they complete the assessment
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Active (question will be available for assessments)
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Create Question</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuestionModal;
