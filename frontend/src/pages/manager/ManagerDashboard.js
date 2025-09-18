import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  Users, 
  Briefcase, 
  BookOpen, 
  TrendingUp, 
  UserCheck,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { currentSid } = useUser();
  const [managerData, setManagerData] = useState(null);
  const [teamStats, setTeamStats] = useState({
    totalEmployees: 0,
    totalJobs: 0,
    totalJCPs: 0,
    pendingAssessments: 0
  });
  const [loading, setLoading] = useState(true);

  // Use dynamic SID from context
  const managerSid = currentSid;

  useEffect(() => {
    fetchManagerData();
  }, []);

  const fetchManagerData = async () => {
    try {
      setLoading(true);
      
      // Get manager's own data
      const managerResponse = await api.get(`/employees?limit=2000`);
      const manager = managerResponse.data.employees.find(emp => emp.sid === managerSid);
      
      if (manager) {
        setManagerData(manager);
        
        // Get team statistics
        await fetchTeamStats(manager);
      }
    } catch (error) {
      console.error('Error fetching manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamStats = async (manager) => {
    try {
      // Get direct reports
      const employeesResponse = await api.get(`/employees?limit=2000`);
      const directReports = employeesResponse.data.employees.filter(
        emp => emp.line_manager_sid === managerSid
      );

      // Get jobs in manager's division
      const jobsResponse = await api.get(`/jobs?limit=2000`);
      const divisionJobs = jobsResponse.data.jobs.filter(
        job => job.division === manager.division
      );

      // Get JCPs for team members
      const jcpsResponse = await api.get('/job-competencies');
      const teamJCPs = jcpsResponse.data.mappings.filter(mapping => 
        directReports.some(emp => emp.job_code === mapping.job.code)
      );
      setTeamStats({
        totalEmployees: directReports.length,
        totalJobs: divisionJobs.length,
        totalJCPs: teamJCPs.length,
        pendingAssessments: 0 // Placeholder for now
      });
    } catch (error) {
      console.error('Error fetching team stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!managerData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manager Not Found</h2>
          <p className="text-gray-600">Unable to load manager data for SID: {managerSid}</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'My Team',
      description: 'View and manage your direct reports',
      icon: Users,
      color: 'bg-blue-500',
      href: '/manager/team'
    },
    {
      title: 'Team Jobs',
      description: 'View jobs in your division',
      icon: Briefcase,
      color: 'bg-green-500',
      href: '/manager/jobs'
    },
    {
      title: 'Team JCPs',
      description: 'View team competency profiles',
      icon: BookOpen,
      color: 'bg-purple-500',
      href: '/manager/jcps'
    },
    {
      title: 'Reports',
      description: 'Generate team reports',
      icon: BarChart3,
      color: 'bg-orange-500',
      href: '/manager/reports'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {managerData.first_name} {managerData.last_name}
          </p>
          <p className="text-sm text-gray-500">
            {managerData.job_title} • {managerData.division}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Manager SID</p>
          <p className="font-mono text-lg font-semibold">{managerData.sid}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Direct Reports</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Division Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team JCPs</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalJCPs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.pendingAssessments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Team competency assessment completed</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">New team member onboarded</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Team performance review scheduled</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
