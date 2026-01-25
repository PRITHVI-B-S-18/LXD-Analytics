import { useState, useEffect } from 'react';
import {
  BookOpen,
  RefreshCw,
  CheckCircle,
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { PageHeader, KPICard, LoadingSpinner, EmptyState, PieChart, BarChart } from '../../../../components';
import { getDashboard, getStatus } from '../../../../services/api';
import type { DashboardResponse, StatusResponse } from '../../../../types';

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, statusData] = await Promise.all([
          getDashboard(),
          getStatus(),
        ]);
        setData(dashboardData);
        setStatus(statusData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!status?.is_loaded) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Overview of training programs and allocations"
        />
        <EmptyState
          title="Welcome to Training Dashboard"
          description="Upload an Excel file to get started with your training data visualization"
        />
      </>
    );
  }

  const metrics = data?.metrics;
  const completionRate = metrics?.total_programs 
    ? Math.round((metrics.completed / metrics.total_programs) * 100) 
    : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of training programs and allocations"
      />

      {/* File Info Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl border border-primary-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <FileSpreadsheet className="text-primary-600" size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{status.filename || 'Data File'}</p>
            <p className="text-xs text-gray-500">
              {status.allotment_rows.toLocaleString()} allotments • {status.trainer_rows.toLocaleString()} trainers • {status.datapoint_rows.toLocaleString()} data points
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={14} />
            Last updated: Just now
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard
          title="Total Programs"
          value={metrics?.total_programs || 0}
          subtitle="All training programs"
          icon={<BookOpen size={24} />}
          color="indigo"
          variant="gradient"
        />
        <KPICard
          title="Active Trainers"
          value={metrics?.active_trainers || 0}
          subtitle="Currently assigned"
          icon={<Users size={24} />}
          color="teal"
          variant="gradient"
        />
        <KPICard
          title="Pending Allotments"
          value={metrics?.pending_allotments || 0}
          subtitle="Need attention"
          icon={<AlertTriangle size={24} />}
          color="orange"
          variant="gradient"
        />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Ongoing"
          value={metrics?.ongoing || 0}
          icon={<RefreshCw size={20} />}
          color="yellow"
          variant="outlined"
          size="sm"
        />
        <KPICard
          title="Completed"
          value={metrics?.completed || 0}
          icon={<CheckCircle size={20} />}
          color="green"
          variant="outlined"
          size="sm"
        />
        <KPICard
          title="Upcoming"
          value={metrics?.upcoming || 0}
          icon={<Calendar size={20} />}
          color="purple"
          variant="outlined"
          size="sm"
        />
        <KPICard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<TrendingUp size={20} />}
          color="blue"
          variant="outlined"
          size="sm"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Program Status</h3>
              <p className="text-sm text-gray-500">Distribution by status</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BookOpen size={18} className="text-indigo-600" />
            </div>
          </div>
          {data?.status_distribution && data.status_distribution.length > 0 ? (
            <PieChart 
              data={data.status_distribution} 
              colors={['#22c55e', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6']}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
                <p>No status data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Clients</h3>
              <p className="text-sm text-gray-500">Programs by client</p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg">
              <Users size={18} className="text-teal-600" />
            </div>
          </div>
          {data?.client_distribution && data.client_distribution.length > 0 ? (
            <BarChart 
              data={data.client_distribution} 
              layout="horizontal" 
              color="#14b8a6"
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <Users size={48} className="mx-auto mb-2 opacity-50" />
                <p>No client data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/pending"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">View Pending</p>
              <p className="text-xs text-gray-500">{metrics?.pending_allotments || 0} slots</p>
            </div>
          </a>
          <a
            href="/programs"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
              <BookOpen size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">All Programs</p>
              <p className="text-xs text-gray-500">{metrics?.total_programs || 0} programs</p>
            </div>
          </a>
          <a
            href="/trainers"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
              <Users size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Trainers</p>
              <p className="text-xs text-gray-500">{status.trainer_rows} registered</p>
            </div>
          </a>
          <a
            href="/data-explorer"
            className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <FileSpreadsheet size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Data Explorer</p>
              <p className="text-xs text-gray-500">View raw data</p>
            </div>
          </a>
        </div>
      </div>
    </>
  );
}
