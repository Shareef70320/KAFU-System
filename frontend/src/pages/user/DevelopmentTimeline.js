import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Calendar, Layers } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';

const DevelopmentTimeline = () => {
  const { currentSid } = useUser();
  const { data } = useQuery({
    queryKey: ['user-dev-paths', currentSid],
    queryFn: async () => {
      const res = await api.get(`/development-paths/user/${currentSid}`);
      return res.data;
    },
    enabled: !!currentSid
  });

  const source = data?.assignments || data?.paths || [];
  const items = source.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    start: p.start_date ? new Date(p.start_date) : null,
    end: p.end_date ? new Date(p.end_date) : null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Development Paths</h1>
      {items.length === 0 ? (
        <div className="text-gray-600">No development paths assigned yet.</div>
      ) : (
        <UserPaths items={items} />
      )}
    </div>
  );
};

export default DevelopmentTimeline;


const UserPaths = ({ items }) => {
  const [selectedId, setSelectedId] = React.useState(null);
  const { data: detail, refetch, isFetching } = useQuery({
    queryKey: ['dev-path-detail', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const res = await api.get(`/development-paths/${selectedId}`);
      return res.data;
    },
    enabled: !!selectedId
  });

  const openDetails = (id) => {
    setSelectedId(id);
    // ensure fetch on open
    setTimeout(() => refetch(), 0);
  };

  return (
    <>
      <div className="space-y-4">
        {items.map((it) => (
          <Card key={it.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2"><Layers className="h-5 w-5 text-green-600" /> {it.name}</span>
                <button className="text-sm text-blue-600 hover:underline" onClick={() => openDetails(it.id)}>Details</button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{it.description || '—'}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar className="h-4 w-4" />
                <span>{it.start ? it.start.toLocaleDateString() : 'N/A'} → {it.end ? it.end.toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Path Details</h3>
                <p className="text-sm text-gray-600">Full details of your development path</p>
              </div>
              <button className="text-sm text-gray-600" onClick={() => setSelectedId(null)}>Close</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {!detail ? (
                <div className="text-sm text-gray-500">{isFetching ? 'Loading…' : 'No details found'}</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{detail.path?.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{detail.path?.description || '—'}</div>
                    <div className="text-sm text-gray-500 mt-1">{detail.path?.start_date || 'N/A'} → {detail.path?.end_date || 'N/A'}</div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Interventions</div>
                    {(!detail.interventions || detail.interventions.length === 0) ? (
                      <div className="text-sm text-gray-500">No interventions yet.</div>
                    ) : (
                      <div className="relative pl-8">
                        <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-gray-200" />
                        {detail.interventions.map((iv) => (
                          <div key={iv.id} className="relative mb-4">
                            <div className="absolute -left-2 top-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white shadow" />
                            <div className="ml-2 border rounded-md p-3 bg-white">
                              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">{iv.title} <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">{iv.type}</span></div>
                              <div className="text-xs text-gray-600 mt-1">{iv.description || '—'}</div>
                              <div className="text-xs text-gray-500 mt-1">{iv.start_date || 'N/A'} → {iv.end_date || 'N/A'} • {iv.duration_hours || 0}h</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end">
              <button className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200" onClick={() => setSelectedId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


