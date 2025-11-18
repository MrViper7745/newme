import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  AppState, User, Notification, Metric, Order, AIRecommendation,
  ChartData, HeatmapData, RadarData, Theme, Language
} from './types';
import { 
  mockData, simulateRealtimeUpdates, mockNotifications,
  mockMetrics, mockOrders, mockDrivers
} from './mockData';
import { REFRESH_INTERVALS } from './constants';

// Global Application Context
const AppContext = createContext<{
  state: AppState;
  dispatch: (action: any) => void;
} | null>(null);

// App reducer for state management
const appReducer = (state: AppState, action: any): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'TOGGLE_THEME':
      return { 
        ...state, 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [action.payload, ...state.notifications] 
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        )
      };
    case 'SET_ACTIVE_MODULE':
      return { ...state, activeModule: action.payload };
    default:
      return state;
  }
};

// Initial app state
const initialAppState: AppState = {
  user: null,
  theme: 'light',
  sidebarCollapsed: false,
  notifications: mockNotifications,
  language: 'en',
  activeModule: 'overview'
};

// App Provider Component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = React.useReducer(appReducer, initialAppState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to access app state
export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
};

// Custom hook for real-time data fetching
export const useRealTimeData = <T>(
  dataKey: string,
  interval: number = REFRESH_INTERVALS.REAL_TIME
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = () => {
      try {
        setLoading(true);
        setError(null);

        // Simulate API call delay
        setTimeout(() => {
          switch (dataKey) {
            case 'metrics':
              setData(mockMetrics as T);
              break;
            case 'orders':
              setData(mockOrders as T);
              break;
            case 'drivers':
              setData(mockDrivers as T);
              break;
            case 'notifications':
              setData(mockNotifications as T);
              break;
            default:
              setData((mockData as any)[dataKey] as T);
          }
          setLoading(false);
        }, Math.random() * 1000 + 500); // 500-1500ms delay
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for real-time updates
    const intervalId = setInterval(() => {
      const updates = simulateRealtimeUpdates();
      
      if (dataKey === 'metrics' && updates.metricsUpdate) {
        setData([{
          ...mockMetrics[0],
          value: updates.metricsUpdate.activeOrders,
          change: Math.random() * 20 - 10, // Random change
        }] as T);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [dataKey, interval]);

  return { data, loading, error };
};

// Hook for mock data access
export const useMockData = <T>(key: keyof typeof mockData): T => {
  const [data, setData] = useState<T>((mockData as any)[key]);

  useEffect(() => {
    setData((mockData as any)[key]);
  }, [key]);

  return data;
};

// Hook for notification management
export const useNotifications = () => {
  const { state, dispatch } = useAppState();
  const notifications = state.notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}`,
      timestamp: new Date()
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  }, [dispatch]);

  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, [dispatch]);

  const markAllAsRead = useCallback(() => {
    notifications.forEach(notification => {
      if (!notification.read) {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notification.id });
      }
    });
  }, [dispatch, notifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead
  };
};

// Hook for theme management
export const useTheme = () => {
  const { state, dispatch } = useAppState();
  const { theme } = state;

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, [dispatch]);

  const setTheme = useCallback((newTheme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: newTheme });
  }, [dispatch]);

  useEffect(() => {
    // Apply theme to document root
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return { theme, toggleTheme, setTheme };
};

// Hook for language management
export const useLanguage = () => {
  const { state, dispatch } = useAppState();
  const { language } = state;

  const setLanguage = useCallback((newLanguage: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: newLanguage });
  }, [dispatch]);

  return { language, setLanguage };
};

// Hook for sidebar management
export const useSidebar = () => {
  const { state, dispatch } = useAppState();
  const { sidebarCollapsed } = state;

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, [dispatch]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: collapsed });
  }, [dispatch]);

  return { sidebarCollapsed, toggleSidebar, setSidebarCollapsed };
};

// Hook for user management
export const useUser = () => {
  const { state, dispatch } = useAppState();
  const { user } = state;

  const setUser = useCallback((userData: User | null) => {
    dispatch({ type: 'SET_USER', payload: userData });
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch({ type: 'SET_USER', payload: null });
  }, [dispatch]);

  return { user, setUser, logout };
};

// Hook for module tracking
export const useActiveModule = () => {
  const { state, dispatch } = useAppState();
  const { activeModule } = state;

  const setActiveModule = useCallback((module: string) => {
    dispatch({ type: 'SET_ACTIVE_MODULE', payload: module });
  }, [dispatch]);

  return { activeModule, setActiveModule };
};

// Hook for data filtering and searching
export const useDataFilter = <T>(data: T[], initialFilters: any = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [filteredData, setFilteredData] = useState<T[]>(data);

  useEffect(() => {
    let result = data;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((item: any) => 
        JSON.stringify(item).toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter((item: any) => item.status === filters.status);
    }

    // Apply date range filter
    if (filters.dateFrom) {
      result = result.filter((item: any) => 
        new Date(item.createdAt || item.timestamp) >= filters.dateFrom
      );
    }

    if (filters.dateTo) {
      result = result.filter((item: any) => 
        new Date(item.createdAt || item.timestamp) <= filters.dateTo
      );
    }

    setFilteredData(result);
  }, [data, filters]);

  const updateFilters = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    filteredData,
    updateFilters,
    clearFilters
  };
};

// Hook for pagination
export const usePagination = <T>(data: T[], pageSize: number = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    nextPage,
    prevPage,
    goToPage,
    setItemsPerPage,
    resetPagination,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

// Hook for AI recommendations
export const useAIRecommendations = () => {
  const [recommendations, setRecommendations] = useState(mockData.aiRecommendations);

  const applyRecommendation = useCallback((id: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === id ? { ...rec, applied: true } : rec
      )
    );
  }, []);

  const dismissRecommendation = useCallback((id: string) => {
    setRecommendations(prev => 
      prev.filter(rec => rec.id !== id)
    );
  }, []);

  useEffect(() => {
    // Simulate new AI recommendations
    const interval = setInterval(() => {
      const randomRecommendation = {
        id: `ai_${Date.now()}`,
        type: 'route_optimization' as const,
        title: 'New Optimization Available',
        description: 'AI detected an opportunity to improve efficiency',
        impact: 'medium' as const,
        action: {
          label: 'View Details',
          onClick: () => console.log('AI recommendation clicked')
        },
        createdAt: new Date(),
        applied: false
      };
      
      setRecommendations(prev => [randomRecommendation, ...prev].slice(0, 5));
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    recommendations,
    applyRecommendation,
    dismissRecommendation
  };
};

// Hook for real-time simulation
export const useRealtimeSimulation = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      
      // Simulate various real-time events
      const events = [
        'New order received',
        'Driver completed delivery',
        'New customer registered',
        'System performance alert',
        'AI recommendation generated'
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      console.log(`[SIMULATION] ${randomEvent} at ${new Date().toLocaleTimeString()}`);
    }, 8000); // Every 8 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  return { lastUpdate, isLive, setIsLive };
};

// Hook for local storage persistence
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [storedValue]);

  return [storedValue, setValue] as [T, (value: T | ((val: T) => T)) => void];
};

// Export all hooks for easy importing
export {
  AppProvider,
  useAppState,
  useRealTimeData,
  useMockData,
  useNotifications,
  useTheme,
  useLanguage,
  useSidebar,
  useUser,
  useActiveModule,
  useDataFilter,
  usePagination,
  useAIRecommendations,
  useRealtimeSimulation,
  useLocalStorage,
};