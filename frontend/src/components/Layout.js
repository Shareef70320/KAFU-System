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
  Layers,
  User,
  Upload,
  Target,
  BarChart3,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronRight,
  Info,
  Stethoscope,
  FileText,
  Shield,
  Database,
  TrendingUp
} from 'lucide-react';
import { Input } from './ui/input';
import { useUser } from '../contexts/UserContext';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [manuallyCollapsed, setManuallyCollapsed] = useState(new Set());
  const { currentRole, setCurrentRole, currentSid, setCurrentSid } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current user has clinic access (must be defined before useEffect)
  const hasClinicAccess = React.useMemo(() => {
    if (!currentSid) return false;
    try {
      const saved = localStorage.getItem('kafuClinicAccessList');
      const accessList = saved ? JSON.parse(saved) : [];
      return accessList.some(access => access.userId === currentSid);
    } catch (error) {
      console.error('Error checking clinic access:', error);
      return false;
    }
  }, [currentSid]);

  // Enforce role-safe routing on refresh and direct loads
  React.useEffect(() => {
    const path = location.pathname;
    const isAdminPath = path.startsWith('/dashboard') || path.startsWith('/users') || path.startsWith('/groups') || path.startsWith('/employees') || (path.startsWith('/competencies') && !path.startsWith('/competencies/view')) || path.startsWith('/jobs') || path.startsWith('/job-competency-mapping') || path.startsWith('/job-criticality') || path.startsWith('/job-evaluation') || path.startsWith('/successors') || path.startsWith('/assessors') || path.startsWith('/assessments') || path.startsWith('/question-bank') || path.startsWith('/photo-upload') || path.startsWith('/settings') || path.startsWith('/about');
    const isUserPath = path.startsWith('/user');
    const isClinicPath = path.startsWith('/kafu-clinic');

    if (currentRole === 'USER' && isAdminPath && !isClinicPath) {
      navigate('/user', { replace: true });
    } else if (currentRole === 'USER' && isClinicPath && !hasClinicAccess) {
      // Redirect users without clinic access away from clinic page
      navigate('/user', { replace: true });
    } else if (currentRole === 'ADMIN' && isUserPath) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentRole, location.pathname, navigate, hasClinicAccess]);

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

  // Check if current user is an assessor
  const { data: isAssessor } = useQuery({
    queryKey: ['is-assessor', currentSid],
    queryFn: async () => {
      if (!currentSid) return false;
      try {
        const response = await api.get(`/assessors/check/${currentSid}`);
        return response.data?.isAssessor || false;
      } catch (error) {
        console.error('Error checking assessor status:', error);
        return false;
      }
    },
    enabled: !!currentSid
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
    {
      name: 'Succession Planning',
      href: '/succession-planning',
      icon: TrendingUp,
      subMenu: [
        { name: 'Job Criticality', href: '/job-criticality', icon: Target },
        { name: 'Job Evaluation', href: '/job-evaluation', icon: BarChart3 },
        { name: 'Successors', href: '/successors', icon: Users }
      ]
    },
    { name: 'Assessors', href: '/assessors', icon: UserCheck },
    { name: 'Assessments', href: '/assessments', icon: Target },
    { name: 'Question Bank', href: '/question-bank', icon: BookOpen },
    { name: 'Photo Upload', href: '/photo-upload', icon: Upload },
    { name: 'Development Paths', href: '/development-paths', icon: Layers },
    { name: 'L&D Interventions', href: '/ld-interventions', icon: BookOpen },
    {
      name: 'Settings',
      href: '/settings', 
      icon: Settings,
      subMenu: [
        { name: 'Competency Levels', href: '/settings/level-terminology', icon: Target },
        { name: 'Assessment Cycle', href: '/settings/assessment-cycle', icon: Calendar },
        { name: 'Export Data', href: '/settings/export-data', icon: Database }
      ]
    },
    {
      name: 'Kafu Clinic',
      href: '/kafu-clinic',
      icon: Stethoscope,
      subMenu: [
        { name: 'Edit Requests Review', href: '/kafu-clinic/edit-requests', icon: FileText },
        { name: 'Clinic Access', href: '/kafu-clinic?tab=access', icon: Shield }
      ]
    },
    { name: 'About', href: '/about', icon: Info },
  ];
  
  // Assessor navigation for admins (if admin is also an assessor)
  const adminAssessorNavigation = [
    { name: 'Assessor Dashboard', href: '/assessor-dashboard', icon: BarChart3 },
  ];

  // Base user navigation (for all users)
  const baseUserNavigation = [
    { name: 'Dashboard', href: '/user', icon: LayoutDashboard },
    { name: 'My Profile', href: '/user/profile', icon: User },
    { name: 'My Competencies', href: '/user/competencies', icon: BookOpen },
    { name: 'Assessments', href: '/user/assessments', icon: UserCheck },
    { name: 'My IDP', href: '/user/my-idp', icon: Target },
    { name: 'Reviews', href: '/user/reviews', icon: MessageSquare },
    { name: 'My Development Paths', href: '/user/my-development-paths', icon: Layers },
    { name: 'About', href: '/about', icon: Info },
  ];
  
  // Assessor-specific navigation (only for users who are assessors)
  const assessorNavigation = [
    { name: 'Assessor Dashboard', href: '/assessor-dashboard', icon: BarChart3 },
  ];

  // Manager-specific navigation (only for users with direct reports)
  const managerNavigation = [
    { name: 'My Team', href: '/user/team', icon: Users },
    { name: 'Team Jobs', href: '/user/jobs', icon: Briefcase },
    { name: 'Team JCPs', href: '/user/jcps', icon: BookOpen },
    { name: 'Manager Assessments', href: '/user/manager-assessments', icon: BarChart3 },
  ];

  // Clinic-specific navigation (only for users with clinic access)
  const clinicNavigation = [
    { name: 'Kafu Clinic', href: '/kafu-clinic', icon: Stethoscope },
  ];

  const getNavigation = () => {
    switch (currentRole) {
      case 'ADMIN': 
        // Add assessor dashboard if admin is also an assessor
        let adminNav = [...adminNavigation];
        if (isAssessor) {
          adminNav = [...adminNav, ...adminAssessorNavigation];
        }
        return adminNav;
      case 'USER': 
        // Build navigation based on user roles
        let nav = [...baseUserNavigation];
        // Add manager pages if user is a manager
        if (isManager) {
          nav = [...nav, ...managerNavigation];
        }
        // Add assessor pages if user is an assessor
        if (isAssessor) {
          nav = [...nav, ...assessorNavigation];
        }
        // Add clinic pages if user has clinic access
        if (hasClinicAccess) {
          nav = [...nav, ...clinicNavigation];
        }
        return nav;
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

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleSubMenu = (menuName) => {
    setExpandedMenus(prev => {
      const newState = {
        ...prev,
        [menuName]: !prev[menuName]
      };
      // Track manual collapse/expand
      if (newState[menuName]) {
        // Expanding - remove from manually collapsed set
        setManuallyCollapsed(prevSet => {
          const newSet = new Set(prevSet);
          newSet.delete(menuName);
          return newSet;
        });
      } else {
        // Collapsing - add to manually collapsed set
        setManuallyCollapsed(prevSet => {
          const newSet = new Set(prevSet);
          newSet.add(menuName);
          return newSet;
        });
      }
      return newState;
    });
  };

  const hasActiveSubMenu = (item) => {
    if (!item.subMenu) return false;
    return item.subMenu.some(subItem => isActive(subItem.href));
  };

  // Auto-expand menus with active sub-items (unless manually collapsed)
  React.useEffect(() => {
    const nav = getNavigation();
    nav.forEach(item => {
      if (item.subMenu && hasActiveSubMenu(item) && !manuallyCollapsed.has(item.name)) {
        setExpandedMenus(prev => ({ ...prev, [item.name]: true }));
      }
    });
  }, [location.pathname, currentRole, isManager, manuallyCollapsed]);

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
              <span className="ml-2 text-[10px] font-semibold text-red-600" data-testid="build-indicator">CHANGES ACTIVE</span>
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
                const hasSubMenu = item.subMenu && item.subMenu.length > 0;
                const isManuallyCollapsed = manuallyCollapsed.has(item.name);
                const isExpanded = isManuallyCollapsed 
                  ? expandedMenus[item.name] 
                  : (expandedMenus[item.name] || hasActiveSubMenu(item));
                const isItemActive = isActive(item.href) || hasActiveSubMenu(item);

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => {
                        if (hasSubMenu) {
                          toggleSubMenu(item.name);
                        } else {
                          navigate(item.href);
                          setSidebarOpen(false);
                        }
                      }}
                      className={`group flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        isItemActive
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        {item.name}
                      </div>
                      {hasSubMenu && (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      )}
                    </button>
                    {hasSubMenu && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.subMenu.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <button
                              key={subItem.name}
                              onClick={() => {
                                navigate(subItem.href);
                                setSidebarOpen(false);
                              }}
                              className={`group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                                isActive(subItem.href)
                                  ? 'bg-green-50 text-green-700 border-l-2 border-green-600'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <SubIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                              {subItem.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
              const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              const isManuallyCollapsed = manuallyCollapsed.has(item.name);
              const isExpanded = isManuallyCollapsed 
                ? expandedMenus[item.name] 
                : (expandedMenus[item.name] || hasActiveSubMenu(item));
              const isItemActive = isActive(item.href) || hasActiveSubMenu(item);

              return (
                <div key={item.name}>
                  <button
                    onClick={() => {
                      if (hasSubMenu) {
                        toggleSubMenu(item.name);
                      } else {
                        navigate(item.href);
                      }
                    }}
                    className={`group flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      isItemActive
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </div>
                    {hasSubMenu && (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    )}
                  </button>
                  {hasSubMenu && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subMenu.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <button
                            key={subItem.name}
                            onClick={() => navigate(subItem.href)}
                            className={`group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                              isActive(subItem.href)
                                ? 'bg-green-50 text-green-700 border-l-2 border-green-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <SubIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                            {subItem.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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