import React, { useState } from 'react';
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

const Groups = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  // Mock data
  const groups = [
    {
      id: 1,
      name: 'Management',
      description: 'Senior management and executives',
      memberCount: 5,
      createdDate: '2024-01-01',
      color: 'bg-blue-500'
    },
    {
      id: 2,
      name: 'Marketing',
      description: 'Marketing and communications team',
      memberCount: 12,
      createdDate: '2024-01-02',
      color: 'bg-green-500'
    },
    {
      id: 3,
      name: 'Development',
      description: 'Software development team',
      memberCount: 18,
      createdDate: '2024-01-03',
      color: 'bg-purple-500'
    },
    {
      id: 4,
      name: 'Sales',
      description: 'Sales and business development',
      memberCount: 8,
      createdDate: '2024-01-04',
      color: 'bg-orange-500'
    },
    {
      id: 5,
      name: 'HR',
      description: 'Human resources department',
      memberCount: 6,
      createdDate: '2024-01-05',
      color: 'bg-pink-500'
    }
  ];

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      // Here you would typically make an API call
      console.log('Adding group:', { name: newGroupName, description: newGroupDescription });
      setNewGroupName('');
      setNewGroupDescription('');
      setShowAddGroup(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups Management</h1>
          <p className="text-gray-600">Organize users into groups for better management</p>
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
                  {groups.reduce((sum, group) => sum + group.memberCount, 0)}
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
                <p className="text-sm font-medium text-gray-500">Departments</p>
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
                  {Math.round(groups.reduce((sum, group) => sum + group.memberCount, 0) / groups.length)}
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
        {filteredGroups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-10 w-10 rounded-lg ${group.color} flex items-center justify-center`}>
                    <UserCheck className="h-5 w-5 text-white" />
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Members</span>
                  <span className="font-medium text-gray-900">{group.memberCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium text-gray-900">{group.createdDate}</span>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => console.log('View group members:', group.id)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Members
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
    </div>
  );
};

export default Groups;