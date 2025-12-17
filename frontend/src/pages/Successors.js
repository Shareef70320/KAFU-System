import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Briefcase,
  MapPin,
  Building2,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import EmployeePhoto from '../components/EmployeePhoto';

const Successors = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReadinessLevel, setSelectedReadinessLevel] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());

  // Fetch all successors
  const { data: successorsData, isLoading } = useQuery({
    queryKey: ['all-successors'],
    queryFn: async () => {
      const response = await api.get('/job-successors');
      return response.data.successors || [];
    }
  });

  // Filter successors
  const filteredSuccessors = useMemo(() => {
    if (!successorsData) return [];

    return successorsData.filter((successor) => {
      // Search filter
      const matchesSearch = !searchTerm || 
        `${successor.first_name} ${successor.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        successor.sid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        successor.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        successor.job_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        successor.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Readiness level filter
      const matchesReadiness = selectedReadinessLevel === 'all' || 
        successor.readiness_level === selectedReadinessLevel;

      return matchesSearch && matchesReadiness;
    });
  }, [successorsData, searchTerm, selectedReadinessLevel]);

  // Group by readiness level for statistics
  const readinessStats = useMemo(() => {
    if (!successorsData) return { all: 0, 'Ready Now': 0, 'Ready in 1-2 years': 0, 'Ready in 3+ years': 0 };
    
    const stats = { all: successorsData.length, 'Ready Now': 0, 'Ready in 1-2 years': 0, 'Ready in 3+ years': 0 };
    
    successorsData.forEach(s => {
      if (s.readiness_level && stats.hasOwnProperty(s.readiness_level)) {
        stats[s.readiness_level]++;
      }
    });
    
    return stats;
  }, [successorsData]);

  const toggleCard = (id) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getReadinessBadgeColor = (level) => {
    const colors = {
      'Ready Now': 'bg-green-100 text-green-800 border-green-300',
      'Ready in 1-2 years': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Ready in 3+ years': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[level] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading successors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Successors</h1>
          <p className="text-gray-600 mt-2">
            View and manage all assigned successors for critical positions.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Successors</p>
                  <p className="text-2xl font-bold text-gray-900">{readinessStats.all}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ready Now</p>
                  <p className="text-2xl font-bold text-green-600">{readinessStats['Ready Now']}</p>
                </div>
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ready in 1-2 Years</p>
                  <p className="text-2xl font-bold text-yellow-600">{readinessStats['Ready in 1-2 years']}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ready in 3+ Years</p>
                  <p className="text-2xl font-bold text-blue-600">{readinessStats['Ready in 3+ years']}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, SID, email, job title, or job code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Readiness Level Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedReadinessLevel}
                  onChange={(e) => setSelectedReadinessLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Readiness Levels</option>
                  <option value="Ready Now">Ready Now</option>
                  <option value="Ready in 1-2 years">Ready in 1-2 years</option>
                  <option value="Ready in 3+ years">Ready in 3+ years</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Successors List */}
        {filteredSuccessors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || selectedReadinessLevel !== 'all' 
                  ? 'No successors found matching your filters.'
                  : 'No successors have been assigned yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSuccessors.map((successor) => {
              const isExpanded = expandedCards.has(successor.id);
              
              return (
                <Card key={successor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Employee Photo */}
                        <EmployeePhoto
                          sid={successor.sid}
                          firstName={successor.first_name}
                          lastName={successor.last_name}
                          size="medium"
                        />

                        {/* Employee Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {successor.first_name} {successor.last_name}
                            </h3>
                            {successor.readiness_level && (
                              <Badge className={getReadinessBadgeColor(successor.readiness_level)}>
                                {successor.readiness_level}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <span className="font-mono">{successor.sid}</span>
                            {successor.email && (
                              <span className="flex items-center gap-1">
                                <span>{successor.email}</span>
                              </span>
                            )}
                            {successor.job_title && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                <span>{successor.job_title}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCard(successor.id)}
                        className="ml-4"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <CardContent className="pt-0 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* Successor Position Info */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Successor Position
                          </h4>
                          <div className="space-y-2 text-sm">
                            {successor.job_title && (
                              <div>
                                <span className="text-gray-500">Job Title:</span>
                                <span className="ml-2 text-gray-900">{successor.job_title}</span>
                              </div>
                            )}
                            {successor.job_code && (
                              <div>
                                <span className="text-gray-500">Job Code:</span>
                                <span className="ml-2 font-mono text-gray-900">{successor.job_code}</span>
                              </div>
                            )}
                            {successor.department && (
                              <div>
                                <span className="text-gray-500">Department:</span>
                                <span className="ml-2 text-gray-900">{successor.department}</span>
                              </div>
                            )}
                            {successor.division && (
                              <div>
                                <span className="text-gray-500">Division:</span>
                                <span className="ml-2 text-gray-900">{successor.division}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Succession Planning Info */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Succession Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            {successor.readiness_level && (
                              <div>
                                <span className="text-gray-500">Readiness Level:</span>
                                <Badge className={`ml-2 ${getReadinessBadgeColor(successor.readiness_level)}`}>
                                  {successor.readiness_level}
                                </Badge>
                              </div>
                            )}
                            {successor.assigned_at && (
                              <div>
                                <span className="text-gray-500">Assigned At:</span>
                                <span className="ml-2 text-gray-900">
                                  {new Date(successor.assigned_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                            {successor.notes && (
                              <div>
                                <span className="text-gray-500">Notes:</span>
                                <p className="mt-1 text-gray-900 bg-gray-50 p-2 rounded">
                                  {successor.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Placeholder for future features */}
                      <div className="mt-6 pt-6 border-t">
                        <p className="text-sm text-gray-500 italic">
                          IDP and other development features will be available here soon.
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Successors;

