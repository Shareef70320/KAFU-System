import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, Layers } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';

const MyDevelopmentPaths = () => {
  const navigate = useNavigate();
  const { currentSid } = useUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-development-paths', currentSid],
    queryFn: async () => {
      if (!currentSid) return { assignments: [] };
      return (await api.get(`/development-paths/user/${currentSid}`)).data;
    },
    enabled: !!currentSid,
  });

  if (isLoading) return <div className="p-4 text-sm text-gray-600">Loading...</div>;
  if (isError) return <div className="p-4 text-sm text-red-600">Failed to load your development paths.</div>;

  const assignments = data?.assignments || [];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">My Development Paths</h2>
        <p className="text-sm text-gray-500">Paths assigned to you by Admin or via Groups.</p>
      </div>
      {assignments.length === 0 ? (
        <div className="text-sm text-gray-600">No development paths assigned yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((p) => (
            <Card key={p.id} className="hover:shadow-lg transition border-0 ring-1 ring-gray-100 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                    <Layers className="h-4 w-4" />
                  </span>
                  {p.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 mb-3 line-clamp-2">{p.description || 'No description'}</div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="h-4 w-4 text-sky-600" />
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 ring-1 ring-sky-100">{p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'}</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">{p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="mt-3">
                  <Button variant="outline" className="border-sky-200 hover:bg-sky-50" onClick={() => navigate(`/user/my-development-paths/${p.id}`)}>View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyDevelopmentPaths;


