import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Users,
  MapPin,
  Database,
  Upload,
  Link,
  ChevronDown,
  Menu,
  X,
  Home,
  GraduationCap,
} from 'lucide-react';
import clsx from 'clsx';

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
  onUploadClick: () => void;
  onConnectClick?: () => void;
}

export default function Sidebar({ onUploadClick, onConnectClick }: SidebarProps) {
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

    return (
      <NavLink
        to={item.path}
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
        <span className={clsx(
          'p-1.5 rounded-lg transition-colors',
          isActive(item.path) ? 'bg-primary-100' : 'bg-gray-100'
        )}>
          {item.icon}
        </span>
        <span>{item.name}</span>
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

      {/* Data Source */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <button
          onClick={() => {
            onUploadClick();
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm shadow-primary-500/25"
        >
          <Upload size={18} />
          <span>Upload Data</span>
        </button>
        <button
          onClick={() => {
            onConnectClick?.();
            setIsMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
        >
          <Link size={18} />
          <span>Connect Sheet</span>
        </button>
      </div>
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
