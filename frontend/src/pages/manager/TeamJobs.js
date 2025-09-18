import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Briefcase, 
  Search, 
  Filter,
  MapPin,
  Building2,
  Users,
  BookOpen,
  Eye,
  Edit,
  Link,
  CheckCircle,
  X
} from 'lucide-react';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const TeamJobs = () => {
  const { currentSid } = useUser();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [managerDivision, setManagerDivision] = useState('');
  const [jcpData, setJcpData] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJCPModal, setShowJCPModal] = useState(false);

  // Use dynamic SID from context
  const managerSid = currentSid;

  useEffect(() => {
    fetchManagerAndJobs();
    fetchJCPData();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, selectedLocation]);

  const fetchManagerAndJobs = async () => {
    try {
      setLoading(true);
      
      // Get manager's own data
      const managerResponse = await api.get(`/employees?limit=2000`);
      const manager = managerResponse.data.employees.find(emp => emp.sid === managerSid);
      
      if (manager) {
        setManagerDivision(manager.division);
        
        // Get hierarchical team members
        const hierarchyResponse = await api.get(`/employees/hierarchy/${managerSid}`);
        const hierarchyMembers = hierarchyResponse.data.hierarchyMembers;
        
        // Get all unique job codes from hierarchy members
        const teamJobCodes = hierarchyMembers.map(member => member.job_code).filter(Boolean);
        
        // Get jobs that match team members' job codes
        const jobsResponse = await api.get('/jobs?limit=2000');
        const teamJobs = jobsResponse.data.jobs.filter(
          job => teamJobCodes.includes(job.code)
        );
        
        setJobs(teamJobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJCPData = async () => {
    try {
      const response = await api.get('/job-competencies');
      const jcps = response.data.mappings || response.data;
      setJcpData(jcps);
    } catch (error) {
      console.error('Error fetching JCP data:', error);
    }
  };

  // Helper function to check if job has JCP
  const hasJCP = (job) => {
    if (!job.code || !jcpData.length) return false;
    return jcpData.some(jcp => jcp.job && jcp.job.code === job.code);
  };

  // Get JCP details for a specific job
  const getJobJCP = (job) => {
    if (!job.code || !jcpData.length) return [];
    return jcpData.filter(jcp => jcp.job && jcp.job.code === job.code);
  };

  // Handle JCP icon click
  const handleJCPClick = (job) => {
    setSelectedJob(job);
    setShowJCPModal(true);
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.section?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLocation) {
      filtered = filtered.filter(job => job.location === selectedLocation);
    }

    setFilteredJobs(filtered);
  };

  const getUniqueLocations = () => {
    return [...new Set(jobs.map(job => job.location).filter(Boolean))];
  };

  const getJobStats = () => {
    return {
      total: jobs.length,
      withJCPs: jobs.filter(job => hasJCP(job)).length,
      active: jobs.filter(job => job.isActive).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const stats = getJobStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Jobs</h1>
          <p className="text-gray-600 mt-1">
            Jobs in {managerDivision} division
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Jobs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
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
                <p className="text-sm font-medium text-gray-600">With JCPs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.withJCPs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Locations</option>
                {getUniqueLocations().map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {job.title}
                    </h3>
                    {hasJCP(job) && (
                      <button
                        onClick={() => handleJCPClick(job)}
                        className="ml-2 flex items-center hover:bg-green-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        title="Click to view JCP details"
                      >
                        <BookOpen className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-xs text-green-600 font-medium">JCP</span>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">
                    {job.code}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {job.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {job.description}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <Building2 className="h-4 w-4 mr-2" />
                  <span>{job.department || 'No Department'}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{job.location || 'No Location'}</span>
                </div>
                
                {job.section && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{job.section}</span>
                  </div>
                )}
              </div>

              {/* Status and Actions */}
              <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  job.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.isActive ? 'Active' : 'Inactive'}
                </span>
                
                {hasJCP(job) ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleJCPClick(job)}
                  >
                    <BookOpen className="h-4 w-4 mr-1" />
                    View JCP
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <Link className="h-4 w-4 mr-1" />
                    No JCP
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedLocation 
                ? 'Try adjusting your search criteria' 
                : 'No jobs found in your division'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* JCP Details Modal */}
      {showJCPModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                JCP Details - {selectedJob.title}
              </h3>
              <button
                onClick={() => setShowJCPModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Job Information</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{selectedJob.title}</p>
                  <p className="text-sm text-gray-600">Job Code: {selectedJob.code}</p>
                  <p className="text-sm text-gray-600">Department: {selectedJob.department || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Location: {selectedJob.location || 'N/A'}</p>
                  {selectedJob.description && (
                    <p className="text-sm text-gray-600 mt-2">{selectedJob.description}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Required Competencies</h4>
                <div className="space-y-3">
                  {getJobJCP(selectedJob).map((jcp, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{jcp.competency.name}</h5>
                          <p className="text-sm text-gray-600 mt-1">{jcp.competency.definition}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {jcp.competency.type}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {jcp.competency.family}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              Level: {jcp.requiredLevel}
                            </span>
                            {jcp.isRequired && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamJobs;
