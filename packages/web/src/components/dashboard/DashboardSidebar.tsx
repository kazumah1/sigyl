import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  LayoutDashboard, 
  Server, 
  BarChart3, 
  Key, 
  Lock,
  Users, 
  Settings, 
  Store, 
  FileText, 
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  
  const dashboardItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
    { icon: Server, label: 'Servers', path: '/dashboard?tab=servers' },
    { icon: BarChart3, label: 'Analytics', path: '/dashboard?tab=analytics' },
    { icon: Key, label: 'API Keys', path: '/dashboard?tab=api-keys' },
    { icon: Lock, label: 'Secrets', path: '/dashboard?tab=secrets' },
    { icon: Settings, label: 'Settings', path: '/dashboard?tab=settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' && !location.search;
    }
    return location.pathname + location.search === path;
  };

  return (
    <div className={`fixed left-0 top-0 h-full border-r transition-all duration-300 z-30 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <div className="text-xl font-bold text-white">SIGYL</div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggle}
          className="text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
        <div>
          {!collapsed && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Dashboard
            </h3>
          )}
          <nav className="space-y-1">
            {dashboardItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative group ${
                    isActive(item.path)
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
