import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Users,
  Edit,
  Trash2,
  MoreVertical,
  Building2,
  UserPlus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import EmployeePhoto from '../components/EmployeePhoto';

const Groups = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const queryClient = useQueryClient();

  // Fetch groups with member counts
  const { data: groupsData, isLoading, error } = useQuery({
    queryKey: ['groups', searchTerm],
    queryFn: async () => {
      const res = await api.get(`/groups?page=1&limit=1000${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const groups = useMemo(() => groupsData?.groups || [], [groupsData]);

  // Group avatar helpers
  const getGroupInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getColorForName = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate({ name: newGroupName.trim(), description: newGroupDescription.trim() || undefined });
    }
  };

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (payload) => api.post('/groups', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowAddGroup(false);
    }
  });

  // Employees for member assignment
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-groups'],
    queryFn: async () => {
      const res = await api.get('/employees?page=1&limit=10000');
      return res.data?.employees || [];
    }
  });

  // Load group details when opening members modal
  const { data: activeGroupDetails } = useQuery({
    queryKey: ['group-detail', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup?.id) return null;
      const res = await api.get(`/groups/${activeGroup.id}`);
      return res.data?.group;
    },
    enabled: !!activeGroup?.id && showMembersModal,
  });

  useEffect(() => {
    if (activeGroupDetails?.members?.length) {
      setSelectedEmployeeIds(new Set(activeGroupDetails.members.map(m => m.id)));
    } else {
      setSelectedEmployeeIds(new Set());
    }
  }, [activeGroupDetails]);

  const toggleEmployeeSelected = (empId) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const assignMembersMutation = useMutation({
    mutationFn: ({ groupId, employeeIds }) => api.post(`/groups/${groupId}/members`, { employeeIds: Array.from(employeeIds) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      queryClient.invalidateQueries(['group-detail', activeGroup?.id]);
      setShowMembersModal(false);
    }
  });

  const filteredEmployees = useMemo(() => {
    const list = employeesData || [];
    if (!memberSearch.trim()) return list;
    const q = memberSearch.toLowerCase();
    return list.filter(e =>
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.sid?.toLowerCase().includes(q) ||
      e.job_title?.toLowerCase().includes(q)
    );
  }, [employeesData, memberSearch]);

  const selectedEmployeesList = useMemo(() => {
    const map = new Map((employeesData || []).map(e => [e.id, e]));
    return Array.from(selectedEmployeeIds).map(id => map.get(id)).filter(Boolean);
  }, [employeesData, selectedEmployeeIds]);

  const toggleAllFiltered = () => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      const allSelected = filteredEmployees.every(e => next.has(e.id));
      if (allSelected) {
        filteredEmployees.forEach(e => next.delete(e.id));
      } else {
        filteredEmployees.forEach(e => next.add(e.id));
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Users className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Error loading groups</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#dc2626' }} data-testid="groups-title">Groups Management</h1>
          <p className="text-gray-600">Organize employees into groups for bulk management</p>
        </div>
        <Button
          onClick={() => setShowAddGroup(true)}
          className="loyverse-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Groups</p>
                <p className="text-2xl font-semibold text-gray-900">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {groups.reduce((sum, group) => sum + (group.member_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Groups Listed</p>
                <p className="text-2xl font-semibold text-gray-900">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg. per Group</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {groups.length ? Math.round(groups.reduce((sum, g) => sum + (g.member_count || 0), 0) / groups.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-inner`}
                    style={{ backgroundColor: getColorForName(group.name) }}
                    title={group.name}
                  >
                    {getGroupInitials(group.name)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Avatar Stack */}
                <div className="flex items-center gap-0.5">
                  {(group.preview_members || []).slice(0,5).map((m, idx) => (
                    <div key={m.id} className="relative" style={{ zIndex: 10 - idx }}>
                      <div className={`-ml-2 first:ml-0`}>
                        <EmployeePhoto sid={m.sid} firstName={m.first_name} lastName={m.last_name} size="small" />
                      </div>
                    </div>
                  ))}
                  {group.member_count > 5 && (
                    <div className="-ml-2 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-700">
                      +{group.member_count - 5}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Members</span>
                  <span className="font-medium text-gray-900">{group.member_count || 0}</span>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setActiveGroup(group); setShowMembersModal(true); }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Group Modal */}
      {showAddGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="groupDescription">Description</Label>
                <Input
                  id="groupDescription"
                  placeholder="Enter group description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowAddGroup(false)}
                  className="loyverse-button-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddGroup}
                  className="loyverse-button"
                >
                  Create Group
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && activeGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-inner flex-shrink-0`}
                    style={{ backgroundColor: getColorForName(activeGroup.name) }}
                    title={activeGroup.name}
                  >
                    {getGroupInitials(activeGroup.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">Manage Members</h3>
                    <p className="text-sm text-gray-600 truncate">{activeGroup.name} • Current members: {activeGroupDetails?.members?.length || 0}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Selected: {selectedEmployeeIds.size}</div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Search and list */}
              <div className="lg:col-span-2">
                <Label htmlFor="memberSearch">Search Employees</Label>
                <div className="relative mt-1 mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="memberSearch"
                    placeholder="Search by name, email, SID, job title..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-600">Showing {filteredEmployees.length} employees</span>
                  <button onClick={toggleAllFiltered} className="text-blue-600 hover:underline">
                    {filteredEmployees.every(e => selectedEmployeeIds.has(e.id)) ? 'Unselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border rounded-md divide-y max-h-[50vh] overflow-y-auto">
                  {filteredEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <div className="min-w-0 flex items-center gap-3">
                        <EmployeePhoto sid={emp.sid} firstName={emp.first_name} lastName={emp.last_name} size="small" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{emp.first_name} {emp.last_name} {emp.sid ? `(SID: ${emp.sid})` : ''}</p>
                          <p className="text-xs text-gray-500 truncate">{emp.email} • {emp.job_title || 'N/A'} • {emp.location || 'N/A'}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600"
                        checked={selectedEmployeeIds.has(emp.id)}
                        onChange={() => toggleEmployeeSelected(emp.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Right: Selected summary */}
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">Selected Members ({selectedEmployeesList.length})</h4>
                  {selectedEmployeesList.length > 0 && (
                    <button onClick={() => setSelectedEmployeeIds(new Set())} className="text-xs text-red-600 hover:underline">Clear All</button>
                  )}
                </div>
                <div className="border rounded-md max-h-[50vh] overflow-y-auto divide-y">
                  {selectedEmployeesList.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No members selected</div>
                  ) : (
                    selectedEmployeesList.map(emp => (
                      <div key={emp.id} className="px-3 py-2 flex items-center justify-between">
                        <div className="min-w-0 flex items-center gap-3">
                          <EmployeePhoto sid={emp.sid} firstName={emp.first_name} lastName={emp.last_name} size="small" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-gray-500 truncate">{emp.email}</p>
                          </div>
                        </div>
                        <button className="text-xs text-gray-500 hover:text-red-600" onClick={() => toggleEmployeeSelected(emp.id)}>Remove</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-500">Changes will be applied to group membership</div>
              <div className="space-x-3">
                <Button
                  onClick={() => setShowMembersModal(false)}
                  className="loyverse-button-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => assignMembersMutation.mutate({ groupId: activeGroup.id, employeeIds: selectedEmployeeIds })}
                  disabled={assignMembersMutation.isPending}
                  className="loyverse-button"
                >
                  {assignMembersMutation.isPending ? 'Saving...' : 'Save Members'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;