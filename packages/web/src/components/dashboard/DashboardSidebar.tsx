import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Lock,
  Settings, 
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Home,
  LifeBuoy,
  Shield
} from 'lucide-react';

const DashboardSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const dashboardItems = [
    { icon: Home, label: 'Overview', path: '/dashboard' },
    { icon: Server, label: 'Servers', path: '/dashboard?tab=servers' },
    { icon: Lock, label: 'Secrets', path: '/dashboard?tab=secrets' },
    // { icon: Settings, label: 'Settings', path: '/dashboard?tab=settings' },
    { icon: Activity, label: 'Analytics', path: '/dashboard?tab=analytics' },
    { icon: Shield, label: 'Private MCPs', path: '/dashboard?tab=private-mcps' },
    { icon: LifeBuoy, label: 'Enterprise Support', path: '/dashboard?tab=enterprise-support' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' && !location.search;
    }
    return location.pathname + location.search === path;
  };

  const collapsed = !hovered;

  return (
    <div
      className={`fixed left-0 top-16 bg-black backdrop-blur-sm border-r border-gray-800 transition-all duration-300 z-30 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ height: 'calc(100vh - 64px)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="pt-4 pb-6 px-2 space-y-6 overflow-y-auto h-full">
        <div>
          <nav className="space-y-1">
            {dashboardItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex ${collapsed ? 'items-center justify-center' : 'items-center gap-3 px-3'} py-2 rounded-lg text-sm transition-all duration-200 relative group ${
                    isActive(item.path)
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-gray-700">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <Separator className="bg-gray-800" />
      </div>
    </div>
  );
};

export default DashboardSidebar;
