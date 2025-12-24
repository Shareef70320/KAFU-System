import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  BookOpen, 
  Target,
  Users,
  Briefcase
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole } = useUser();

  // Only show on mobile and for USER role
  if (currentRole !== 'USER') {
    return null;
  }

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/user',
      label: 'Home'
    },
    {
      name: 'Profile',
      icon: User,
      path: '/user/profile',
      label: 'Profile'
    },
    {
      name: 'Competencies',
      icon: BookOpen,
      path: '/user/competencies',
      label: 'Competencies'
    },
    {
      name: 'Assessments',
      icon: Target,
      path: '/user/assessments',
      label: 'Assessments'
    },
    {
      name: 'Team',
      icon: Users,
      path: '/user/team',
      label: 'Team'
    }
  ];

  const isActive = (path) => {
    if (path === '/user') {
      return location.pathname === '/user' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`h-5 w-5 mb-1 ${active ? 'text-green-600' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;

