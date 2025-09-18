import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  Award, 
  BookOpen,
  Edit,
  CheckCircle,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import EmployeePhoto from '../../components/EmployeePhoto';

const UserProfile = () => {
  const navigate = useNavigate();
  const { currentSid } = useUser();
  const [userData, setUserData] = useState(null);

  // Redirect to login if no SID is set
  useEffect(() => {
    if (!currentSid) {
      navigate('/user-login');
    }
  }, [currentSid, navigate]);

  // Fetch user data with dynamic SID
  const { data: employeeData, isLoading, error } = useQuery({
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
    queryKey: ['user-jcp', currentSid],
    queryFn: async () => {
      const response = await api.get('/job-competencies');
      const mappings = response.data.mappings || [];
      const userMapping = mappings.find(mapping => mapping.job.code === employeeData?.job_code);
      
      if (userMapping) {
        // Group competencies by job
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

  useEffect(() => {
    if (employeeData) {
      setUserData(employeeData);
    }
  }, [employeeData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading profile data</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'ON_LEAVE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Welcome back, {userData.first_name}!</p>
        </div>
        <Button className="loyverse-button-primary">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Personal Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <User className="h-5 w-5 mr-2 text-green-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <EmployeePhoto
                  sid={userData.sid}
                  firstName={userData.first_name}
                  lastName={userData.last_name}
                  size="medium"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {userData.first_name} {userData.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">SID: {userData.sid}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(userData.employment_status)}`}>
                    {userData.employment_status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Information Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-blue-600" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{userData.job_title || 'N/A'}</p>
                <p className="text-xs text-gray-500">Job Title</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{userData.division}</p>
                <p className="text-xs text-gray-500">Division</p>
              </div>
              {userData.unit && (
                <div>
                  <p className="text-sm text-gray-600">{userData.unit}</p>
                  <p className="text-xs text-gray-500">Unit</p>
                </div>
              )}
              {userData.grade && (
                <div>
                  <p className="text-sm text-gray-600">Grade {userData.grade}</p>
                  <p className="text-xs text-gray-500">Grade Level</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Mail className="h-5 w-5 mr-2 text-purple-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">{userData.email || 'N/A'}</p>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">{userData.location || 'N/A'}</p>
              </div>
              {userData.section && (
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600">{userData.section}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-orange-600" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">{formatDate(userData.created_at)}</p>
                <p className="text-xs text-gray-500">Start Date</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{userData.employment_type || 'N/A'}</p>
                <p className="text-xs text-gray-500">Employment Type</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{userData.employment_status}</p>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Competency Profile Section */}
      {jcpData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Award className="h-6 w-6 mr-2 text-amber-600" />
              My Job Competency Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-amber-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Job Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Job Title:</span>
                  <p className="text-sm text-gray-900">{jcpData.job.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Job Code:</span>
                  <p className="text-sm text-gray-900">{jcpData.job.code}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Division:</span>
                  <p className="text-sm text-gray-900">{jcpData.job.division}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Unit:</span>
                  <p className="text-sm text-gray-900">{jcpData.job.unit}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Required Competencies ({jcpData.competencies.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jcpData.competencies.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.competency.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{item.competency.family}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.requiredLevel === 'BASIC' ? 'bg-gray-100 text-gray-800' :
                          item.requiredLevel === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                          item.requiredLevel === 'ADVANCED' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.requiredLevel}
                        </span>
                        {item.isRequired && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{item.competency.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span>View My Competencies</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span>Take Assessment</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <span>View Progress</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
