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

  // Fetch job competency mappings for this user with detailed level information
  const { data: jcpData } = useQuery({
    queryKey: ['user-jcp', currentSid],
    queryFn: async () => {
      if (!employeeData?.job_code) return null;
      
      // Fetch job competencies with detailed level information using job code
      const response = await api.get(`/job-competencies/job-code/${employeeData.job_code}`);
      const mappings = response.data || [];
      
      if (mappings.length > 0) {
        return {
          job: mappings[0].job,
          competencies: mappings
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
              <div className="grid grid-cols-1 gap-6">
                {jcpData.competencies.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                    {/* Competency Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">{item.competency.name}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            {item.competency.family}
                          </span>
                          <span className="flex items-center">
                            <Award className="h-4 w-4 mr-1" />
                            {item.competency.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          item.requiredLevel === 'BASIC' ? 'bg-gray-100 text-gray-800' :
                          item.requiredLevel === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                          item.requiredLevel === 'ADVANCED' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Required: {item.requiredLevel}
                        </span>
                        {item.isRequired && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Mandatory
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Competency Definition */}
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Competency Definition</h5>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">
                        {item.competency.definition}
                      </p>
                    </div>

                    {/* Level Definitions */}
                    {item.competency.levels && item.competency.levels.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Level Definitions</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {item.competency.levels.map((level, levelIndex) => (
                            <div key={levelIndex} className={`p-3 rounded-lg border ${
                              level.level === item.requiredLevel 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-200 bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  level.level === 'BASIC' ? 'bg-gray-100 text-gray-800' :
                                  level.level === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-800' :
                                  level.level === 'ADVANCED' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {level.level}
                                </span>
                                {level.level === item.requiredLevel && (
                                  <span className="text-xs text-blue-600 font-medium">Required</span>
                                )}
                              </div>
                              <h6 className="text-xs font-medium text-gray-900 mb-1">{level.title}</h6>
                              <p className="text-xs text-gray-600 leading-relaxed">{level.description}</p>
                              {level.indicators && level.indicators.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Key Indicators:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {level.indicators.slice(0, 2).map((indicator, idx) => (
                                      <li key={idx} className="flex items-start">
                                        <span className="text-gray-400 mr-1">•</span>
                                        <span>{indicator}</span>
                                      </li>
                                    ))}
                                    {level.indicators.length > 2 && (
                                      <li className="text-gray-500 italic">
                                        +{level.indicators.length - 2} more indicators
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        Competency ID: {item.competency.id}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Learn More
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Take Assessment
                        </Button>
                      </div>
                    </div>
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
