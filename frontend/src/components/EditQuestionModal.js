import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  X, 
  AlertCircle, 
  Save, 
  Eye,
  FileText,
  Target,
  Award,
  BookOpen
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const EditQuestionModal = ({ 
  isOpen, 
  onClose, 
  question, 
  competencies, 
  levels,
  onSuccess 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    type: 'MULTIPLE_CHOICE',
    competencyId: '',
    competencyLevelId: '',
    points: 1,
    explanation: '',
    correctAnswer: '',
    options: [
      { text: '', isCorrect: false, orderIndex: 1 },
      { text: '', isCorrect: false, orderIndex: 2 },
      { text: '', isCorrect: false, orderIndex: 3 },
      { text: '', isCorrect: false, orderIndex: 4 }
    ]
  });
  const [errors, setErrors] = useState({});

  // Initialize form data when question changes
  useEffect(() => {
    if (question) {
      console.log('Loading question data:', question);
      console.log('Available levels:', levels);
      console.log('Question competency_level_id:', question.competency_level_id);
      console.log('Matching level:', levels.find(l => l.id === question.competency_level_id));
      console.log('Level IDs in dropdown:', levels.map(l => l.id));
      console.log('Question level ID exists in dropdown:', levels.some(l => l.id === question.competency_level_id));
      
      setFormData({
        text: question.text || '',
        type: question.type || 'MULTIPLE_CHOICE',
        competencyId: question.competency_id || '',
        competencyLevelId: question.competency_level_id || '',
        points: question.points || 1,
        explanation: question.explanation || '',
        correctAnswer: '', // Will be set after loading options
        options: [
          { text: '', isCorrect: false, orderIndex: 1 },
          { text: '', isCorrect: false, orderIndex: 2 },
          { text: '', isCorrect: false, orderIndex: 3 },
          { text: '', isCorrect: false, orderIndex: 4 }
        ]
      });
    }
  }, [question, levels]);

  // Load question options when question changes
  useEffect(() => {
    if (question && question.id) {
      loadQuestionOptions();
    }
  }, [question]);

  const loadQuestionOptions = async () => {
    try {
      console.log('Loading options for question:', question.id);
      const response = await api.get(`/questions/${question.id}/options`);
      console.log('Options response:', response.data);
      
      if (response.data.success && response.data.options) {
        const options = response.data.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.is_correct,
          orderIndex: opt.order_index
        }));
        
        console.log('Mapped options:', options);
        
        // Fill options array with fresh data
        const newOptions = [
          { text: '', isCorrect: false, orderIndex: 1 },
          { text: '', isCorrect: false, orderIndex: 2 },
          { text: '', isCorrect: false, orderIndex: 3 },
          { text: '', isCorrect: false, orderIndex: 4 }
        ];
        
        options.forEach(opt => {
          if (opt.orderIndex <= 4) {
            newOptions[opt.orderIndex - 1] = opt;
          }
        });
        
        console.log('New options array:', newOptions);
        
        // Set correct answer for True/False and Multiple Choice
        let correctAnswer = '';
        if (question.type === 'TRUE_FALSE' && options.length > 0) {
          // For True/False, find the correct option
          const correctOption = options.find(opt => opt.isCorrect);
          if (correctOption) {
            correctAnswer = correctOption.text;
          }
        } else if (question.type === 'MULTIPLE_CHOICE') {
          // Find the correct option for multiple choice
          const correctOption = options.find(opt => opt.isCorrect);
          if (correctOption) {
            correctAnswer = correctOption.text;
          }
        }
        
        console.log('Setting form data with options and correct answer:', { newOptions, correctAnswer });
        
        setFormData(prev => ({
          ...prev,
          options: newOptions,
          correctAnswer: correctAnswer
        }));
      }
    } catch (error) {
      console.error('Error loading question options:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.text.trim()) {
      newErrors.text = 'Question text is required';
    }

    if (!formData.competencyId) {
      newErrors.competencyId = 'Competency is required';
    }

    if (formData.type === 'MULTIPLE_CHOICE') {
      const validOptions = formData.options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        newErrors.options = 'At least 2 options are required for multiple choice';
      }
      const correctOptions = validOptions.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        newErrors.options = 'At least one correct answer is required';
      }
    }

    if (formData.type === 'TRUE_FALSE' && !formData.correctAnswer) {
      newErrors.correctAnswer = 'Correct answer is required for True/False questions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateQuestionMutation = useMutation({
    mutationFn: (questionData) => api.put(`/questions/${question.id}`, questionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions']);
      toast({
        title: "Success",
        description: "Question updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update question",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const questionData = {
      text: formData.text.trim(),
      type: formData.type,
      competencyId: formData.competencyId,
      competencyLevelId: formData.competencyLevelId || null,
      points: parseInt(formData.points),
      explanation: formData.explanation.trim() || null,
      correctAnswer: formData.type === 'TRUE_FALSE' ? formData.correctAnswer : null,
      options: formData.type === 'MULTIPLE_CHOICE'
        ? formData.options.filter(opt => opt.text.trim())
        : []
    };

    updateQuestionMutation.mutate(questionData);
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      'MULTIPLE_CHOICE': 'Multiple Choice',
      'TRUE_FALSE': 'True/False',
      'SHORT_ANSWER': 'Short Answer',
      'ESSAY': 'Essay'
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type) => {
    const colorMap = {
      'MULTIPLE_CHOICE': 'text-blue-600 bg-blue-100',
      'TRUE_FALSE': 'text-green-600 bg-green-100',
      'SHORT_ANSWER': 'text-orange-600 bg-orange-100',
      'ESSAY': 'text-purple-600 bg-purple-100'
    };
    return colorMap[type] || 'text-gray-600 bg-gray-100';
  };

  const getLevelColor = (level) => {
    const colorMap = {
      'BASIC': 'text-blue-600 bg-blue-100',
      'INTERMEDIATE': 'text-yellow-600 bg-yellow-100',
      'ADVANCED': 'text-orange-600 bg-orange-100',
      'MASTERY': 'text-purple-600 bg-purple-100'
    };
    return colorMap[level] || 'text-gray-600 bg-gray-100';
  };

  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold">Edit Question</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>{showPreview ? 'Edit' : 'Preview'}</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {showPreview ? (
            // Preview Mode
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Question Preview
                </h3>
                
                {/* Question Header */}
                <div className="mb-6 p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(formData.type)}`}>
                        {getTypeLabel(formData.type)}
                      </span>
                      <span className="text-sm text-gray-600">{formData.points} points</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formData.competencyId && competencies.find(c => c.id === formData.competencyId)?.name}
                      {formData.competencyLevelId && (
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(levels.find(l => l.id === formData.competencyLevelId)?.level)}`}>
                          {levels.find(l => l.id === formData.competencyLevelId)?.level}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-medium mb-4">{formData.text}</h4>
                  
                  {/* Question Content Based on Type */}
                  {formData.type === 'MULTIPLE_CHOICE' && (
                    <div className="space-y-2">
                      {formData.options.filter(opt => opt.text.trim()).map((option, index) => (
                        <label key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="radio"
                            name="preview-answer"
                            className="h-4 w-4 text-blue-600"
                            disabled
                          />
                          <span className="text-sm">{option.text}</span>
                          {option.isCorrect && (
                            <span className="text-green-600 text-xs font-medium">✓ Correct</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {formData.type === 'TRUE_FALSE' && (
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="radio"
                          name="preview-answer"
                          className="h-4 w-4 text-blue-600"
                          disabled
                        />
                        <span className="text-sm">True</span>
                        {formData.correctAnswer === 'true' && (
                          <span className="text-green-600 text-xs font-medium">✓ Correct</span>
                        )}
                      </label>
                      <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="radio"
                          name="preview-answer"
                          className="h-4 w-4 text-blue-600"
                          disabled
                        />
                        <span className="text-sm">False</span>
                        {formData.correctAnswer === 'false' && (
                          <span className="text-green-600 text-xs font-medium">✓ Correct</span>
                        )}
                      </label>
                    </div>
                  )}
                  
                  {formData.type === 'SHORT_ANSWER' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Enter your answer here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                      />
                    </div>
                  )}
                  
                  {formData.type === 'ESSAY' && (
                    <div>
                      <textarea
                        placeholder="Enter your detailed answer here..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                      />
                    </div>
                  )}
                </div>
                
                {formData.explanation && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Explanation:</h5>
                    <p className="text-sm text-blue-800">{formData.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <Label htmlFor="text" className="text-sm font-medium">
                  Question Text *
                </Label>
                <textarea
                  id="text"
                  value={formData.text}
                  onChange={(e) => handleInputChange('text', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.text ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Enter your question here..."
                />
                {errors.text && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.text}
                  </p>
                )}
              </div>

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
              </div>

              {/* Competency Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="">Select Competency</option>
                    {competencies.map(competency => (
                      <option key={competency.id} value={competency.id}>
                        {competency.name}
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

                <div className="space-y-2">
                  <Label htmlFor="competencyLevelId" className="text-sm font-medium">
                    Competency Level
                  </Label>
                  <select
                    id="competencyLevelId"
                    value={formData.competencyLevelId}
                    onChange={(e) => handleInputChange('competencyLevelId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Level</option>
                    {levels.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Points */}
              <div className="space-y-2">
                <Label htmlFor="points" className="text-sm font-medium">
                  Points
                </Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  value={formData.points}
                  onChange={(e) => handleInputChange('points', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <Label htmlFor="explanation" className="text-sm font-medium">
                  Explanation
                </Label>
                <textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => handleInputChange('explanation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional explanation for the answer..."
                />
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
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                  {errors.correctAnswer && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.correctAnswer}
                    </p>
                  )}
                </div>
              )}

              {/* Multiple Choice Options */}
              {formData.type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Answer Options *</Label>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Input
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm">Correct</span>
                      </label>
                    </div>
                  ))}
                  {errors.options && (
                    <p className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.options}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateQuestionMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{updateQuestionMutation.isPending ? 'Updating...' : 'Update Question'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
