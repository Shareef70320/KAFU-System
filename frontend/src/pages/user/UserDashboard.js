import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  User, 
  BookOpen, 
  Target, 
  MessageSquare,
  TrendingUp,
  Award,
  Calendar,
  Clock,
  Star,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Users,
  Briefcase,
  UserCheck,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import EmployeePhoto from '../../components/EmployeePhoto';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentSid } = useUser();

  // Redirect to login if no SID is set
  React.useEffect(() => {
    if (!currentSid) {
      navigate('/user-login');
    }
  }, [currentSid, navigate]);

  // Fetch user data using dynamic SID
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['user-profile', currentSid],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      return employees.find(emp => emp.sid === currentSid);
    },
    enabled: !!currentSid
  });

  // Check if user is a manager (has direct reports)
  const { data: isManager, isLoading: managerLoading } = useQuery({
    queryKey: ['is-manager', currentSid],
    queryFn: async () => {
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const directReports = employees.filter(emp => emp.line_manager_sid === currentSid);
      return directReports.length > 0;
    },
    enabled: !!currentSid
  });

  // Fetch team statistics if user is a manager
  const { data: teamStats, isLoading: teamStatsLoading } = useQuery({
    queryKey: ['team-stats', currentSid],
    queryFn: async () => {
      if (!isManager || !employeeData) return null;
      
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const directReports = employees.filter(emp => emp.line_manager_sid === currentSid);
      
      const jobsResponse = await api.get('/jobs?limit=2000');
      const divisionJobs = jobsResponse.data.jobs.filter(
        job => job.division === employeeData.division
      );
      
      const jcpsResponse = await api.get('/job-competencies');
      const teamJCPs = jcpsResponse.data.mappings.filter(mapping => 
        directReports.some(emp => emp.job_code === mapping.job.code)
      );
      
      return {
        totalEmployees: directReports.length,
        totalJobs: divisionJobs.length,
        totalJCPs: teamJCPs.length,
        pendingAssessments: 0
      };
    },
    enabled: !!isManager && !!employeeData
  });

  // Fetch job competency mappings for this user
  const { data: jcpData, isLoading: jcpLoading } = useQuery({
    queryKey: ['user-jcp', currentSid],
    queryFn: async () => {
      const response = await api.get('/job-competencies');
      const mappings = response.data.mappings || [];
      const userMapping = mappings.find(mapping => mapping.job.code === employeeData?.job_code);
      
      if (userMapping) {
        const jobCompetencies = mappings.filter(mapping => mapping.job.code === employeeData?.job_code);
        return {
          job: userMapping.job,
          competencies: jobCompetencies
        };
      }
      return null;
    },
    enabled: !!employeeData?.job_code
  });

  // Mock data for dashboard
  const dashboardData = {
    competencies: {
      total: 9,
      completed: 3,
      inProgress: 2,
      averageScore: 82
    },
    assessments: {
      available: 2,
      completed: 3,
      nextDue: "2024-12-15"
    },
    reviews: {
      completed: 2,
      pending: 1,
      averageRating: 4.2
    },
    recentActivity: [
      {
        id: 1,
        type: "Assessment",
        title: "Strategic HR Assessment",
        date: "2024-12-10",
        status: "Completed",
        score: 78
      },
      {
        id: 2,
        type: "Review",
        title: "Annual Review 2024",
        date: "2024-12-15",
        status: "Completed",
        rating: 4.2
      },
      {
        id: 3,
        type: "Competency",
        title: "Learning and Development Planning",
        date: "2024-12-08",
        status: "In Progress",
        progress: 70
      }
    ]
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Pending': return 'bg-blue-100 text-blue-800';
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

  // Fetch user's IDPs
  const { data: idpData, isLoading: idpLoading } = useQuery({
    queryKey: ['user-idps', currentSid],
    queryFn: () => api.get(`/idp/${currentSid}`),
    enabled: !!currentSid,
  });

  const idps = idpData?.idps || [];

  if (employeeLoading || jcpLoading || managerLoading || idpLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600">Unable to load user data for SID: {currentSid}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white relative overflow-hidden">
        {/* subtle glow */}
        <div className="absolute -top-10 -right-10 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
        <div className="flex items-center justify-between relative">
          {/* Left: Fancy profile photo + intro */}
          <div className="flex items-center gap-6 pr-4">
            <div className="relative">
              {/* gradient ring */}
              <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 via-emerald-300 to-cyan-400 shadow-lg">
                <EmployeePhoto
                  sid={employeeData?.sid}
                  firstName={employeeData?.first_name}
                  lastName={employeeData?.last_name}
                  size="medium"
                  className="rounded-full"
                  cropType="head"
                />
              </div>
              {/* status dot */}
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-400 ring-2 ring-green-700" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {employeeData?.first_name}!</h1>
              <p className="text-green-100 mt-2">
                {employeeData?.job_title} • {employeeData?.division} • {employeeData?.unit}
              </p>
              {isManager && (
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="text-green-100 text-sm">Manager • {teamStats?.totalEmployees || 0} direct reports</span>
                </div>
              )}
            </div>
          </div>
          {/* Right: quick facts */}
          <div className="text-right">
            <p className="text-green-100">SID: {employeeData?.sid}</p>
            <p className="text-green-100">Grade: {employeeData?.grade || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isManager ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-6`}>
        {/* Competencies */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/user/competencies')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
              Competencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{dashboardData.competencies.completed}</div>
            <p className="text-sm text-gray-500">of {dashboardData.competencies.total} completed</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(dashboardData.competencies.completed / dashboardData.competencies.total) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/user/assessments')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{dashboardData.assessments.available}</div>
            <p className="text-sm text-gray-500">available to take</p>
            <p className="text-xs text-gray-400 mt-1">Next due: {formatDate(dashboardData.assessments.nextDue)}</p>
          </CardContent>
        </Card>

        {/* My IDP */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/user/my-idp')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-orange-600" />
              My IDP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{idps.length}</div>
            <p className="text-sm text-gray-500">development plans</p>
            <p className="text-xs text-gray-400 mt-1">
              {idps.filter(idp => idp.status === 'COMPLETED').length} completed
            </p>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/user/reviews')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
              Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{dashboardData.reviews.completed}</div>
            <p className="text-sm text-gray-500">completed reviews</p>
            <p className="text-xs text-gray-400 mt-1">Avg rating: {dashboardData.reviews.averageRating}/5.0</p>
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-yellow-600" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{dashboardData.competencies.averageScore}%</div>
            <p className="text-sm text-gray-500">average score</p>
            <div className="flex items-center mt-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-400 ml-1">Excellent performance</span>
            </div>
          </CardContent>
        </Card>

        {/* Manager-specific stats */}
        {isManager && teamStats && (
          <>
            {/* Direct Reports */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/user/team')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  My Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{teamStats.totalEmployees}</div>
                <p className="text-sm text-gray-500">direct reports</p>
                <div className="flex items-center mt-1">
                  <UserCheck className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-400 ml-1">Team management</span>
                </div>
              </CardContent>
            </Card>

            {/* Division Jobs */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/user/jobs')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-green-600" />
                  Team Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{teamStats.totalJobs}</div>
                <p className="text-sm text-gray-500">division jobs</p>
                <div className="flex items-center mt-1">
                  <Briefcase className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-400 ml-1">Job oversight</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Development Paths Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Layers className="h-6 w-6 mr-2 text-green-600" />
              My Development Paths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">View your assigned paths timeline</div>
              <Button variant="outline" onClick={() => navigate('/user/development')}>View Timeline</Button>
            </div>
          </CardContent>
        </Card>
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Clock className="h-6 w-6 mr-2 text-green-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.type === 'Assessment' && <Target className="h-5 w-5 text-green-600" />}
                    {activity.type === 'Review' && <MessageSquare className="h-5 w-5 text-purple-600" />}
                    {activity.type === 'Competency' && <BookOpen className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </span>
                    {activity.score && (
                      <span className="text-xs text-gray-500">{activity.score}%</span>
                    )}
                    {activity.rating && (
                      <span className="text-xs text-gray-500">{activity.rating}/5.0</span>
                    )}
                    {activity.progress && (
                      <span className="text-xs text-gray-500">{activity.progress}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Award className="h-6 w-6 mr-2 text-green-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={() => navigate('/user/profile')}
                className="h-16 flex items-center justify-start space-x-3 text-left"
                variant="outline"
              >
                <User className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium">View My Profile</div>
                  <div className="text-sm text-gray-500">Personal and job information</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/user/competencies')}
                className="h-16 flex items-center justify-start space-x-3 text-left"
                variant="outline"
              >
                <BookOpen className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium">My Competencies</div>
                  <div className="text-sm text-gray-500">Track your competency progress</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/user/assessments')}
                className="h-16 flex items-center justify-start space-x-3 text-left"
                variant="outline"
              >
                <Target className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium">Take Assessment</div>
                  <div className="text-sm text-gray-500">Complete competency assessments</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/user/my-idp')}
                className="h-16 flex items-center justify-start space-x-3 text-left"
                variant="outline"
              >
                <Target className="h-6 w-6 text-orange-600" />
                <div>
                  <div className="font-medium">My IDP</div>
                  <div className="text-sm text-gray-500">View your development plans</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/user/reviews')}
                className="h-16 flex items-center justify-start space-x-3 text-left"
                variant="outline"
              >
                <MessageSquare className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="font-medium">Performance Reviews</div>
                  <div className="text-sm text-gray-500">View your review history</div>
                </div>
              </Button>

              {/* Manager-specific actions */}
              {isManager && (
                <>
                  <Button 
                    onClick={() => navigate('/user/team')}
                    className="h-16 flex items-center justify-start space-x-3 text-left"
                    variant="outline"
                  >
                    <Users className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-medium">Manage My Team</div>
                      <div className="text-sm text-gray-500">View and manage direct reports</div>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/user/jobs')}
                    className="h-16 flex items-center justify-start space-x-3 text-left"
                    variant="outline"
                  >
                    <Briefcase className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="font-medium">Team Jobs</div>
                      <div className="text-sm text-gray-500">View jobs in your division</div>
                    </div>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Competency Profile Summary */}
      {jcpData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-green-600" />
              Job Competency Profile Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{jcpData.job.title}</h3>
                  <p className="text-sm text-gray-600">{jcpData.job.division} • {jcpData.job.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Required Competencies</p>
                  <p className="text-2xl font-bold text-green-600">{jcpData.competencies.length}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {jcpData.competencies.filter(c => c.required_level === 'BASIC').length}
                  </div>
                  <div className="text-sm text-gray-500">Basic Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {jcpData.competencies.filter(c => c.required_level === 'INTERMEDIATE').length}
                  </div>
                  <div className="text-sm text-gray-500">Intermediate Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {jcpData.competencies.filter(c => c.required_level === 'ADVANCED').length}
                  </div>
                  <div className="text-sm text-gray-500">Advanced Level</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserDashboard;
