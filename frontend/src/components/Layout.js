import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { 
  Users, 
  UserCheck, 
  LayoutDashboard, 
  Menu, 
  X,
  Building2,
  Bell,
  Search,
  Settings,
  LogOut,
  UserCog,
  BookOpen,
  Briefcase,
  Link,
  User,
  Upload,
  Target,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { Input } from './ui/input';
import { useUser } from '../contexts/UserContext';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentRole, setCurrentRole, currentSid, setCurrentSid } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Enforce role-safe routing on refresh and direct loads
  React.useEffect(() => {
    const path = location.pathname;
    const isAdminPath = path.startsWith('/dashboard') || path.startsWith('/users') || path.startsWith('/groups') || path.startsWith('/employees') || path.startsWith('/competencies') || path.startsWith('/jobs') || path.startsWith('/job-competency-mapping') || path.startsWith('/job-criticality') || path.startsWith('/job-evaluation') || path.startsWith('/assessors') || path.startsWith('/assessments') || path.startsWith('/question-bank') || path.startsWith('/photo-upload');
    const isUserPath = path.startsWith('/user');

    if (currentRole === 'USER' && isAdminPath) {
      navigate('/user', { replace: true });
    } else if (currentRole === 'ADMIN' && isUserPath) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentRole, location.pathname, navigate]);

  // Check if current user is a manager (has direct reports)
  const { data: isManager } = useQuery({
    queryKey: ['is-manager', currentSid],
    queryFn: async () => {
      if (!currentSid || currentRole !== 'USER') return false;
      const response = await api.get('/employees?limit=2000');
      const employees = response.data.employees || response.data;
      return employees.filter(emp => emp.line_manager_sid === currentSid).length > 0;
    },
    enabled: !!currentSid && currentRole === 'USER'
  });

  // Admin navigation
  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Groups', href: '/groups', icon: UserCheck },
    { name: 'Employees', href: '/employees', icon: UserCog },
    { name: 'Competencies', href: '/competencies', icon: BookOpen },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Job-Competency Mapping', href: '/job-competency-mapping', icon: Link },
    { name: 'Job Criticality', href: '/job-criticality', icon: Target },
    { name: 'Job Evaluation', href: '/job-evaluation', icon: BarChart3 },
    { name: 'Assessors', href: '/assessors', icon: UserCheck },
    { name: 'Assessor Dashboard', href: '/assessor-dashboard', icon: BarChart3 },
    { name: 'Assessments', href: '/assessments', icon: Target },
    { name: 'Question Bank', href: '/question-bank', icon: BookOpen },
    { name: 'Photo Upload', href: '/photo-upload', icon: Upload },
  ];

  // Base user navigation (for all users)
  const baseUserNavigation = [
    { name: 'Dashboard', href: '/user', icon: LayoutDashboard },
    { name: 'My Profile', href: '/user/profile', icon: User },
    { name: 'My Competencies', href: '/user/competencies', icon: BookOpen },
    { name: 'Assessments', href: '/user/assessments', icon: UserCheck },
    { name: 'Reviews', href: '/user/reviews', icon: MessageSquare },
    { name: 'Assessor Dashboard', href: '/assessor-dashboard', icon: BarChart3 },
  ];

  // Manager-specific navigation (only for users with direct reports)
  const managerNavigation = [
    { name: 'My Team', href: '/user/team', icon: Users },
    { name: 'Team Jobs', href: '/user/jobs', icon: Briefcase },
    { name: 'Team JCPs', href: '/user/jcps', icon: BookOpen },
    { name: 'Manager Assessments', href: '/user/manager-assessments', icon: BarChart3 },
  ];

  const getNavigation = () => {
    switch (currentRole) {
      case 'ADMIN': 
        return adminNavigation;
      case 'USER': 
        // Show manager pages only if user is actually a manager
        return isManager ? [...baseUserNavigation, ...managerNavigation] : baseUserNavigation;
      default: 
        // Default to USER nav to prevent accidental admin exposure
        return baseUserNavigation;
    }
  };

  const navigation = getNavigation();

  // Mock user data for display
  const user = currentRole === 'ADMIN' 
    ? {
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        sid: 'ADMIN',
        jobTitle: 'System Administrator',
        division: 'IT',
        unit: 'System Administration',
        grade: 'N/A',
        location: 'Head Office',
        email: 'admin@kafu.com'
      }
    : {
        firstName: 'Loading...',
        lastName: '',
        role: currentRole,
        sid: currentSid,
        jobTitle: 'Loading...',
        division: 'Loading...',
        unit: 'Loading...',
        grade: 'Loading...',
        location: 'Loading...',
        email: `${currentSid}@omanairports.com`
      };

  const handleRoleChange = (newRole) => {
    setCurrentRole(newRole);
    // Navigate to appropriate dashboard based on role
    switch (newRole) {
      case 'ADMIN':
        navigate('/dashboard');
        break;
      case 'USER':
        navigate('/user');
        break;
      default:
        navigate('/user');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with mobile menu and Role/SID switcher */}
      <div className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur border-b border-gray-200 text-xs px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-gray-800">
              <Building2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold">KAFU System</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Role</span>
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => handleRoleChange('USER')}
                  className={`px-2 py-1 text-xs border ${currentRole === 'USER' ? 'bg-white text-gray-900 border-gray-300' : 'bg-gray-50 text-gray-600 border-gray-200' } rounded-l-md`}
                >
                  USER
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`px-2 py-1 text-xs border-t border-b border-r ${currentRole === 'ADMIN' ? 'bg-white text-gray-900 border-gray-300' : 'bg-gray-50 text-gray-600 border-gray-200' } rounded-r-md`}
                >
                  ADMIN
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">SID</span>
              <div className="w-32">
                <Input
                  value={currentSid || ''}
                  placeholder="Enter SID"
                  onChange={(e) => setCurrentSid(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-green-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">KAFU</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto bg-white shadow-lg">
          <div className="flex h-16 items-center px-4">
            <Building2 className="h-8 w-8 text-green-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">KAFU System</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        <div className="min-h-screen px-4 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;