import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Star, 
  TrendingUp,
  Award,
  Target,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';

const MyCompetencies = () => {
  const { currentSid } = useUser();
  const [userData, setUserData] = useState(null);

  console.log('MyCompetencies - currentSid:', currentSid);

  // Fetch user data using dynamic SID
  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['user-profile', currentSid],
    queryFn: async () => {
      console.log('MyCompetencies - Fetching employee data for SID:', currentSid);
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      const normalizedSid = String(currentSid || '').trim();
      const employee = employees.find(emp => String(emp.sid).trim() === normalizedSid);
      console.log('MyCompetencies - Found employee:', employee);
      return employee;
    },
    enabled: !!currentSid
  });

  // Fetch job competency mappings for this user
  const { data: jcpData, isLoading: jcpLoading } = useQuery({
    queryKey: ['user-jcp', currentSid, employeeData?.job_code],
    queryFn: async () => {
      console.log('MyCompetencies - Fetching JCP data for SID:', currentSid);
      if (!employeeData?.job_code) {
        console.log('MyCompetencies - No employee job_code; returning null');
        return null;
      }
      const response = await api.get('/job-competencies');
      const mappings = response.data.mappings || [];
      const jobCode = String(employeeData.job_code).trim();
      const userMapping = mappings.find(mapping => String(mapping.job.code).trim() === jobCode);
      
      if (userMapping) {
        const jobCompetencies = mappings.filter(mapping => String(mapping.job.code).trim() === jobCode);
        console.log('MyCompetencies - Found JCP data:', { job: userMapping.job, competencies: jobCompetencies });
        return {
          job: userMapping.job,
          competencies: jobCompetencies
        };
      }
      console.log('MyCompetencies - No JCP data found for job_code:', jobCode);
      return { job: { code: jobCode }, competencies: [] };
    },
    enabled: !!employeeData?.job_code
  });

  useEffect(() => {
    if (employeeData) {
      setUserData(employeeData);
    }
  }, [employeeData]);

  // Mock assessment data (in real app, this would come from API)
  // Real competency data from job mappings
  const competencies = jcpData?.competencies || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
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

  const completedCount = 0; // Will be calculated from real assessment data
  const inProgressCount = 0; // Will be calculated from real assessment data
  const totalCount = competencies.length;
  const overallProgress = totalCount > 0 ? 0 : 0; // Will be calculated from real assessment data

  if (employeeLoading || jcpLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug banner */}
      <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2">
        SID: {String(currentSid)} | job_code: {String(employeeData?.job_code || 'N/A')} | competencies: {competencies.length}
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Competencies</h1>
          <p className="text-gray-600">Track your competency development and assessments</p>
        </div>
        <Button className="loyverse-button-primary">
          <Target className="h-4 w-4 mr-2" />
          Take Assessment
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Average across all competencies</p>
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
            <p className="text-sm text-gray-500">out of {totalCount} competencies</p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-yellow-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{inProgressCount}</div>
            <p className="text-sm text-gray-500">competencies being developed</p>
          </CardContent>
        </Card>

        {/* Next Assessment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Next Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600">Dec 15</div>
            <p className="text-sm text-gray-500">Strategic HR</p>
          </CardContent>
        </Card>
      </div>

      {/* Competency Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-green-600" />
            Competency Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competencies.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Competencies Assigned</h3>
                <p className="text-gray-500 mb-4">
                  Your job role ({employeeData?.job_code}) doesn't have any competency requirements assigned yet.
                </p>
                <p className="text-sm text-gray-400">
                  Contact your HR department to set up your competency profile.
                </p>
              </div>
            ) : competencies.map((competency) => (
              <div key={competency.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{competency.competency.name}</h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Required Level:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(competency.requiredLevel)}`}>
                          {competency.requiredLevel}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Required:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${competency.isRequired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {competency.isRequired ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>{competency.competency.description || 'No description available'}</p>
                </div>

                {/* Action Button */}
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = '/user/assessments'}
                  >
                    Take Assessment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Target className="h-6 w-6 text-blue-600" />
              <span>Take New Assessment</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span>View Progress Report</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Award className="h-6 w-6 text-purple-600" />
              <span>View Certificates</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyCompetencies;
