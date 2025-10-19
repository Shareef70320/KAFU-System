import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BadgeCheck, Search, Save } from 'lucide-react';
import api from '../../lib/api';

const LEVELS = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'MASTERY'];

const ManagerAssessments = () => {
  const queryClient = useQueryClient();
  const [searchSid, setSearchSid] = useState('');
  const [selectedLevels, setSelectedLevels] = useState({}); // sessionId -> level

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['manager-latest-by-user', searchSid],
    queryFn: async () => {
      if (!searchSid) return { results: [] };
      const res = await api.get(`/user-assessments/latest-by-user/${searchSid}`);
      return res.data;
    },
    enabled: false
  });

  const saveMutation = useMutation({
    mutationFn: async ({ sessionId, level }) => {
      await api.post('/user-assessments/manager-level', { sessionId, managerSelectedLevel: level });
    },
    onSuccess: async () => {
      // Hard refresh of data to reflect saved state
      await queryClient.invalidateQueries({ queryKey: ['manager-latest-by-user', searchSid] });
      await refetch();
    },
    onError: (error) => {
      console.error('Manager level save failed:', error);
    }
  });

  const handleAssign = (sessionId) => {
    const level = selectedLevels[sessionId];
    if (!level) return;
    saveMutation.mutate({ sessionId, level });
  };

  const results = data?.results || [];

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded p-2">
        Manager Assessments Page Loaded • {new Date().toLocaleString()}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Assessments</h1>
          <p className="text-gray-600">Search an employee by SID to view latest results per competency and assign a level.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" /> Find Employee by SID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter employee SID"
              value={searchSid}
              onChange={(e) => setSearchSid(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => refetch()} disabled={!searchSid || isFetching}>
              {isFetching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Completed Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competency</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">System Level</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">User Level</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Manager Level</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-center text-gray-500" colSpan={7}>No results found</td>
                  </tr>
                )}
                {results.map((r) => (
                  <tr key={r.sessionId}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.competencyName}</div>
                      <div className="text-xs text-gray-500">Session: {r.sessionId}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{r.percentageScore}%</td>
                    <td className="px-4 py-3 text-center">{r.correctAnswers}/{r.totalQuestions}</td>
                    <td className="px-4 py-3 text-center">{r.systemLevel || '-'}</td>
                    <td className="px-4 py-3 text-center">{r.userConfirmedLevel || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <Select
                        value={selectedLevels[r.sessionId] || r.managerSelectedLevel || ''}
                        onValueChange={(val) => setSelectedLevels(prev => ({ ...prev, [r.sessionId]: val }))}
                        disabled={Boolean(r.managerSelectedLevel)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssign(r.sessionId)}
                        disabled={Boolean(r.managerSelectedLevel) || !selectedLevels[r.sessionId] || saveMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" /> Assign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 flex items-center gap-2">
        <BadgeCheck className="h-4 w-4" /> Manager can override the user-confirmed level per session.
      </div>
    </div>
  );
};

export default ManagerAssessments;


