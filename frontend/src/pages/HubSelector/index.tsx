import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Truck, 
  Settings, 
  ArrowRight,
  BarChart3,
  Users,
  Calendar,
  Package,
  ClipboardList,
  Cog,
} from 'lucide-react';

interface HubCard {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  features: { icon: React.ReactNode; text: string }[];
  status: 'active' | 'coming-soon';
}

const hubs: HubCard[] = [
  {
    id: 'training',
    name: 'Training Hub',
    description: 'Manage training programs, trainer allocations, and track utilization metrics',
    path: '/training',
    icon: <GraduationCap size={32} />,
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-600',
    features: [
      { icon: <BarChart3 size={16} />, text: 'Dashboard & Analytics' },
      { icon: <Users size={16} />, text: 'Trainer Management' },
      { icon: <Calendar size={16} />, text: 'Program Scheduling' },
    ],
    status: 'active',
  },
  {
    id: 'delivery',
    name: 'Delivery Hub',
    description: 'Track deliveries, manage logistics, and monitor delivery performance',
    path: '/delivery',
    icon: <Truck size={32} />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    features: [
      { icon: <Package size={16} />, text: 'Delivery Tracking' },
      { icon: <ClipboardList size={16} />, text: 'Order Management' },
      { icon: <BarChart3 size={16} />, text: 'Performance Metrics' },
    ],
    status: 'coming-soon',
  },
  {
    id: 'ops',
    name: 'Ops Hub',
    description: 'Operations management, resource planning, and workflow optimization',
    path: '/ops',
    icon: <Settings size={32} />,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    features: [
      { icon: <Cog size={16} />, text: 'Workflow Management' },
      { icon: <Users size={16} />, text: 'Resource Planning' },
      { icon: <BarChart3 size={16} />, text: 'Operations Analytics' },
    ],
    status: 'coming-soon',
  },
];

export default function HubSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">LXD Analytics</h1>
                <p className="text-sm text-gray-500">Select a hub to continue</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to the LXD Analytics
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Access your organization's management hubs. Select a hub below to view dashboards, 
            analytics, and manage your operations.
          </p>
        </div>

        {/* Hub Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hubs.map((hub) => (
            <div
              key={hub.id}
              className={`relative bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 ${
                hub.status === 'active' 
                  ? 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer' 
                  : 'opacity-75'
              }`}
              onClick={() => hub.status === 'active' && navigate(hub.path)}
            >
              {/* Coming Soon Badge */}
              {hub.status === 'coming-soon' && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                    Coming Soon
                  </span>
                </div>
              )}

              {/* Gradient Header */}
              <div className={`h-32 bg-gradient-to-br ${hub.gradient} flex items-center justify-center`}>
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white">
                  {hub.icon}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{hub.name}</h3>
                <p className="text-gray-600 text-sm mb-6">{hub.description}</p>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {hub.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                      <div className={`p-1.5 rounded-lg bg-${hub.color}-100 text-${hub.color}-600`}>
                        {feature.icon}
                      </div>
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                {hub.status === 'active' ? (
                  <button
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${hub.gradient} text-white rounded-xl font-medium hover:shadow-lg transition-all`}
                  >
                    Open {hub.name}
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-indigo-50 rounded-xl">
              <div className="text-3xl font-bold text-indigo-600">1</div>
              <div className="text-sm text-gray-600 mt-1">Active Hub</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="text-3xl font-bold text-emerald-600">2</div>
              <div className="text-sm text-gray-600 mt-1">Coming Soon</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-3xl font-bold text-purple-600">3</div>
              <div className="text-sm text-gray-600 mt-1">Total Hubs</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <div className="text-3xl font-bold text-amber-600">∞</div>
              <div className="text-sm text-gray-600 mt-1">Possibilities</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>LXD Analytics • Built with React & FastAPI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
