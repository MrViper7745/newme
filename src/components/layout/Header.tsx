'use client';

import React from 'react';
import { Search, Bell, Settings, User, Sun, Moon } from 'lucide-react';
import { useNotifications, useUser } from '@/lib/hooks';
import { SearchBar } from '@/components/shared';
import { NotificationBell } from '@/components/shared';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { unreadCount } = useNotifications();
  const { user, logout } = useUser();

  return (
    <header className={`bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Search */}
          <div className="flex-1 flex items-center">
            <SearchBar
              placeholder="Search dashboard..."
              className="max-w-md"
              onSearch={(value) => console.log('Search:', value)}
            />
          </div>

          {/* Center - Logo/Brand */}
          <div className="flex items-center lg:hidden">
            <h1 className="text-xl font-bold text-gray-900">Needster</h1>
          </div>

          {/* Right side - User & Notifications */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <span className="text-gray-700">{SUPPORTED_LANGUAGES.find(lang => lang.code === 'en')?.flag}</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
            </div>

            {/* Notifications */}
            <NotificationBell />
            
            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md ml-2"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50">
                  Sign In
                </button>
                <button className="p-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 ml-2">
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
          <Search className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation - Desktop only */}
      <div className="hidden lg:flex items-center space-x-8 h-16 border-t border-gray-200">
        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
          Overview
        </div>
        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
          Analytics
        </div>
        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
          Support
        </div>
        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
          Settings
        </div>
      </div>
    </header>
  );
};

export default Header;