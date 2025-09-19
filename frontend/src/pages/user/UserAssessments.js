import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Play, 
  Clock, 
  Target, 
  Award, 
  CheckCircle, 
  BarChart3,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';

const UserAssessments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  const currentUserId = currentSid;
  
  console.log('UserAssessments component - currentSid:', currentSid, 'currentUserId:', currentUserId);
  
  // State for assessment flow
  const [currentStep, setCurrentStep] = useState('select'); // select, taking, results
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  // Templates no longer used; settings come from backend assessment
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [settingsByCompetency, setSettingsByCompetency] = useState({});
  const [lastSessionByCompetency, setLastSessionByCompetency] = useState({});
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // Cache clearing is now handled globally in UserContext

  // Fetch available competencies
  const { data: competenciesData, isLoading: competenciesLoading } = useQuery({
    queryKey: ['user-assessments-competencies', currentUserId],
    queryFn: async () => {
      console.log('Fetching competencies for user:', currentUserId);
      const response = await api.get(`/user-assessments/competencies?userId=${currentUserId}`);
      console.log('Competencies response:', response.data);
      return response.data;
    }
  });

  // Get attempt information for each competency
  const useAttempts = (competencyId) => useQuery({
    queryKey: ['assessment-attempts', competencyId, currentUserId],
    queryFn: async () => {
      if (!competencyId || !currentUserId) return { attemptsLeft: 0, attemptsUsed: 0, maxAttempts: 0 };
      console.log('Fetching attempts for competency:', competencyId, 'user:', currentUserId);
      const res = await api.get(`/user-assessments/settings/${competencyId}?userId=${currentUserId}`);
      console.log('Attempts response:', res.data);
      return res.data;
    },
    enabled: !!competencyId && !!currentUserId,
  });

  const templatesLoading = false;

  // Start assessment mutation
  const startAssessmentMutation = useMutation({
    mutationFn: async (competencyId) => {
      const response = await api.post('/user-assessments/start', {
        competencyId,
        userId: currentUserId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAssessmentData(data.assessment);
      setCurrentStep('taking');
      const ttl = (data.assessment?.timeLimitMinutes || 30) * 60;
      setTimeRemaining(ttl);
      setCurrentQuestionIndex(0);
      setAnswers({});
      toast({
        title: "Assessment Started",
        description: `You have ${data.assessment?.timeLimitMinutes || 30} minutes. Good luck!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to start assessment",
        variant: "destructive",
      });
    }
  });

  // Submit assessment mutation
  const submitAssessmentMutation = useMutation({
    mutationFn: async (answers) => {
      const response = await api.post('/user-assessments/submit', {
        sessionId: assessmentData.sessionId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          selectedOptionId: answer.selectedOptionId,
          answerText: answer.answerText
        }))
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAssessmentResult(data.result);
      if (selectedCompetency?.id && data.result?.sessionId) {
        setLastSessionByCompetency(prev => ({ ...prev, [selectedCompetency.id]: data.result.sessionId }));
      }
      setCurrentStep('results');
      toast({
        title: "Assessment Completed",
        description: `You scored ${data.result.percentageScore}%!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to submit assessment",
        variant: "destructive",
      });
    }
  });

  // Timer effect
  useEffect(() => {
    let interval;
    if (currentStep === 'taking' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit when time runs out
            handleSubmitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, timeRemaining]);

  const handleStartAssessment = (competency) => {
    setSelectedCompetency(competency);
    startAssessmentMutation.mutate(competency.id);
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < assessmentData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitAssessment = () => {
    submitAssessmentMutation.mutate(answers);
  };

  const handleRetakeAssessment = () => {
    setCurrentStep('select');
    setSelectedCompetency(null);
    setAssessmentData(null);
    setAssessmentResult(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeRemaining(0);
    setShowDetails(false);
  };

  const handleViewDashboard = async (competency) => {
    console.log('handleViewDashboard called with:', competency);
    console.log('currentUserId:', currentUserId);
    console.log('lastSessionByCompetency:', lastSessionByCompetency);
    
    // Open modal immediately with loading state
    setDashboardData({
      competencyId: competency.id,
      competencyName: competency.name,
      loading: true,
    });
    setShowDashboardModal(true);
    try {
      const sessionId = lastSessionByCompetency[competency.id];
      console.log('sessionId for competency:', sessionId);
      
      const url = sessionId
        ? `/user-assessments/session/${sessionId}`
        : `/user-assessments/latest-result/${currentUserId}/${competency.id}`;
      
      console.log('Making API call to:', url);
      const response = await api.get(url);
      console.log('API response:', response.data);
      setDashboardData({ ...response.data.assessment, loading: false });
    } catch (error) {
      console.error('Error in handleViewDashboard:', error);
      console.error('Error response:', error?.response);
      if (error?.response?.status === 404) {
        console.log('404 error - showing empty state');
        // Friendly empty state
        setDashboardData({
          competencyId: competency.id,
          competencyName: competency.name,
          percentageScore: null,
          correctAnswers: null,
          totalQuestions: null,
          systemLevel: null,
          userConfirmedLevel: null,
          completedAt: null,
          score: null,
          details: [],
          loading: false,
        });
      } else {
        console.error('Other error - showing error state');
        setDashboardData((prev) => ({ ...(prev || {}), loading: false }));
        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to load dashboard",
          variant: "destructive",
        });
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLevelColor = (level) => {
    const colors = {
      'MASTERY': 'bg-purple-100 text-purple-800',
      'ADVANCED': 'bg-blue-100 text-blue-800',
      'INTERMEDIATE': 'bg-yellow-100 text-yellow-800',
      'BASIC': 'bg-gray-100 text-gray-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  // Card component to safely use hooks per competency
  const CompetencyCard = ({ competency }) => {
    const { data: attemptsData, isLoading: attemptsLoading } = useAttempts(competency.id);
    const numQ = typeof competency.numQuestions === 'number' ? competency.numQuestions : undefined;
    const tlm = typeof competency.timeLimitMinutes === 'number' ? competency.timeLimitMinutes : undefined;
    const attemptsLeft = attemptsData?.attemptsLeft || 0;
    const attemptsUsed = attemptsData?.attemptsUsed || 0;
    const maxAttempts = attemptsData?.maxAttempts || 0;
    const attemptsInfo = attemptsLoading ? '' : (attemptsLeft > 0 ? ` (${attemptsLeft} left)` : ' (No attempts left)');
    const disabled = !attemptsLoading && attemptsLeft === 0;
    return (
      <Card key={competency.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            {competency.name}
          </CardTitle>
          <CardDescription>
            {competency.description || 'Test your knowledge in this competency area'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Play className="h-4 w-4" />
              <span>{(typeof numQ === 'number' && numQ > 0) ? numQ : '…'} Questions</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{(typeof tlm === 'number' && tlm > 0) ? tlm : '…'} Minutes</span>
            </div>
            <div className="space-y-2">
              <Button 
                onClick={() => handleStartAssessment(competency)}
                className="w-full"
                disabled={startAssessmentMutation.isPending || disabled}
                variant={disabled ? "secondary" : "default"}
              >
                {startAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : disabled ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    No Attempts Left
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Assessment{attemptsInfo}
                  </>
                )}
              </Button>
              <Button 
                onClick={() => handleViewDashboard(competency)}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                View Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Retake button which respects attempt limits for the selected competency
  const RetakeButton = ({ competencyId, onRetake }) => {
    const { data: attemptsData, isLoading } = useAttempts(competencyId);
    const attemptsLeft = attemptsData?.attemptsLeft || 0;
    const disabled = !competencyId || (!isLoading && attemptsLeft === 0);
    const label = disabled ? 'No Attempts Left' : 'Take Another Assessment';
    return (
      <Button
        onClick={onRetake}
        variant="outline"
        className="flex items-center gap-2"
        disabled={disabled}
      >
        <RotateCcw className="h-4 w-4" />
        {label}
      </Button>
    );
  };

  if (currentStep === 'select') {
    return (
      <div className="space-y-6">
        {/* Debug banner */}
        <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
          SID: {String(currentUserId)} | competencies: {competenciesData?.competencies?.length ?? 0}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Take Assessment</h1>
            <p className="text-gray-600 mt-2">
              Test your knowledge and skills in different competencies
            </p>
          </div>
        </div>

        {competenciesLoading || templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
          {/* Template selector hidden for users (defaults to the first template) */}

          {/* Competencies grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competenciesData?.competencies?.map((competency) => (
              <CompetencyCard key={competency.id} competency={competency} />
            ))}
          </div>
          </>
        )}

        {showDashboardModal && dashboardData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {dashboardData.competencyName} - Assessment Results
                  </h2>
                  <Button
                    onClick={() => setShowDashboardModal(false)}
                    variant="outline"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-6">
                  {dashboardData.loading && (
                    <div className="text-center py-6 text-gray-600">Loading dashboard…</div>
                  )}

                  {!dashboardData.loading && (
                    <>
                      {/* Score Display or Empty State */}
                      {!dashboardData.percentageScore ? (
                        <div className="text-center py-6">
                          <div className="text-xl font-semibold text-gray-900">No completed assessment yet</div>
                          <p className="text-gray-600 mt-2">Take the {dashboardData.competencyName} assessment to view your dashboard here.</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className={`text-6xl font-bold ${getScoreColor(dashboardData.percentageScore)}`}>
                            {dashboardData.percentageScore}%
                          </div>
                          <div className="text-gray-600 mt-2">
                            {dashboardData.correctAnswers} out of {dashboardData.totalQuestions} correct
                          </div>
                        </div>
                      )}

                      {dashboardData.systemLevel && (
                        <div className="text-center">
                          <div className="text-lg font-medium text-gray-900 mb-2">Competency Level</div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-gray-600">System Assessment: </span>
                              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.systemLevel)}`}>
                                {dashboardData.systemLevel}
                              </span>
                            </div>
                            {dashboardData.userConfirmedLevel && (
                              <div>
                                <span className="text-sm text-gray-600">Your Confirmation: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.userConfirmedLevel)}`}>
                                  {dashboardData.userConfirmedLevel}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {dashboardData.completedAt && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 mb-3">Assessment Details</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Completed:</span>
                              <div className="font-medium">
                                {new Date(dashboardData.completedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Score:</span>
                              <div className="font-medium">{dashboardData.score} points</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {typeof dashboardData.percentageScore === 'number' && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 mb-2">Performance Feedback</h3>
                          <p className="text-gray-600 text-sm">
                            {dashboardData.percentageScore >= 80 
                              ? "Excellent work! You demonstrate mastery level understanding of this competency."
                              : dashboardData.percentageScore >= 60
                              ? "Good job! You show advanced understanding with room for improvement."
                              : dashboardData.percentageScore >= 40
                              ? "You have intermediate understanding. Consider reviewing the material and retaking the assessment."
                              : "You may want to review the competency materials and practice before retaking the assessment."
                            }
                          </p>
                        </div>
                      )}

                      {Array.isArray(dashboardData.details) && dashboardData.details.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 mb-3">Your Answers</h3>
                          <div className="space-y-3">
                            {dashboardData.details.map((d) => (
                              <div key={d.questionId} className="border-b pb-3">
                                <div className="text-sm font-medium text-gray-900">{d.questionText}</div>
                                <div className="mt-1 text-sm text-gray-700">
                                  <div>Your answer: {d.selectedOptionText || d.answerText || '—'}</div>
                                  <div className={d.isCorrect ? 'text-green-700' : 'text-red-700'}>
                                    {d.isCorrect ? 'Correct' : 'Incorrect'}
                                  </div>
                                  {assessmentData?.settings?.show_correct_answers && (
                                    <div>Correct answer: {d.correctOptionText || '—'}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 justify-center">
                        <Button onClick={() => setShowDashboardModal(false)} variant="outline">Close</Button>
                        <Button
                          onClick={() => {
                            setShowDashboardModal(false);
                            handleStartAssessment({ id: dashboardData.competencyId, name: dashboardData.competencyName });
                          }}
                        >
                          Retake Assessment
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentStep === 'taking' && assessmentData) {
    const currentQuestion = assessmentData.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id] || {};

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assessmentData.competencyName} Assessment
            </h1>
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} of {assessmentData.questions.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-600">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-500">Time Remaining</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / assessmentData.questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                {currentQuestion.type === 'MULTIPLE_CHOICE' ? 'Multiple Choice' : 
                 currentQuestion.type === 'TRUE_FALSE' ? 'True/False' : 
                 currentQuestion.type === 'SHORT_ANSWER' ? 'Short Answer' : 'Essay'}
              </span>
              <span className="text-sm text-gray-500">
                {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-lg font-medium text-gray-900">
              {currentQuestion.text}
            </div>

            {/* Answer Options */}
            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      currentAnswer.selectedOptionId === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option.id}
                      checked={currentAnswer.selectedOptionId === option.id}
                      onChange={() => handleAnswerChange(currentQuestion.id, {
                        ...currentAnswer,
                        selectedOptionId: option.id
                      })}
                      className="mr-3"
                    />
                    <span className="text-gray-900">{option.text}</span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'TRUE_FALSE' && (
              <div className="space-y-3">
                {['True', 'False'].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      currentAnswer.answerText === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={currentAnswer.answerText === option}
                      onChange={() => handleAnswerChange(currentQuestion.id, {
                        ...currentAnswer,
                        answerText: option
                      })}
                      className="mr-3"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'ESSAY') && (
              <textarea
                value={currentAnswer.answerText || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, {
                  ...currentAnswer,
                  answerText: e.target.value
                })}
                placeholder="Enter your answer here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={currentQuestion.type === 'ESSAY' ? 6 : 3}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {currentQuestionIndex === assessmentData.questions.length - 1 ? (
                  <Button
                    onClick={handleSubmitAssessment}
                    disabled={submitAssessmentMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitAssessmentMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
                  </Button>
                ) : (
                  <Button onClick={handleNextQuestion}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'results' && assessmentResult) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Complete!</h1>
          <p className="text-gray-600">
            You have completed the {selectedCompetency?.name} assessment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Your Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(assessmentResult.percentageScore)}`}>
                {assessmentResult.percentageScore}%
              </div>
              <div className="text-gray-600 mt-2">
                {assessmentResult.correctAnswers} out of {assessmentResult.totalQuestions} correct
              </div>
            </div>

            {/* Competency Level + Confirmation */}
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">Competency Level (Assessment Result)</div>
                <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getLevelColor(assessmentResult.competencyLevel)}`}>
                  {assessmentResult.competencyLevel}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-2">Confirm Your Level</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['BASIC','INTERMEDIATE','ADVANCED','MASTERY'].map(level => (
                    <button
                      key={level}
                      onClick={async () => {
                        try {
                          const sid = assessmentResult.sessionId || assessmentData?.sessionId;
                          if (!sid) {
                            throw new Error('Missing sessionId');
                          }
                          await api.post('/user-assessments/confirm-level', {
                            sessionId: sid,
                            userConfirmedLevel: level
                          });
                          toast({ title: 'Level Confirmed', description: `You selected ${level}` });
                          // Refresh competencies data to show updated level
                          queryClient.invalidateQueries(['user-assessments-competencies']);
                        } catch (e) {
                          const msg = e?.response?.data?.error || e?.message || 'Failed to confirm level';
                          console.error('Confirm level failed:', e);
                          toast({ title: 'Error', description: msg, variant: 'destructive' });
                        }
                      }}
                      className={`px-3 py-2 rounded border text-sm font-medium transition-all duration-200 ${getLevelColor(level)} hover:opacity-90 hover:scale-105 active:scale-95`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">This confirms your view of your current level. Your line manager may adjust later.</p>
              </div>
            </div>

            {/* Performance Feedback */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Performance Feedback</h3>
              <p className="text-gray-600 text-sm">
                {assessmentResult.percentageScore >= 80 
                  ? "Excellent work! You demonstrate mastery level understanding of this competency."
                  : assessmentResult.percentageScore >= 60
                  ? "Good job! You show advanced understanding with room for improvement."
                  : assessmentResult.percentageScore >= 40
                  ? "You have intermediate understanding. Consider reviewing the material and retaking the assessment."
                  : "You may want to review the competency materials and practice before retaking the assessment."
                }
              </p>
            </div>

            {/* Detailed Dashboard: gated behind button and setting */}
            {assessmentData?.settings?.show_dashboard && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Detailed Report</h3>
                {showDetails && (
                  <div className="space-y-3 mt-3">
                    {assessmentData.questions.map((q) => {
                      const ans = answers[q.id] || {};
                      return (
                        <div key={q.id} className="border-b pb-3">
                          <div className="text-sm font-medium text-gray-900">{q.text}</div>
                          {q.type === 'MULTIPLE_CHOICE' && (
                            <div className="mt-1 text-sm text-gray-700">
                              <div>Your answer: {q.options.find(o => o.id === ans.selectedOptionId)?.text || '—'}</div>
                              {assessmentData.settings.show_correct_answers && (
                                <div className="text-green-700">Correct answer: Available upon review</div>
                              )}
                            </div>
                          )}
                          {q.type === 'TRUE_FALSE' && (
                            <div className="mt-1 text-sm text-gray-700">
                              <div>Your answer: {ans.answerText || '—'}</div>
                              {assessmentData.settings.show_correct_answers && (
                                <div className="text-green-700">Correct answer: Available upon review</div>
                              )}
                            </div>
                          )}
                          {(q.type === 'SHORT_ANSWER' || q.type === 'ESSAY') && (
                            <div className="mt-1 text-sm text-gray-700">
                              <div>Your answer: {ans.answerText || '—'}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              {/* Retake disabled if attempts exhausted for this competency */}
              <RetakeButton competencyId={selectedCompetency?.id} onRetake={handleRetakeAssessment} />
              {assessmentData?.settings?.show_dashboard && !showDetails && (
                <Button onClick={() => setShowDetails(true)} className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  View Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Dashboard Modal */}
      {showDashboardModal && dashboardData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {dashboardData.competencyName} - Assessment Results
                </h2>
                <Button
                  onClick={() => setShowDashboardModal(false)}
                  variant="outline"
                  size="sm"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {dashboardData.loading && (
                  <div className="text-center py-6 text-gray-600">Loading dashboard…</div>
                )}
                {/* Score Display or Empty State */}
                {!dashboardData.percentageScore ? (
                  <div className="text-center py-6">
                    <div className="text-xl font-semibold text-gray-900">No completed assessment yet</div>
                    <p className="text-gray-600 mt-2">Take the {dashboardData.competencyName} assessment to view your dashboard here.</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(dashboardData.percentageScore)}`}>
                      {dashboardData.percentageScore}%
                    </div>
                    <div className="text-gray-600 mt-2">
                      {dashboardData.correctAnswers} out of {dashboardData.totalQuestions} correct
                    </div>
                  </div>
                )}

                {/* Competency Level */}
                {dashboardData.systemLevel && (
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900 mb-2">Competency Level</div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">System Assessment: </span>
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.systemLevel)}`}>
                          {dashboardData.systemLevel}
                        </span>
                      </div>
                      {dashboardData.userConfirmedLevel && (
                        <div>
                          <span className="text-sm text-gray-600">Your Confirmation: </span>
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.userConfirmedLevel)}`}>
                            {dashboardData.userConfirmedLevel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assessment Details */}
                {dashboardData.completedAt && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Assessment Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <div className="font-medium">
                        {new Date(dashboardData.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Score:</span>
                      <div className="font-medium">{dashboardData.score} points</div>
                    </div>
                  </div>
                </div>
                )}

                {/* Performance Feedback */}
                {typeof dashboardData.percentageScore === 'number' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Performance Feedback</h3>
                    <p className="text-gray-600 text-sm">
                      {dashboardData.percentageScore >= 80 
                        ? "Excellent work! You demonstrate mastery level understanding of this competency."
                        : dashboardData.percentageScore >= 60
                        ? "Good job! You show advanced understanding with room for improvement."
                        : dashboardData.percentageScore >= 40
                        ? "You have intermediate understanding. Consider reviewing the material and retaking the assessment."
                        : "You may want to review the competency materials and practice before retaking the assessment."
                      }
                    </p>
                  </div>
                )}

                {/* Detailed answers if available */}
                {Array.isArray(dashboardData.details) && dashboardData.details.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Your Answers</h3>
                    <div className="space-y-3">
                      {dashboardData.details.map((d) => (
                        <div key={d.questionId} className="border-b pb-3">
                          <div className="text-sm font-medium text-gray-900">{d.questionText}</div>
                          <div className="mt-1 text-sm text-gray-700">
                            <div>Your answer: {d.selectedOptionText || d.answerText || '—'}</div>
                            <div className={d.isCorrect ? 'text-green-700' : 'text-red-700'}>
                              {d.isCorrect ? 'Correct' : 'Incorrect'}
                            </div>
                            {assessmentData?.settings?.show_correct_answers && (
                              <div>Correct answer: {d.correctOptionText || '—'}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setShowDashboardModal(false)}
                    variant="outline"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDashboardModal(false);
                      handleStartAssessment({ id: dashboardData.competencyId, name: dashboardData.competencyName });
                    }}
                  >
                    Retake Assessment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserAssessments;
