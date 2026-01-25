import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Users,
  MapPin,
  Database,
  // Upload, // Commented for production - uncomment for local dev
  ChevronDown,
  Menu,
  X,
  Home,
  GraduationCap,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { getStatus, refreshSharePointData } from '../../services/api';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: { name: string; path: string }[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', path: '/training', icon: <LayoutDashboard size={20} /> },
  { name: 'Pending Allotments', path: '/training/pending', icon: <AlertTriangle size={20} /> },
  {
    name: 'Utilization',
    path: '/training/utilization',
    icon: <BarChart3 size={20} />,
    children: [
      { name: 'By Program', path: '/training/utilization/program' },
      { name: 'By Client', path: '/training/utilization/client' },
      { name: 'By Date', path: '/training/utilization/date' },
      { name: 'By Trainer', path: '/training/utilization/trainer' },
    ],
  },
  { name: 'Programs', path: '/training/programs', icon: <BookOpen size={20} /> },
  { name: 'Trainers', path: '/training/trainers', icon: <Users size={20} /> },
  { name: 'Trainer Calendar', path: '/training/trainer-calendar', icon: <MapPin size={20} /> },
  { name: 'Data Explorer', path: '/training/data-explorer', icon: <Database size={20} /> },
];

interface SidebarProps {
  // onUploadClick: () => void; // Commented for production - uncomment for local dev
}

// Compact Sync Status for Sidebar
function SidebarSyncStatus() {
  const [status, setStatus] = useState<{
    is_connected: boolean;
    auto_refresh_enabled: boolean;
    last_sync: string | null;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await getStatus();
      if (response.sharepoint) {
        setStatus({
          is_connected: response.sharepoint.is_connected,
          auto_refresh_enabled: response.sharepoint.auto_refresh_enabled,
          last_sync: response.sharepoint.last_sync,
        });
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    // Ensure the date is treated as UTC if no timezone specified
    let date: Date;
    if (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)) {
      date = new Date(dateStr);
    } else {
      // Append 'Z' to treat as UTC
      date = new Date(dateStr + 'Z');
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return 'Just now'; // Handle slight clock differences
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'Over a day ago';
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshSharePointData();
      if (result.success) {
        fetchStatus();
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!status) return null;

  return (
    <div className="px-3 py-3 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2 min-w-0">
          {status.is_connected ? (
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Cloud size={14} className="text-green-600" />
            </div>
          ) : (
            <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <CloudOff size={14} className="text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">
              {status.is_connected ? 'Connected' : 'Offline'}
            </p>
            <div className="flex items-center gap-1">
              {status.auto_refresh_enabled && (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              )}
              <p className="text-[10px] text-gray-500 truncate">
                {status.is_connected ? formatLastSync(status.last_sync) : 'No data'}
              </p>
            </div>
          </div>
        </div>
        {status.is_connected && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 flex-shrink-0"
            title="Sync now"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </div>
  );
}

// For local dev with upload: function Sidebar({ onUploadClick }: SidebarProps)
export default function Sidebar(_props: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Utilization']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const isActive = (path: string) => {
    if (path === '/training') return location.pathname === '/training';
    return location.pathname.startsWith(path);
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const active = isActive(item.path);

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              active
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <div className="flex items-center gap-3">
              <span className={clsx(
                'p-1.5 rounded-lg transition-colors',
                active ? 'bg-primary-100' : 'bg-gray-100'
              )}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </div>
            <ChevronDown 
              size={16} 
              className={clsx(
                'transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} 
            />
          </button>
          {isExpanded && item.children && (
            <div className="ml-4 mt-1 pl-6 border-l-2 border-gray-100 space-y-1">
              {item.children.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'block px-3 py-2 rounded-lg text-sm transition-all',
                      isActive
                        ? 'bg-primary-100 text-primary-700 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    )
                  }
                >
                  {child.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Use 'end' prop for Dashboard to prevent it from matching all /training/* routes
    const isExactMatch = item.path === '/training';
    
    return (
      <NavLink
        to={item.path}
        end={isExactMatch}
        onClick={() => setIsMobileOpen(false)}
        className={({ isActive }) =>
          clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )
        }
      >
        {({ isActive }) => (
          <>
            <span className={clsx(
              'p-1.5 rounded-lg transition-colors',
              isActive ? 'bg-primary-100' : 'bg-gray-100'
            )}>
              {item.icon}
            </span>
            <span>{item.name}</span>
          </>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Back to Hubs Button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
      >
        <Home size={16} />
        <span>Back to Hub Selector</span>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">Training Hub</h1>
          <p className="text-xs text-gray-500">Analytics Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavItemComponent key={item.name} item={item} />
        ))}
      </nav>

      {/* Data Source - Upload only (SharePoint auto-connects via env vars) */}
      {/* <div className="px-3 py-3 border-t border-gray-100">
        <button
          onClick={() => {
            onUploadClick();
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm shadow-primary-500/25"
        >
          <Upload size={18} />
          <span>Upload Data</span>
        </button>
      </div> */}

      {/* Sync Status */}
      <SidebarSyncStatus />
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={clsx(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
