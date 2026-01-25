import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Search, 
  X, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp,
  Filter,
  Calendar,
  Building2,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Table,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PageHeader, LoadingSpinner, EmptyState, KPICard, PieChart, LineChart, DataTable } from '../../../../components';
import { getClientsList, getProgramsList, getUtilizationByDate, getStatus } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils';
import type { ProgramItem, UtilizationByDateResponse, StatusResponse, UtilizationDataRow } from '../../../../types';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ByDate() {
  const [clients, setClients] = useState<string[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [data, setData] = useState<UtilizationByDateResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [programSearchTerm, setProgramSearchTerm] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const statusData = await getStatus();
      setStatus(statusData);
      
      if (statusData.is_loaded) {
        const [clientsResult, programsResult] = await Promise.all([
          getClientsList(),
          getProgramsList(),
        ]);
        setClients(clientsResult.data);
        setPrograms(programsResult.data);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!status?.is_loaded) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getUtilizationByDate(
          startDate,
          endDate,
          selectedClients.length > 0 ? selectedClients : undefined,
          selectedPrograms.length > 0 ? selectedPrograms : undefined
        );
        setData(result);
      } catch (error) {
        console.error('Failed to fetch utilization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status?.is_loaded, startDate, endDate, selectedClients, selectedPrograms]);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients;
    const term = clientSearchTerm.toLowerCase();
    return clients.filter((c) => c.toLowerCase().includes(term));
  }, [clients, clientSearchTerm]);

  const filteredPrograms = useMemo(() => {
    if (!programSearchTerm) return programs;
    const term = programSearchTerm.toLowerCase();
    return programs.filter((p) => p.label.toLowerCase().includes(term));
  }, [programs, programSearchTerm]);

  const toggleClient = (client: string) => {
    setSelectedClients((prev) =>
      prev.includes(client) ? prev.filter((c) => c !== client) : [...prev, client]
    );
  };

  const toggleProgram = (id: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setSelectedClients([]);
    setSelectedPrograms([]);
    setStartDate(null);
    setEndDate(null);
  };

  const activeFilterCount = 
    (startDate || endDate ? 1 : 0) + 
    (selectedClients.length > 0 ? 1 : 0) + 
    (selectedPrograms.length > 0 ? 1 : 0);

  // Line chart configuration
  const lineChartLines = [
    { key: 'assigned', color: '#22c55e', name: 'Assigned' },
    { key: 'pending', color: '#f59e0b', name: 'Pending' },
  ];

  // Format dates for line chart display
  const formattedDailyTrend = useMemo(() => {
    if (!data?.daily_trend) return [];
    return data.daily_trend.map((item) => ({
      ...item,
      date: formatDisplayDate(item.date),
    }));
  }, [data?.daily_trend]);

  // Data table columns
  const dataColumns = useMemo<ColumnDef<UtilizationDataRow>[]>(
    () => [
      {
        accessorKey: 'Delivery ID',
        header: 'Delivery ID',
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Client',
        header: 'Client',
        cell: (info) => (
          <span className="text-sm text-gray-700">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Course',
        header: 'Course',
        cell: (info) => (
          <span className="text-sm text-gray-600 truncate max-w-[150px] block">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Date',
        header: 'Date',
        cell: (info) => (
          <span className="text-sm text-gray-600">{formatDisplayDate(info.getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'Trainer',
        header: 'Trainer',
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value || value === '' || value === 'nan') {
            return (
              <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                Pending
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: 'Trainer Type',
        header: 'Type',
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value) return <span className="text-gray-400">—</span>;
          return (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: 'Status',
        header: 'Status',
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value) return <span className="text-gray-400">—</span>;
          return (
            <span className="text-sm text-gray-600">{value}</span>
          );
        },
      },
    ],
    []
  );

  if (!status?.is_loaded && !loading) {
    return (
      <>
        <PageHeader
          title="Utilization by Date"
          description="View utilization with date, client, and program filters"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to view utilization"
        />
      </>
    );
  }

  // Full page loading while fetching initial data
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Analyzing daily trends..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilization by Date"
        description="Track daily allocation trends and patterns"
        icon={<Calendar size={24} />}
      />

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Filter size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Date, Client & Program Filters</h3>
              <p className="text-xs text-gray-500">
                {activeFilterCount === 0 
                  ? 'No filters applied' 
                  : `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllFilters();
                }}
                className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear All
              </button>
            )}
            {filtersExpanded ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </div>
        </button>

        {filtersExpanded && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={14} className="inline mr-1.5" />
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="date"
                    value={endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={14} className="inline mr-1.5" />
                  Client
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setClientDropdownOpen(!clientDropdownOpen);
                      setProgramDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors text-sm"
                  >
                    <span className="text-gray-700 truncate">
                      {selectedClients.length === 0
                        ? 'All Clients'
                        : `${selectedClients.length} selected`}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {clientDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={clientSearchTerm}
                            onChange={(e) => setClientSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <button
                            key={client}
                            onClick={() => toggleClient(client)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-sm transition-colors"
                          >
                            {selectedClients.includes(client) ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} className="text-gray-300" />
                            )}
                            <span className="text-gray-700 truncate">{client}</span>
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setClientDropdownOpen(false)}
                          className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Program Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BarChart3 size={14} className="inline mr-1.5" />
                  Program
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setProgramDropdownOpen(!programDropdownOpen);
                      setClientDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors text-sm"
                  >
                    <span className="text-gray-700 truncate">
                      {selectedPrograms.length === 0
                        ? 'All Programs'
                        : `${selectedPrograms.length} selected`}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${programDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {programDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search..."
                            value={programSearchTerm}
                            onChange={(e) => setProgramSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredPrograms.map((program) => (
                          <button
                            key={program.id}
                            onClick={() => toggleProgram(program.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-sm transition-colors"
                          >
                            {selectedPrograms.includes(program.id) ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} className="text-gray-300" />
                            )}
                            <span className="text-gray-700 truncate">{program.label}</span>
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setProgramDropdownOpen(false)}
                          className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Active:</span>
                {(startDate || endDate) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                    <Calendar size={12} />
                    {startDate?.toLocaleDateString() || 'Start'} - {endDate?.toLocaleDateString() || 'End'}
                    <button 
                      onClick={() => { setStartDate(null); setEndDate(null); }}
                      className="hover:bg-blue-100 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedClients.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100">
                    <Building2 size={12} />
                    {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''}
                    <button 
                      onClick={() => setSelectedClients([])}
                      className="hover:bg-green-100 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedPrograms.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                    <BarChart3 size={12} />
                    {selectedPrograms.length} program{selectedPrograms.length > 1 ? 's' : ''}
                    <button 
                      onClick={() => setSelectedPrograms([])}
                      className="hover:bg-purple-100 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Analyzing daily trends..." />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <KPICard
              title="Total Allotments"
              value={data.metrics.total_allotments}
              subtitle="Count of all slots"
              icon={<TrendingUp size={20} />}
              color="blue"
              variant="gradient"
            />
            <KPICard
              title="Pending Allotments"
              value={data.metrics.pending_allotments}
              subtitle="Slots without trainers"
              icon={<Clock size={20} />}
              color="orange"
              variant="gradient"
            />
            <KPICard
              title="Assigned Allotments"
              value={data.metrics.assigned_allotments}
              subtitle="Trainers assigned"
              icon={<CheckCircle size={20} />}
              color="green"
              variant="gradient"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trainer Type Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users size={18} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Trainer Type Distribution</h3>
                  <p className="text-sm text-gray-500">Breakdown by trainer category</p>
                </div>
              </div>
              {data.trainer_type_chart.length > 0 ? (
                <PieChart data={data.trainer_type_chart} colors={COLORS} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <AlertCircle size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No trainer type data available</p>
                </div>
              )}
            </div>

            {/* Allocation Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Allocation Status</h3>
                  <p className="text-sm text-gray-500">Assigned vs pending slots</p>
                </div>
              </div>
              {data.status_chart.length > 0 ? (
                <PieChart data={data.status_chart} colors={['#22c55e', '#f59e0b']} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <AlertCircle size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No status data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Trend Line Chart */}
          {formattedDailyTrend.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Daily Allocation Trend</h3>
                  <p className="text-sm text-gray-500">Track assigned vs pending over time</p>
                </div>
              </div>
              <LineChart data={formattedDailyTrend} lines={lineChartLines} />
            </div>
          )}

          {/* Underlying Data Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowDataTable(!showDataTable)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Table size={18} className="text-gray-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-gray-900">View Underlying Data</h3>
                  <p className="text-xs text-gray-500">
                    {data?.filtered_total || 0} rows used for this visualization (showing max 100)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showDataTable ? (
                  <>
                    <EyeOff size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Show</span>
                  </>
                )}
              </div>
            </button>

            {showDataTable && data?.filtered_data && data.filtered_data.length > 0 && (
              <div className="border-t border-gray-100">
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Data Verification:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li><strong>Total Allotments</strong> = Number of rows in this table ({data.filtered_total})</li>
                      <li><strong>Pending</strong> = Rows where Trainer column is empty or "Pending" ({data.metrics.pending_allotments})</li>
                      <li><strong>Assigned</strong> = Rows with a trainer name ({data.metrics.assigned_allotments})</li>
                      <li><strong>Trainer Types</strong> = Counted from the "Type" column for assigned rows</li>
                    </ul>
                    <p className="mt-2">Showing {data.filtered_data.length} of {data.filtered_total} rows. Use search to filter.</p>
                  </div>
                </div>
                <DataTable
                  data={data.filtered_data}
                  columns={dataColumns}
                  pageSize={10}
                  searchPlaceholder="Search in data..."
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          title="No Data Available"
          description="Apply filters to view utilization data"
        />
      )}
    </div>
  );
}
