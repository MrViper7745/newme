'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard,
  Users,
  Settings,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Package,
  ShoppingCart,
  Store,
  Car,
  FileText,
  AlertTriangle,
  Headset,
  Megaphone,
  BarChart3,
  Shield,
  Code,
  HardDrive,
  Smartphone,
  PlayCircle,
  Map
  Gamepad2,
  Brain
  Star,
  TrendingUp,
  Menu as MenuIcon
} from 'lucide-react';
import { useSidebar, useTheme } from '@/lib/hooks';
import { NAVIGATION_CATEGORIES } from '@/lib/constants';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useSidebar();
  const { theme } = useTheme();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['dashboard']));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      newSet.add(categoryId);
      // Collapse other categories when expanding this one
        NAVIGATION_CATEGORIES.forEach(cat => {
          if (cat.id !== categoryId) {
            newSet.delete(cat.id);
          }
        });
      }
      return newSet;
    });
  };

  const isActive = (href: string) => {
    return router.pathname === href;
  };

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 border-r border-gray-200 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    } ${className}`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="ml-3 text-xl font-bold text-gray-900">Needster</span>
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
        {NAVIGATION_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <div key={category.id} className="mb-2">
              <button
                onClick={() => toggleCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors ${
                  isExpanded ? 'bg-orange-50 text-orange-600' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <category.icon className="h-5 w-5" />
                  <span className="ml-3 font-medium">
                    {!sidebarCollapsed && category.label}
                  </span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Sub-items */}
              {isExpanded && !sidebarCollapsed && (
                <div className="ml-8 space-y-1">
                  {category.items.map((item) => {
                    const active = isActive(item.href);
                    const badgeCount = item.badge || 0;
                    
                    return (
                      <a
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                          active
                            ? 'bg-orange-100 text-orange-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="ml-3 text-sm">
                          {item.label}
                        </span>
                        {badgeCount > 0 && (
                          <span className="ml-auto bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                            {badgeCount}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">12</span>
          </div>
          <div className="text-xs text-gray-500">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </div>
        </div>
        <div className="text-xs text-center text-gray-500 mt-2">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
};

export default Sidebar;