import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Activity,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCog,
  BookOpen
} from 'lucide-react';
import api from '../lib/api';

const Dashboard = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);

  useEffect(() => {
    const fetchEmployeesCount = async () => {
      try {
        // Use a large limit to fetch all employees and derive total count
        const res = await api.get('/employees?limit=2000');
        const count = Array.isArray(res.data?.employees) ? res.data.employees.length : 0;
        setTotalEmployees(count);
      } catch (_) {
        // Leave default 0 on error; dashboard remains functional
      }
    };
    fetchEmployeesCount();
  }, []);

  // Stats, with Total Users driven by employees count
  const stats = [
    {
      name: 'Total Users',
      value: totalEmployees.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Groups',
      value: '45',
      change: '+8%',
      changeType: 'positive',
      icon: UserCheck,
      color: 'bg-green-500'
    },
    {
      name: 'Competencies',
      value: '156',
      change: '+23%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      name: 'Assessments',
      value: '89',
      change: '+5%',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-orange-500'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'user_created',
      message: 'New user John Doe was added to the system',
      time: '2 minutes ago',
      icon: Users,
      color: 'text-green-600'
    },
    {
      id: 2,
      type: 'group_updated',
      message: 'Marketing team group was updated',
      time: '15 minutes ago',
      icon: UserCheck,
      color: 'text-blue-600'
    },
    {
      id: 3,
      type: 'assessment_completed',
      message: 'Sarah Wilson completed her competency assessment',
      time: '1 hour ago',
      icon: CheckCircle,
      color: 'text-purple-600'
    },
    {
      id: 4,
      type: 'system_alert',
      message: 'System maintenance scheduled for tonight',
      time: '2 hours ago',
      icon: AlertCircle,
      color: 'text-orange-600'
    }
  ];

  const quickActions = [
    {
      name: 'Add New User',
      description: 'Create a new user account',
      icon: Users,
      href: '/users',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Create Group',
      description: 'Set up a new user group',
      icon: UserCheck,
      href: '/groups',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Manage Employees',
      description: 'View and manage employee data',
      icon: UserCog,
      href: '/employees',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      name: 'Competency Framework',
      description: 'Manage skills and competencies',
      icon: BookOpen,
      href: '/competencies',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="loyverse-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-500">Welcome back!</h1>
            <p className="text-gray-600">Here's what's happening with your competency framework system.</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="loyverse-card">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <p className={`ml-2 text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="loyverse-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              View all
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${activity.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="loyverse-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.name}
                  onClick={() => window.location.href = action.href}
                  className={`${action.color} text-white p-4 rounded-lg text-left transition-colors duration-200`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{action.name}</p>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="loyverse-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-500">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">API Services</p>
              <p className="text-xs text-gray-500">Running normally</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">File Storage</p>
              <p className="text-xs text-gray-500">85% capacity used</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;