import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Download, Database, Search } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';

const API_BASE_URL = process.env.REACT_APP_API_BASE || '/api';

const ExportData = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['export-tables'],
    queryFn: async () => {
      const res = await api.get('/export/tables');
      return res.data?.tables || [];
    }
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data || [];
    return (data || []).filter(t => t.toLowerCase().includes(term));
  }, [search, data]);

  const handleDownload = async (table) => {
    try {
      const res = await api.get(`/export/table/${table}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${table}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Could not download this table.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
              <p className="text-sm text-gray-600">Download any database table as CSV (Excel-ready).</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
              <Input
                className="pl-9"
                placeholder="Search tables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <span className="text-xs text-gray-500">
                {filtered.length} of {data?.length || 0} tables
              </span>
            </div>
          </div>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tables</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-gray-500">Loading tables...</p>}
            {isError && <p className="text-sm text-red-600">Failed to load tables.</p>}
            {!isLoading && !isError && filtered.length === 0 && (
              <p className="text-sm text-gray-500">No tables found.</p>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map((table) => (
                <div
                  key={table}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{table}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDownload(table)}>
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportData;

