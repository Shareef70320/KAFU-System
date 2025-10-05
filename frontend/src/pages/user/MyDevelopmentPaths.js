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
            <Card key={p.id} className="hover:shadow-md transition">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {p.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-2">{p.description || 'No description'}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'} → {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="mt-3">
                  <Button variant="outline" onClick={() => navigate(`/user/my-development-paths/${p.id}`)}>View Details</Button>
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


