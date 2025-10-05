import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Calendar, Paperclip, SendHorizonal } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import api from '../../lib/api';

const PathDetailsUser = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const { currentSid } = useUser();
  const [newComments, setNewComments] = useState({}); // iid -> { text, file }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['path-detail', id],
    queryFn: async () => (await api.get(`/development-paths/${id}`)).data,
    enabled: !!id
  });

  const interventions = useMemo(() => data?.interventions || [], [data]);
  const path = data?.path;

  const fetchComments = (iid) => ({
    queryKey: ['intv-comments', iid],
    queryFn: async () => (await api.get(`/development-paths/interventions/${iid}/comments`)).data,
    enabled: !!iid,
  });

  const addComment = useMutation({
    mutationFn: async ({ iid, text, file }) => {
      const form = new FormData();
      form.append('author_sid', currentSid);
      if (text) form.append('comment', text);
      if (file) form.append('attachment', file);
      return (await api.post(`/development-paths/interventions/${iid}/comments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries(['intv-comments', variables.iid]);
      setNewComments((s) => ({ ...s, [variables.iid]: { text: '', file: null } }));
    }
  });

  if (isLoading) return <div className="p-4 text-sm text-gray-600">Loading...</div>;
  if (isError) return <div className="p-4 text-sm text-red-600">Failed to load path details.</div>;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{path?.name}</h2>
        <p className="text-sm text-gray-600">{path?.description}</p>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
          <Calendar className="h-4 w-4" />
          <span>{path?.start_date ? new Date(path.start_date).toLocaleDateString() : 'N/A'} → {path?.end_date ? new Date(path.end_date).toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {interventions.map(iv => (
          <Card key={iv.id}>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">{iv.intervention_name} <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">{iv.intervention_type || 'Unknown Type'}</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{iv.start_date ? iv.start_date.split('T')[0] : 'N/A'} → {iv.end_date ? iv.end_date.split('T')[0] : 'N/A'} • {iv.duration_hours || 0}h</span>
                </div>
                {iv.description && <div className="mt-2">{iv.description}</div>}
              </div>

              {/* Comments list */}
              <CommentsList iid={iv.id} fetchConfig={fetchComments(iv.id)} />

              {/* Add comment */}
              <div className="mt-3 border-t pt-3">
                <Label className="text-sm">Add Comment / Attachment</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComments[iv.id]?.text || ''}
                    onChange={e => setNewComments(s => ({ ...s, [iv.id]: { ...(s[iv.id] || {}), text: e.target.value } }))}
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-2 border rounded cursor-pointer text-sm text-gray-700 hover:bg-gray-50">
                    <Paperclip className="h-4 w-4" /> Attach
                    <input type="file" className="hidden" onChange={e => setNewComments(s => ({ ...s, [iv.id]: { ...(s[iv.id] || {}), file: e.target.files?.[0] || null } }))} />
                  </label>
                  <Button
                    disabled={addComment.isPending || (!newComments[iv.id]?.text && !newComments[iv.id]?.file)}
                    onClick={() => addComment.mutate({ iid: iv.id, text: newComments[iv.id]?.text, file: newComments[iv.id]?.file })}
                  >
                    {addComment.isPending ? 'Posting...' : (<span className="inline-flex items-center gap-1"><SendHorizonal className="h-4 w-4" /> Post</span>)}
                  </Button>
                </div>
                {newComments[iv.id]?.file && (
                  <div className="text-xs text-gray-600 mt-1">Attached: {newComments[iv.id].file.name}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const CommentsList = ({ iid, fetchConfig }) => {
  const { data } = useQuery(fetchConfig);
  const comments = data?.comments || [];
  if (!comments.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {comments.map(c => (
        <div key={c.id} className="text-sm border rounded p-2">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-900">{c.first_name} {c.last_name}</div>
            <div className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
          </div>
          {c.comment && <div className="mt-1 text-gray-700">{c.comment}</div>}
          {c.attachment_url && (
            <div className="mt-1">
              <a className="text-blue-600 underline text-xs" href={c.attachment_url} target="_blank" rel="noreferrer">View attachment</a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PathDetailsUser;


