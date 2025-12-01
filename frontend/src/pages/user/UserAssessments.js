import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';
import { getLevelDisplayName } from '../../utils/competencyLevels';

const UserAssessments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentSid } = useUser();
  const currentUserId = currentSid;
  
  console.log('UserAssessments component - currentSid:', currentSid, 'currentUserId:', currentUserId);
  
  // Get pre-selected competency from navigation state
  const preselectedCompetencyId = location.state?.selectedCompetencyId;
  
  // State for assessment flow
  const [currentStep, setCurrentStep] = useState('select'); // select, taking, confirmLevel, results
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
  const [userConfirmedLevel, setUserConfirmedLevel] = useState(null);
  const [currentComponent, setCurrentComponent] = useState(null); // Track which component we're in

  // Fetch assessment result when assessment is completed
  useEffect(() => {
    if (assessmentResult && assessmentResult.sessionId) {
      // Check if user already has a confirmed level for this competency
      const fetchExistingLevel = async () => {
        try {
          const response = await api.get(`/user-assessments/latest-result/${currentUserId}/${selectedCompetency?.id}`);
          if (response.data?.assessment?.userConfirmedLevel) {
            setUserConfirmedLevel(response.data.assessment.userConfirmedLevel);
          }
        } catch (error) {
          console.log('No existing confirmed level found');
        }
      };
      fetchExistingLevel();
    }
  }, [assessmentResult, currentUserId, selectedCompetency]);

  // Reset userConfirmedLevel when starting a new assessment
  useEffect(() => {
    if (currentStep === 'select') {
      setUserConfirmedLevel(null);
    }
  }, [currentStep]);

  // Fetch assessment cycle status (with user SID to check for exceptions)
  const { data: cycleStatus } = useQuery({
    queryKey: ['assessment-cycle-status', currentUserId],
    queryFn: async () => {
      try {
        // Pass userId as query parameter so backend can check for exceptions
        const response = await api.get(`/settings/assessment-cycle/status${currentUserId ? `?userId=${currentUserId}` : ''}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching cycle status:', error);
        return null;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!currentUserId, // Only fetch when we have a user ID
  });

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

  // Fetch full competency details for the confirm level step
  const { data: fullCompetencyDetails, isLoading: competencyDetailsLoading } = useQuery({
    queryKey: ['competency-details', selectedCompetency?.id],
    queryFn: async () => {
      if (!selectedCompetency?.id) return null;
      const response = await api.get(`/competencies/${selectedCompetency.id}`);
      return response.data;
    },
    enabled: currentStep === 'confirmLevel' && !!selectedCompetency?.id,
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
      const errorMessage = error.response?.data?.error || "Failed to start assessment";
      const cycleStatus = error.response?.data?.cycleStatus;
      
      toast({
        title: "Cannot Start Assessment",
        description: cycleStatus ? `${errorMessage}\n\n${cycleStatus}` : errorMessage,
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
      
      // Check if Employee Self Assessment is active and we just completed System Assessment
      const components = cycleStatus?.components || {
        systemAssessment: true,
        employeeSelfAssessment: true,
        assessorAssessment: true,
        managerAssessment: true
      };
      
      if (currentComponent === 'systemAssessment' && components.employeeSelfAssessment) {
        // Move to level confirmation step
        setCurrentStep('confirmLevel');
        setCurrentComponent('employeeSelfAssessment');
      } else {
        // No more components, show results
        setCurrentStep('results');
      }
      
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

  // Helper function to get next active component
  const getNextActiveComponent = (currentComp = null) => {
    const components = cycleStatus?.components || {
      systemAssessment: true,
      employeeSelfAssessment: true,
      assessorAssessment: true,
      managerAssessment: true
    };
    
    const componentOrder = [
      { key: 'systemAssessment', name: 'System Assessment' },
      { key: 'employeeSelfAssessment', name: 'Employee Self Assessment' },
      { key: 'assessorAssessment', name: 'Assessor Assessment' },
      { key: 'managerAssessment', name: 'Manager Assessment' }
    ];
    
    if (!currentComp) {
      // Find first active component
      for (const comp of componentOrder) {
        if (components[comp.key]) {
          return comp.key;
        }
      }
      return null;
    }
    
    // Find next active component after current
    const currentIndex = componentOrder.findIndex(c => c.key === currentComp);
    if (currentIndex === -1) return null;
    
    for (let i = currentIndex + 1; i < componentOrder.length; i++) {
      if (components[componentOrder[i].key]) {
        return componentOrder[i].key;
      }
    }
    
    return null; // No more active components
  };

  const handleStartAssessment = (competency) => {
    // Check if cycle is activated
    const cycleActivated = cycleStatus?.canCreate !== false;
    if (!cycleActivated) {
      const cycleMessage = cycleStatus?.reason || cycleStatus?.statusMessage || 'Assessment period is currently closed.';
      toast({
        title: "Assessment Period Closed",
        description: cycleMessage,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCompetency(competency);
    
    // Check if System Assessment is active
    const components = cycleStatus?.components || {
      systemAssessment: true,
      employeeSelfAssessment: true,
      assessorAssessment: true,
      managerAssessment: true
    };
    
    // Check if competency has questions
    const hasQuestions = competency.hasQuestions && competency.questionCount > 0;
    
    if (components.systemAssessment && hasQuestions) {
      // Start System Assessment (quiz) if questions are available
      setCurrentComponent('systemAssessment');
      startAssessmentMutation.mutate(competency.id);
    } else if (components.employeeSelfAssessment) {
      // Skip to Employee Self Assessment (level confirmation)
      // This works even if there are no questions
      setCurrentComponent('employeeSelfAssessment');
      setCurrentStep('confirmLevel');
    } else {
      toast({
        title: "Cannot Start Assessment",
        description: "No assessment components are available for this competency.",
        variant: "destructive",
      });
    }
  };

  // Handle pre-selected competency from navigation (must be after handleStartAssessment is defined)
  useEffect(() => {
    if (preselectedCompetencyId && competenciesData?.competencies && cycleStatus !== undefined && !selectedCompetency) {
      const competency = competenciesData.competencies.find(c => c.id === preselectedCompetencyId);
      if (competency) {
        // Small delay to ensure everything is ready
        setTimeout(() => {
          handleStartAssessment(competency);
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCompetencyId, competenciesData, cycleStatus, selectedCompetency]);

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
    
    // Open modal immediately with loading state
    setDashboardData({
      competencyId: competency.id,
      competencyName: competency.name,
      loading: true,
    });
    setShowDashboardModal(true);
    try {
      // Fetch all assessment history for this competency
      const historyResponse = await api.get(`/user-assessments/history/${currentUserId}`);
      const allAssessments = historyResponse.data.assessments || [];
      
      // Filter assessments for this specific competency
      const competencyAssessments = allAssessments.filter(a => a.competencyId === competency.id);
      
      // Get the latest assessment with the most complete data
      const latestAssessment = competencyAssessments[0] || null;
      
      // Get unique levels from all assessments for this competency
      const systemLevel = competencyAssessments.find(a => a.systemLevel)?.systemLevel || null;
      const userConfirmedLevel = competencyAssessments.find(a => a.userConfirmedLevel)?.userConfirmedLevel || null;
      const managerSelectedLevel = competencyAssessments.find(a => a.managerSelectedLevel)?.managerSelectedLevel || null;
      
      // Get latest score if available
      const latestScore = latestAssessment?.percentageScore || null;
      
      setDashboardData({
        competencyId: competency.id,
        competencyName: competency.name,
        percentageScore: latestScore,
        correctAnswers: latestAssessment?.correctAnswers || null,
        totalQuestions: latestAssessment?.totalQuestions || null,
        systemLevel: systemLevel,
        userConfirmedLevel: userConfirmedLevel,
        managerSelectedLevel: managerSelectedLevel,
        completedAt: latestAssessment?.completedAt || null,
        score: latestAssessment?.score || null,
        allAssessments: competencyAssessments, // All attempts for this competency
        details: [],
        loading: false,
      });
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
          managerSelectedLevel: null,
          completedAt: null,
          score: null,
          allAssessments: [],
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
    const hasManagerLevel = Boolean(competency.managerSelectedLevel);
    const hasUserLevel = Boolean(competency.userConfirmedLevel);
    const hasSystemLevel = Boolean(competency.systemLevel);
    const hasQuestions = competency.hasQuestions && competency.questionCount > 0;
    
    // Check if cycle is activated
    const cycleActivated = cycleStatus?.canCreate !== false;
    const cycleDisabled = !cycleActivated;
    const cycleMessage = cycleStatus?.reason || cycleStatus?.statusMessage || 'Assessment period is currently closed.';
    
    // Check if Employee Self Assessment is active
    const components = cycleStatus?.components || {
      systemAssessment: true,
      employeeSelfAssessment: true,
      assessorAssessment: true,
      managerAssessment: true
    };
    const canDoSelfAssessment = components.employeeSelfAssessment && cycleActivated;
    
    // Allow assessment if:
    // 1. Cycle is active AND
    // 2. (Has questions for System Assessment OR can do Self Assessment) AND
    // 3. Not finalized by manager AND
    // 4. Has attempts left (if System Assessment is required)
    const canStartAssessment = cycleActivated && 
      (hasQuestions || canDoSelfAssessment) && 
      !hasManagerLevel && 
      (hasQuestions ? (!attemptsLoading && attemptsLeft > 0) : true);
    
    const disabled = !canStartAssessment || startAssessmentMutation.isPending;
    
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
            {/* Assessment Status - Show all assessment types */}
            {(hasSystemLevel || hasUserLevel || hasManagerLevel) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-medium text-blue-900 mb-2">Assessment Status</div>
                <div className="space-y-1">
                  {hasSystemLevel && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700">System Assessment:</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(competency.systemLevel)}`}>
                        {getLevelDisplayName(competency.systemLevel)}
                      </span>
                    </div>
                  )}
                  {hasUserLevel && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700">Your Self Assessment:</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(competency.userConfirmedLevel)}`}>
                        {getLevelDisplayName(competency.userConfirmedLevel)}
                      </span>
                    </div>
                  )}
                  {hasManagerLevel && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700">Manager Assessment:</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(competency.managerSelectedLevel)}`}>
                        {getLevelDisplayName(competency.managerSelectedLevel)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* System Assessment Info - Only show if questions are available */}
            {hasQuestions && (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Play className="h-4 w-4" />
                  <span>{numQ || competency.questionCount || '…'} Questions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{(typeof tlm === 'number' && tlm > 0) ? tlm : '…'} Minutes</span>
                </div>
              </>
            )}
            
            {/* Self Assessment Only Notice */}
            {!hasQuestions && canDoSelfAssessment && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-green-800">
                    <div className="font-medium mb-1">Self Assessment Available</div>
                    <div className="text-green-700">You can assess your competency level directly</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {cycleDisabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <div className="font-medium mb-1">Assessment Period Closed</div>
                      <div className="text-amber-700">{cycleMessage}</div>
                    </div>
                  </div>
                </div>
              )}
              <Button 
                onClick={() => handleStartAssessment(competency)}
                className="w-full"
                disabled={disabled}
                variant={disabled ? "secondary" : "default"}
              >
                {startAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : disabled ? (
                  cycleDisabled ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Assessment Period Closed
                    </>
                  ) : hasManagerLevel ? (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Finalized by Manager
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      No Attempts Left
                    </>
                  )
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Assessment
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

  // Retake button which respects attempt limits and cycle status for the selected competency
  const RetakeButton = ({ competencyId, onRetake }) => {
    const { data: attemptsData, isLoading } = useAttempts(competencyId);
    const attemptsLeft = attemptsData?.attemptsLeft || 0;
    const cycleActivated = cycleStatus?.canCreate !== false;
    const cycleDisabled = !cycleActivated;
    const attemptsDisabled = !competencyId || (!isLoading && attemptsLeft === 0);
    const disabled = attemptsDisabled || cycleDisabled;
    
    let label = 'Take Another Assessment';
    if (cycleDisabled) {
      label = 'Assessment Period Closed';
    } else if (attemptsDisabled) {
      label = 'No Attempts Left';
    }
    
    return (
      <Button
        onClick={onRetake}
        variant="outline"
        className="flex items-center gap-2"
        disabled={disabled}
      >
        {cycleDisabled ? (
          <X className="h-4 w-4" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
        {label}
      </Button>
    );
  };

  if (currentStep === 'select') {
    return (
      <div className="space-y-6">
        {/* Assessment Cycle Status Banner */}
        {cycleStatus && (
          <div className={`p-4 rounded-lg border ${
            cycleStatus.canCreate 
              ? 'bg-green-50 border-green-200' 
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start">
              <Calendar className={`h-5 w-5 mt-0.5 mr-3 ${
                cycleStatus.canCreate ? 'text-green-600' : 'text-amber-600'
              }`} />
              <div className="flex-1">
                <h3 className={`text-sm font-semibold ${
                  cycleStatus.canCreate ? 'text-green-800' : 'text-amber-800'
                }`}>
                  {cycleStatus.canCreate ? 'Assessments Available' : 'Assessments Currently Unavailable'}
                </h3>
                <p className={`text-sm mt-1 ${
                  cycleStatus.canCreate ? 'text-green-700' : 'text-amber-700'
                }`}>
                  {cycleStatus.statusMessage || 'No assessment cycle configured'}
                </p>
                {/* Show reason if cycle is not active OR if there's an exception (exception overrides cycle) */}
                {cycleStatus.reason && (
                  <p className={`text-xs mt-2 ${
                    cycleStatus.canCreate && cycleStatus.hasException 
                      ? 'text-green-600 font-medium' 
                      : 'text-amber-600'
                  }`}>
                    {cycleStatus.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

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
                      {!dashboardData.percentageScore && !dashboardData.userConfirmedLevel && !dashboardData.managerSelectedLevel ? (
                        <div className="text-center py-6">
                          <div className="text-xl font-semibold text-gray-900">No completed assessment yet</div>
                          <p className="text-gray-600 mt-2">Take the {dashboardData.competencyName} assessment to view your dashboard here.</p>
                        </div>
                      ) : dashboardData.percentageScore ? (
                        <div className="text-center">
                          <div className={`text-6xl font-bold ${getScoreColor(dashboardData.percentageScore)}`}>
                            {dashboardData.percentageScore}%
                          </div>
                          <div className="text-gray-600 mt-2">
                            {dashboardData.correctAnswers} out of {dashboardData.totalQuestions} correct
                          </div>
                        </div>
                      ) : null}

                      {/* All Assessment Levels */}
                      {(dashboardData.systemLevel || dashboardData.userConfirmedLevel || dashboardData.managerSelectedLevel) && (
                        <div className="text-center">
                          <div className="text-lg font-medium text-gray-900 mb-3">Assessment Levels</div>
                          <div className="space-y-2">
                            {dashboardData.systemLevel && (
                              <div>
                                <span className="text-sm text-gray-600">System Assessment: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.systemLevel)}`}>
                                  {getLevelDisplayName(dashboardData.systemLevel)}
                                </span>
                              </div>
                            )}
                            {dashboardData.userConfirmedLevel && (
                              <div>
                                <span className="text-sm text-gray-600">Your Self Assessment: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.userConfirmedLevel)}`}>
                                  {getLevelDisplayName(dashboardData.userConfirmedLevel)}
                                </span>
                              </div>
                            )}
                            {dashboardData.managerSelectedLevel && (
                              <div>
                                <span className="text-sm text-gray-600">Manager Assessment: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.managerSelectedLevel)}`}>
                                  {getLevelDisplayName(dashboardData.managerSelectedLevel)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* All Assessment Attempts */}
                      {dashboardData.allAssessments && dashboardData.allAssessments.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">All Assessment Attempts</h3>
                          <div className="space-y-3">
                            {dashboardData.allAssessments.map((assessment, index) => (
                              <div key={assessment.sessionId || index} className="bg-gray-50 p-4 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    Attempt #{dashboardData.allAssessments.length - index}
                                  </div>
                                  {assessment.completedAt && (
                                    <div className="text-xs text-gray-500">
                                      {new Date(assessment.completedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                                {assessment.percentageScore !== null && assessment.percentageScore !== undefined && (
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <span className="text-sm text-gray-600">Score: </span>
                                      <span className={`text-lg font-bold ${getScoreColor(assessment.percentageScore)}`}>
                                        {assessment.percentageScore}%
                                      </span>
                                    </div>
                                    {assessment.correctAnswers !== null && assessment.totalQuestions !== null && (
                                      <div className="text-sm text-gray-600">
                                        ({assessment.correctAnswers}/{assessment.totalQuestions} correct)
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {assessment.systemLevel && (
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLevelColor(assessment.systemLevel)}`}>
                                      System: {getLevelDisplayName(assessment.systemLevel)}
                                    </span>
                                  )}
                                  {assessment.userConfirmedLevel && (
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLevelColor(assessment.userConfirmedLevel)}`}>
                                      Self: {getLevelDisplayName(assessment.userConfirmedLevel)}
                                    </span>
                                  )}
                                  {assessment.managerSelectedLevel && (
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLevelColor(assessment.managerSelectedLevel)}`}>
                                      Manager: {getLevelDisplayName(assessment.managerSelectedLevel)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
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
                          disabled={!cycleStatus?.canCreate}
                          variant={!cycleStatus?.canCreate ? "secondary" : "default"}
                        >
                          {!cycleStatus?.canCreate ? (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              Assessment Period Closed
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Retake Assessment
                            </>
                          )}
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

  // Confirm Level step (Employee Self Assessment)
  if (currentStep === 'confirmLevel' && selectedCompetency) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <Target className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Level</h1>
          <p className="text-gray-600">
            Please review the competency details and select your current level
          </p>
        </div>

        {competencyDetailsLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading competency details...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Full Competency Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  {fullCompetencyDetails?.name || selectedCompetency.name}
                </CardTitle>
                {fullCompetencyDetails?.code && (
                  <CardDescription>Code: {fullCompetencyDetails.code}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Competency Type and Family */}
                <div className="flex flex-wrap gap-3">
                  {fullCompetencyDetails?.type && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      fullCompetencyDetails.type === 'TECHNICAL' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {fullCompetencyDetails.type === 'TECHNICAL' ? 'Technical' : 'Non Technical'}
                    </span>
                  )}
                  {fullCompetencyDetails?.family && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {fullCompetencyDetails.family}
                    </span>
                  )}
                </div>

                {/* Definition */}
                {fullCompetencyDetails?.definition && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Definition</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {fullCompetencyDetails.definition}
                    </p>
                  </div>
                )}

                {/* Description */}
                {fullCompetencyDetails?.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {fullCompetencyDetails.description}
                    </p>
                  </div>
                )}

                {/* Competency Levels with Descriptions */}
                {fullCompetencyDetails?.levels && fullCompetencyDetails.levels.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Competency Levels</h3>
                    <div className="space-y-3">
                      {fullCompetencyDetails.levels.map((level, index) => (
                        <div
                          key={level.id || index}
                          className={`p-4 rounded-lg border-2 ${
                            level.level === 'BASIC' ? 'bg-blue-50 border-blue-200' :
                            level.level === 'INTERMEDIATE' ? 'bg-yellow-50 border-yellow-200' :
                            level.level === 'ADVANCED' ? 'bg-orange-50 border-orange-200' :
                            'bg-purple-50 border-purple-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(level.level)}`}>
                              {getLevelDisplayName(level.level)}
                            </span>
                            {level.title && (
                              <span className="text-sm font-medium text-gray-900">{level.title}</span>
                            )}
                          </div>
                          {level.description && (
                            <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">
                              {level.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competency Elements */}
                {fullCompetencyDetails?.elements && fullCompetencyDetails.elements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Competency Elements</h3>
                    <ul className="space-y-2">
                      {fullCompetencyDetails.elements.map((element, index) => (
                        <li key={element.id || index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-blue-600 mt-1">•</span>
                          <div>
                            <span className="font-medium">{element.name}</span>
                            {element.description && (
                              <span className="text-gray-600 ml-2">- {element.description}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Assessment Result (if available) */}
            {assessmentResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center text-lg">System Assessment Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getLevelColor(assessmentResult.competencyLevel)}`}>
                      {assessmentResult.competencyLevel}
                    </div>
                    {assessmentResult.percentageScore !== undefined && (
                      <div className="text-xs text-gray-600 mt-2">
                        Score: {assessmentResult.percentageScore}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Level Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Employee Self Assessment</CardTitle>
                <CardDescription className="text-center">
                  Based on the competency details above, select the level that best represents your current competency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-900 mb-3 text-center">Select Your Level</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {['BASIC','INTERMEDIATE','ADVANCED','MASTERY'].map(level => {
                      const levelDetails = fullCompetencyDetails?.levels?.find(l => l.level === level);
                      return (
                        <button
                          key={level}
                          onClick={async () => {
                            try {
                              // For confirmLevel step, we might not have a sessionId yet
                              let sessionId = assessmentResult?.sessionId || assessmentData?.sessionId;
                              
                              // If no sessionId (skipped System Assessment), create a self-assessment record
                              if (!sessionId && selectedCompetency) {
                                // Create a self-assessment without a system assessment session
                                await api.post('/user-assessments/confirm-level', {
                                  competencyId: selectedCompetency.id,
                                  userId: currentUserId,
                                  userConfirmedLevel: level
                                });
                              } else if (sessionId) {
                                await api.post('/user-assessments/confirm-level', {
                                  sessionId: sessionId,
                                  userConfirmedLevel: level
                                });
                              } else {
                                throw new Error('Missing session or competency information');
                              }
                              
                              setUserConfirmedLevel(level);
                              toast({ title: 'Level Confirmed', description: `You selected ${getLevelDisplayName(level)}` });
                              
                              // Check for next active component
                              const nextComponent = getNextActiveComponent(currentComponent);
                              if (nextComponent && (nextComponent === 'assessorAssessment' || nextComponent === 'managerAssessment')) {
                                // These are handled by managers/assessors, so we're done
                                setCurrentStep('results');
                                // Create a minimal assessmentResult for display
                                if (!assessmentResult) {
                                  setAssessmentResult({
                                    competencyLevel: level,
                                    percentageScore: null,
                                    correctAnswers: null,
                                    totalQuestions: null
                                  });
                                }
                              } else {
                                // No more components, show results
                                setCurrentStep('results');
                                if (!assessmentResult) {
                                  setAssessmentResult({
                                    competencyLevel: level,
                                    percentageScore: null,
                                    correctAnswers: null,
                                    totalQuestions: null
                                  });
                                }
                              }
                              
                              // Refresh competencies data to show updated level
                              queryClient.invalidateQueries(['user-assessments-competencies']);
                            } catch (e) {
                              const msg = e?.response?.data?.error || e?.message || 'Failed to confirm level';
                              console.error('Confirm level failed:', e);
                              toast({ title: 'Error', description: msg, variant: 'destructive' });
                            }
                          }}
                          className={`px-4 py-4 rounded-lg border-2 text-sm font-semibold transition-all duration-200 ${getLevelColor(level)} hover:opacity-90 hover:scale-105 active:scale-95 border-transparent hover:border-current flex flex-col items-center justify-center min-h-[80px]`}
                        >
                          <span>{getLevelDisplayName(level)}</span>
                          {levelDetails?.title && (
                            <span className="text-xs font-normal mt-1 opacity-80">{levelDetails.title}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 text-center">
                    This confirms your view of your current level. Your line manager may adjust this level later.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  if (currentStep === 'results' && (assessmentResult || userConfirmedLevel)) {
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
            {/* Score Display - only show if we have System Assessment results */}
            {assessmentResult && assessmentResult.percentageScore !== null && assessmentResult.percentageScore !== undefined && (
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(assessmentResult.percentageScore)}`}>
                  {assessmentResult.percentageScore}%
                </div>
                <div className="text-gray-600 mt-2">
                  {assessmentResult.correctAnswers} out of {assessmentResult.totalQuestions} correct
                </div>
              </div>
            )}

            {/* Competency Level + Confirmation */}
            <div className="space-y-3">
              {assessmentResult && assessmentResult.competencyLevel && (
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-900 mb-2">Competency Level (Assessment Result)</div>
                  <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getLevelColor(assessmentResult.competencyLevel)}`}>
                    {getLevelDisplayName(assessmentResult.competencyLevel)}
                  </span>
                </div>
              )}
              <div className="bg-gray-50 p-4 rounded-lg">
                {userConfirmedLevel ? (
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900 mb-2">Your Confirmed Level</div>
                    <div className="flex justify-center">
                      <span className={`inline-flex px-6 py-3 rounded-lg text-lg font-semibold ${getLevelColor(userConfirmedLevel)} border-2 border-current shadow-lg`}>
                        {getLevelDisplayName(userConfirmedLevel)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      ✓ Level confirmed and saved. Your line manager may adjust this level later.
                    </p>
                  </div>
                ) : (
                  <>
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
                              setUserConfirmedLevel(level);
                              toast({ title: 'Level Confirmed', description: `You selected ${getLevelDisplayName(level)}` });
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
                          {getLevelDisplayName(level)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">This confirms your view of your current level. Your line manager may adjust later.</p>
                  </>
                )}
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
                {!dashboardData.loading && (
                  <>
                    {/* Score Display or Empty State */}
                    {!dashboardData.percentageScore && !dashboardData.userConfirmedLevel && !dashboardData.managerSelectedLevel ? (
                      <div className="text-center py-6">
                        <div className="text-xl font-semibold text-gray-900">No completed assessment yet</div>
                        <p className="text-gray-600 mt-2">Take the {dashboardData.competencyName} assessment to view your dashboard here.</p>
                      </div>
                    ) : dashboardData.percentageScore ? (
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getScoreColor(dashboardData.percentageScore)}`}>
                          {dashboardData.percentageScore}%
                        </div>
                        <div className="text-gray-600 mt-2">
                          {dashboardData.correctAnswers} out of {dashboardData.totalQuestions} correct
                        </div>
                      </div>
                    ) : null}

                    {/* All Assessment Levels */}
                    {(dashboardData.systemLevel || dashboardData.userConfirmedLevel || dashboardData.managerSelectedLevel) && (
                      <div className="text-center">
                        <div className="text-lg font-medium text-gray-900 mb-3">Assessment Levels</div>
                        <div className="space-y-2">
                            {dashboardData.systemLevel && (
                              <div>
                                <span className="text-sm text-gray-600">System Assessment: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.systemLevel)}`}>
                                  {getLevelDisplayName(dashboardData.systemLevel)}
                                </span>
                              </div>
                            )}
                            {dashboardData.userConfirmedLevel && (
                              <div>
                                <span className="text-sm text-gray-600">Your Self Assessment: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.userConfirmedLevel)}`}>
                                  {getLevelDisplayName(dashboardData.userConfirmedLevel)}
                                </span>
                              </div>
                            )}
                            {dashboardData.managerSelectedLevel && (
                              <div>
                                <span className="text-sm text-gray-600">Manager Assessment: </span>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(dashboardData.managerSelectedLevel)}`}>
                                  {getLevelDisplayName(dashboardData.managerSelectedLevel)}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* All Assessment Attempts */}
                    {dashboardData.allAssessments && dashboardData.allAssessments.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">All Assessment Attempts</h3>
                        <div className="space-y-3">
                          {dashboardData.allAssessments.map((assessment, index) => (
                            <div key={assessment.sessionId || index} className="bg-gray-50 p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-900">
                                  Attempt #{dashboardData.allAssessments.length - index}
                                </div>
                                {assessment.completedAt && (
                                  <div className="text-xs text-gray-500">
                                    {new Date(assessment.completedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              {assessment.percentageScore !== null && assessment.percentageScore !== undefined && (
                                <div className="flex items-center gap-4">
                                  <div>
                                    <span className="text-sm text-gray-600">Score: </span>
                                    <span className={`text-lg font-bold ${getScoreColor(assessment.percentageScore)}`}>
                                      {assessment.percentageScore}%
                                    </span>
                                  </div>
                                  {assessment.correctAnswers !== null && assessment.totalQuestions !== null && (
                                    <div className="text-sm text-gray-600">
                                      ({assessment.correctAnswers}/{assessment.totalQuestions} correct)
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {assessment.systemLevel && (
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLevelColor(assessment.systemLevel)}`}>
                                    System: {getLevelDisplayName(assessment.systemLevel)}
                                  </span>
                                )}
                                {assessment.userConfirmedLevel && (
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLevelColor(assessment.userConfirmedLevel)}`}>
                                    Self: {getLevelDisplayName(assessment.userConfirmedLevel)}
                                  </span>
                                )}
                                {assessment.managerSelectedLevel && (
                                  <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getLevelColor(assessment.managerSelectedLevel)}`}>
                                    Manager: {getLevelDisplayName(assessment.managerSelectedLevel)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
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
                        disabled={!cycleStatus?.canCreate}
                        variant={!cycleStatus?.canCreate ? "secondary" : "default"}
                      >
                        {!cycleStatus?.canCreate ? (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Assessment Period Closed
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Retake Assessment
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserAssessments;
