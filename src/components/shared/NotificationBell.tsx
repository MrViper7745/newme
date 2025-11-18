'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications } from '@/lib/hooks';
import { formatDateRelative } from '@/lib/utils';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setIsOpen(false);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notifications - ${unreadCount} unread`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                disabled={unreadCount === 0}
              >
                Mark all read
              </button>
              <button
                onClick={handleToggle}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    notification.read ? 'bg-white' : 'bg-blue-50'
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className={`mr-3 h-2 w-2 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                    notification.type === 'success' ? 'bg-green-100 text-green-600' :
                    notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    notification.type === 'error' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                    {notification.type === 'success' && <Check className="h-3 w-3" />}
                    {notification.type === 'warning' && <span className="text-xs">!</span>}
                    {notification.type === 'error' && <X className="h-3 w-3" />}
                    {notification.type === 'info' && <span className="text-xs">i</span>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 pr-2">
                        {notification.title}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatDateRelative(notification.timestamp)}
                      </span>
                    </div>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {notification.message}
                    </p>
                    
                    {notification.action && (
                      <button
                        onClick={() => window.location.href = notification.action.url}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {notification.action.label}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="mb-4">
                  <Bell className="h-8 w-8 mx-auto text-gray-400" />
                </div>
                <p className="text-sm">No notifications</p>
                <p className="text-xs text-gray-400 mt-2">
                  All caught up with your notifications
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;