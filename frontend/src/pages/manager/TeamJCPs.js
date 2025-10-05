import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  BookOpen, 
  Search, 
  Filter,
  Users,
  Award,
  Target,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import api from '../../lib/api';
import { useUser } from '../../contexts/UserContext';

const TeamJCPs = () => {
  const { currentSid } = useUser();
  const [jcps, setJcps] = useState([]);
  const [filteredJcps, setFilteredJcps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [managerDivision, setManagerDivision] = useState('');

  // Use dynamic SID from context
  const managerSid = currentSid;

  useEffect(() => {
    fetchManagerAndJCPs();
  }, []);

  useEffect(() => {
    filterJCPs();
  }, [jcps, searchTerm, selectedLevel]);

  const fetchManagerAndJCPs = async () => {
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
        
        // Get JCPs for team members
        const jcpsResponse = await api.get('/job-competencies');
        const allJcps = jcpsResponse.data.mappings;
        
        // Filter JCPs for team members and group by job
        const teamJcps = allJcps.filter(mapping => 
          hierarchyMembers.some(emp => emp.job_code === mapping.job.code)
        );
        
        // Group mappings by job
        const groupedJcps = teamJcps.reduce((acc, mapping) => {
          const jobCode = mapping.job.code;
          if (!acc[jobCode]) {
            acc[jobCode] = {
              id: mapping.job.id,
              jobTitle: mapping.job.title,
              jobCode: mapping.job.code,
              job: mapping.job,
              competencies: []
            };
          }
          acc[jobCode].competencies.push({
            competencyName: mapping.competency.name,
            level: mapping.requiredLevel,
            competency: mapping.competency
          });
          return acc;
        }, {});
        
        setJcps(Object.values(groupedJcps));
      }
    } catch (error) {
      console.error('Error fetching JCPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterJCPs = () => {
    let filtered = jcps;

    if (searchTerm) {
      filtered = filtered.filter(jcp =>
        jcp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jcp.jobCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jcp.competencies.some(comp => 
          comp.competencyName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (selectedLevel) {
      filtered = filtered.filter(jcp =>
        jcp.competencies.some(comp => comp.level === selectedLevel)
      );
    }

    setFilteredJcps(filtered);
  };

  const getUniqueLevels = () => {
    const levels = new Set();
    jcps.forEach(jcp => {
      jcp.competencies.forEach(comp => {
        levels.add(comp.level);
      });
    });
    return Array.from(levels).sort();
  };

  const getJCPStats = () => {
    return {
      total: jcps.length,
      totalCompetencies: jcps.reduce((sum, jcp) => sum + jcp.competencies.length, 0),
      averageCompetencies: jcps.length > 0 ? 
        Math.round(jcps.reduce((sum, jcp) => sum + jcp.competencies.length, 0) / jcps.length) : 0
    };
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'BASIC': return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-orange-100 text-orange-800';
      case 'MASTERY': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const stats = getJCPStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team JCPs</h1>
          <p className="text-gray-600 mt-1">
            Job Competency Profiles for {managerDivision} division
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total JCPs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total JCPs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Competencies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCompetencies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg per JCP</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageCompetencies}</p>
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
                  placeholder="Search JCPs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Levels</option>
                {getUniqueLevels().map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JCPs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJcps.map((jcp) => (
          <Card key={jcp.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {jcp.jobTitle}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono">
                    {jcp.jobCode}
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

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  {jcp.competencies.length} Competencies Required
                </p>
                
                <div className="space-y-2">
                  {jcp.competencies.slice(0, 3).map((comp, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {comp.competencyName}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(comp.level)}`}>
                        {comp.level}
                      </span>
                    </div>
                  ))}
                  
                  {jcp.competencies.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{jcp.competencies.length - 3} more competencies
                    </p>
                  )}
                </div>
              </div>

              {/* Competency Level Distribution */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Competency Levels</span>
                  <span>{jcp.competencies.length} total</span>
                </div>
                
                <div className="flex space-x-1">
                  {['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'].map(level => {
                    const count = jcp.competencies.filter(comp => comp.level === level).length;
                    const percentage = jcp.competencies.length > 0 ? (count / jcp.competencies.length) * 100 : 0;
                    
                    return (
                      <div key={level} className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getLevelColor(level).split(' ')[0]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-center mt-1">
                          <span className="text-xs text-gray-500">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Team JCP</span>
                </div>
                
                <Button variant="outline" size="sm">
                  <Star className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredJcps.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No JCPs Found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedLevel 
                ? 'Try adjusting your search criteria' 
                : 'No Job Competency Profiles found for your team'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamJCPs;
