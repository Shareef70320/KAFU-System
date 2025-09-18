import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  Star, 
  Target,
  BookOpen,
  Award,
  Calendar,
  AlertCircle,
  Play,
  FileText,
  BarChart3
} from 'lucide-react';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const Assessments = () => {
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  const { currentSid } = useUser();

  // Fetch user data for current SID
  const { data: employeeData } = useQuery({
    queryKey: ['user-profile', String(currentSid || '')],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const normalizedSid = String(currentSid || '').trim();
      return employees.find(emp => String(emp.sid).trim() === normalizedSid);
    },
    enabled: !!currentSid
  });

  // Fetch job competency mappings for this user
  const { data: jcpData } = useQuery({
    queryKey: ['user-jcp', String(currentSid || ''), employeeData?.job_code],
    queryFn: async () => {
      if (!employeeData?.job_code) return null;
      const response = await api.get('/job-competencies');
      const mappings = response.data.mappings || [];
      const jobCode = String(employeeData.job_code).trim();
      const userMapping = mappings.find(mapping => String(mapping.job.code).trim() === jobCode);
      
      if (userMapping) {
        const jobCompetencies = mappings.filter(mapping => String(mapping.job.code).trim() === jobCode);
        return {
          job: userMapping.job,
          competencies: jobCompetencies
        };
      }
      return { job: { code: jobCode }, competencies: [] };
    },
    enabled: !!employeeData?.job_code
  });

  // Mock assessment data
  const availableAssessments = [
    {
      id: 1,
      competencyName: "Strategic HR",
      requiredLevel: "INTERMEDIATE",
      currentLevel: "BASIC",
      status: "AVAILABLE",
      dueDate: "2024-12-15",
      duration: "30 minutes",
      questions: 15,
      description: "Assess your understanding of strategic HR practices and their implementation in organizational contexts.",
      lastTaken: "2024-11-15",
      score: 65
    },
    {
      id: 2,
      competencyName: "Learning and Development Planning",
      requiredLevel: "ADVANCED",
      currentLevel: "INTERMEDIATE",
      status: "AVAILABLE",
      dueDate: "2024-12-20",
      duration: "45 minutes",
      questions: 20,
      description: "Evaluate your skills in developing comprehensive learning and development strategies.",
      lastTaken: "2024-11-20",
      score: 78
    },
    {
      id: 3,
      competencyName: "Government Relations",
      requiredLevel: "BASIC",
      currentLevel: "BASIC",
      status: "COMPLETED",
      dueDate: "2024-11-10",
      duration: "20 minutes",
      questions: 10,
      description: "Test your knowledge of government relations and compliance requirements.",
      lastTaken: "2024-11-10",
      score: 92
    },
    {
      id: 4,
      competencyName: "Talent Acquisition",
      requiredLevel: "BASIC",
      currentLevel: "BASIC",
      status: "COMPLETED",
      dueDate: "2024-11-05",
      duration: "25 minutes",
      questions: 12,
      description: "Assess your talent acquisition strategies and recruitment processes.",
      lastTaken: "2024-11-05",
      score: 88
    },
    {
      id: 5,
      competencyName: "Performance Program Management",
      requiredLevel: "BASIC",
      currentLevel: "BASIC",
      status: "COMPLETED",
      dueDate: "2024-10-30",
      duration: "30 minutes",
      questions: 15,
      description: "Evaluate your performance management program implementation skills.",
      lastTaken: "2024-10-30",
      score: 85
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'AVAILABLE': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'LOCKED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-gray-100 text-gray-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-blue-100 text-blue-800';
      case 'MASTERY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStartAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    setShowAssessmentModal(true);
  };

  const availableCount = availableAssessments.filter(a => a.status === 'AVAILABLE').length;
  const completedCount = availableAssessments.filter(a => a.status === 'COMPLETED').length;
  const totalCount = availableAssessments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-600">Take competency assessments to track your progress</p>
        </div>
        <Button className="loyverse-button-primary">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Progress
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Assessments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Play className="h-5 w-5 mr-2 text-blue-600" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{availableCount}</div>
            <p className="text-sm text-gray-500">assessments ready to take</p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            <p className="text-sm text-gray-500">out of {totalCount} assessments</p>
          </CardContent>
        </Card>

        {/* Average Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-600" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">82%</div>
            <p className="text-sm text-gray-500">across completed assessments</p>
          </CardContent>
        </Card>

        {/* Next Due */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Next Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600">Dec 15</div>
            <p className="text-sm text-gray-500">Strategic HR</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-green-600" />
            Available Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableAssessments.map((assessment) => (
              <div key={assessment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{assessment.competencyName}</h3>
                    <p className="text-sm text-gray-600 mt-1">{assessment.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Required:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(assessment.requiredLevel)}`}>
                          {assessment.requiredLevel}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Current:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(assessment.currentLevel)}`}>
                          {assessment.currentLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assessment.status)}`}>
                      {assessment.status}
                    </span>
                    {assessment.status === 'AVAILABLE' && (
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </div>

                {/* Assessment Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium">{assessment.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Questions:</span>
                    <span className="font-medium">{assessment.questions}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Due:</span>
                    <span className="font-medium">{formatDate(assessment.dueDate)}</span>
                  </div>
                  {assessment.status === 'COMPLETED' && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Score:</span>
                      <span className="font-medium">{assessment.score}%</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleStartAssessment(assessment)}
                    className={assessment.status === 'COMPLETED' ? 'opacity-50 cursor-not-allowed' : ''}
                    disabled={assessment.status === 'COMPLETED'}
                  >
                    {assessment.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Assessment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Modal */}
      {showAssessmentModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Start Assessment</h3>
                <button 
                  onClick={() => setShowAssessmentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">{selectedAssessment.competencyName}</h4>
                <p className="text-sm text-gray-600 mb-4">{selectedAssessment.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium">{selectedAssessment.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Questions:</span>
                    <span className="font-medium">{selectedAssessment.questions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Due Date:</span>
                    <span className="font-medium">{formatDate(selectedAssessment.dueDate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={() => setShowAssessmentModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    // In real app, this would start the assessment
                    alert('Assessment would start here!');
                    setShowAssessmentModal(false);
                  }}
                  className="flex-1 loyverse-button-primary"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessments;
