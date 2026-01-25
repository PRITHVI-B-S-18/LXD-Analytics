import { useState, useEffect, useMemo } from 'react';
import { 
  Users,
  Calendar,
  TrendingUp,
  UserCheck,
  UserX,
  Percent,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { PageHeader, LoadingSpinner, EmptyState, KPICard, PieChart } from '../../../../components';
import { getUtilizationByTrainer, getStatus } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils';
import type { UtilizationByTrainerResponse, StatusResponse, TrainerCategory } from '../../../../types';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export default function ByTrainer() {
  const [data, setData] = useState<UtilizationByTrainerResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      const statusData = await getStatus();
      setStatus(statusData);
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for status to be fetched first
      if (status === null) return;
      
      if (!status.is_loaded) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getUtilizationByTrainer(selectedDate);
        setData(result);
      } catch (error) {
        console.error('Failed to fetch trainer utilization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status?.is_loaded, selectedDate]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Chart data for pie chart
  const pieChartData = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.map((cat) => ({
      name: cat.category,
      value: cat.total_trainers,
    }));
  }, [data?.categories]);

  // Allocation status chart
  const allocationStatusData = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { name: 'Allocated', value: data.summary.total_allocated },
      { name: 'Available', value: data.summary.total_available },
    ];
  }, [data?.summary]);

  if (!status?.is_loaded && !loading) {
    return (
      <>
        <PageHeader
          title="Utilization by Trainer"
          description="View trainer allocation by category for a specific date"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to view trainer utilization"
        />
      </>
    );
  }

  // Full page loading while fetching initial data
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading trainer data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilization by Trainer"
        description="Track trainer allocation by category"
        icon={<Users size={24} />}
      />

      {/* Date Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Calendar size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-colors w-full max-w-xs"
            />
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Showing data for</p>
            <p className="text-lg font-semibold text-gray-900">{formatDisplayDate(selectedDate)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading trainer data..." />
        </div>
      ) : data ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <KPICard
              title="Total Trainers"
              value={data.summary.total_trainers}
              subtitle="In all categories"
              icon={<Users size={20} />}
              color="indigo"
              variant="gradient"
            />
            <KPICard
              title="Allocated Today"
              value={data.summary.total_allocated}
              subtitle="Trainers with assignments"
              icon={<UserCheck size={20} />}
              color="green"
              variant="gradient"
            />
            <KPICard
              title="Available"
              value={data.summary.total_available}
              subtitle="Trainers without assignments"
              icon={<UserX size={20} />}
              color="orange"
              variant="gradient"
            />
            <KPICard
              title="Allocation Rate"
              value={`${data.summary.allocation_rate}%`}
              subtitle="Overall utilization"
              icon={<Percent size={20} />}
              color="purple"
              variant="gradient"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trainer Distribution by Category */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Trainers by Category</h3>
                  <p className="text-sm text-gray-500">Total trainer distribution</p>
                </div>
              </div>
              {pieChartData.length > 0 ? (
                <PieChart data={pieChartData} colors={COLORS} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <Users size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No category data available</p>
                </div>
              )}
            </div>

            {/* Allocation Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Allocation Status</h3>
                  <p className="text-sm text-gray-500">Allocated vs Available on {formatDisplayDate(selectedDate)}</p>
                </div>
              </div>
              {allocationStatusData.length > 0 && (allocationStatusData[0].value > 0 || allocationStatusData[1].value > 0) ? (
                <PieChart data={allocationStatusData} colors={['#22c55e', '#f59e0b']} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <TrendingUp size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No allocations on this date</p>
                </div>
              )}
            </div>
          </div>

          {/* Category-wise Breakdown Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
                  <p className="text-sm text-gray-500">
                    Detailed view of {data.categories.length} trainer categories
                  </p>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-start gap-2 text-sm text-blue-700">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Total Trainers</strong> = From trainer master data | 
                  <strong> Allocated</strong> = Unique trainers with assignments on {formatDisplayDate(selectedDate)} | 
                  <strong> Available</strong> = Total - Allocated
                </p>
              </div>
            </div>

            {/* Table Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <div className="grid grid-cols-12 items-center gap-4">
                <div className="col-span-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </div>
                <div className="col-span-1 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total
                </div>
                <div className="col-span-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Allocated
                </div>
                <div className="col-span-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Available
                </div>
                <div className="col-span-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rate
                </div>
              </div>
            </div>

            {/* Category List */}
            <div className="divide-y divide-gray-100">
              {data.categories.length > 0 ? (
                data.categories.map((category) => (
                  <CategoryRow
                    key={category.category}
                    category={category}
                    isExpanded={expandedCategories.includes(category.category)}
                    onToggle={() => toggleCategory(category.category)}
                  />
                ))
              ) : (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No trainer categories found</p>
                </div>
              )}
            </div>

            {/* Summary Footer */}
            {data.categories.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-5">
                    <span className="font-bold text-gray-900 text-lg">Total</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <p className="text-lg font-bold text-gray-900">{data.summary.total_trainers}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg font-bold text-green-600">{data.summary.total_allocated}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg font-bold text-orange-600">{data.summary.total_available}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-lg font-bold text-purple-600">{data.summary.allocation_rate}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          title="No Data Available"
          description="No trainer data found for the selected date"
        />
      )}
    </div>
  );
}

// Category Row Component
function CategoryRow({
  category,
  isExpanded,
  onToggle,
}: {
  category: TrainerCategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasAllocatedTrainers = category.allocated_trainers && category.allocated_trainers.length > 0;

  return (
    <div className="hover:bg-gray-50 transition-colors">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left"
        disabled={!hasAllocatedTrainers}
      >
        <div className="grid grid-cols-12 items-center gap-4">
          {/* Category Name */}
          <div className="col-span-5 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{category.category}</h4>
              <p className="text-sm text-gray-500">{category.total_trainers} total trainers</p>
            </div>
          </div>

          {/* Total */}
          <div className="col-span-1 text-center">
            <p className="text-lg font-bold text-gray-900">{category.total_trainers}</p>
          </div>

          {/* Allocated */}
          <div className="col-span-2 text-center">
            <p className="text-lg font-bold text-green-600">{category.allocated}</p>
          </div>

          {/* Available */}
          <div className="col-span-2 text-center">
            <p className="text-lg font-bold text-orange-600">{category.available}</p>
          </div>

          {/* Rate */}
          <div className="col-span-2 flex items-center justify-center gap-2">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                style={{ width: `${category.allocation_rate}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 w-12">{category.allocation_rate}%</span>
            {hasAllocatedTrainers && (
              <span className="text-gray-400">
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded: Show allocated trainers */}
      {isExpanded && hasAllocatedTrainers && (
        <div className="px-6 pb-4">
          <div className="ml-14 p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs font-medium text-green-700 mb-2">
              Allocated Trainers ({category.allocated_trainers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {category.allocated_trainers.map((trainer, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1.5 bg-white border border-green-200 rounded-lg text-sm text-green-800"
                >
                  <UserCheck size={14} className="mr-1.5 text-green-600" />
                  {trainer}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
