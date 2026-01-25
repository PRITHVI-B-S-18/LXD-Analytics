import { useState, useEffect, useMemo, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Search, 
  X, 
  CheckSquare, 
  Square, 
  Filter,
  ChevronDown,
  ChevronUp,
  Building2,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Table,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PageHeader, LoadingSpinner, EmptyState, KPICard, PieChart, BarChart, DataTable } from '../../../../components';
import { getClientsList, getUtilizationByClient, getStatus } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils';
import type { UtilizationByClientResponse, StatusResponse, ChartDataItem, UtilizationDataRow } from '../../../../types';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ByClient() {
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [data, setData] = useState<UtilizationByClientResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      const statusData = await getStatus();
      setStatus(statusData);
      
      if (statusData.is_loaded) {
        const clientsResult = await getClientsList();
        setClients(clientsResult.data);
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
        const result = await getUtilizationByClient(
          selectedClients.length > 0 ? selectedClients : undefined,
          startDate,
          endDate
        );
        setData(result);
      } catch (error) {
        console.error('Failed to fetch utilization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status?.is_loaded, selectedClients, startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter((c) => c.toLowerCase().includes(term));
  }, [clients, searchTerm]);

  const toggleClient = (client: string) => {
    setSelectedClients((prev) =>
      prev.includes(client) ? prev.filter((c) => c !== client) : [...prev, client]
    );
  };

  const selectAll = () => {
    setSelectedClients(filteredClients);
  };

  const clearAll = () => {
    setSelectedClients([]);
  };

  const clearAllFilters = () => {
    setSelectedClients([]);
    setStartDate(null);
    setEndDate(null);
  };

  const activeFilterCount = 
    (startDate || endDate ? 1 : 0) + 
    (selectedClients.length > 0 ? 1 : 0);

  // Convert clients summary to bar chart data
  const clientsBarData: ChartDataItem[] = (data?.clients_summary || []).map(c => ({
    name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
    value: c.total
  }));

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
          title="Utilization by Client"
          description="View utilization by client/campus"
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
        <LoadingSpinner size="lg" text="Analyzing client utilization..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilization by Client"
        description="Analyze trainer allocation and utilization across clients"
        icon={<Building2 size={24} />}
      />

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Filter size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Client & Date Filters</h3>
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
            <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={14} className="inline mr-1.5" />
                  Date Range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="date"
                      value={startDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:bg-white transition-colors"
                      placeholder="Start Date"
                    />
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex-1">
                    <input
                      type="date"
                      value={endDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:bg-white transition-colors"
                      placeholder="End Date"
                    />
                  </div>
                </div>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={14} className="inline mr-1.5" />
                  Select Clients
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {selectedClients.length === 0
                        ? 'All Clients'
                        : `${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                        <button 
                          onClick={selectAll} 
                          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckSquare size={14} />
                          Select All ({filteredClients.length})
                        </button>
                        <button 
                          onClick={clearAll} 
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          <X size={14} />
                          Clear
                        </button>
                      </div>

                      <div className="max-h-56 overflow-y-auto">
                        {filteredClients.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm">
                            No clients found matching "{searchTerm}"
                          </div>
                        ) : (
                          filteredClients.map((client) => (
                            <button
                              key={client}
                              onClick={() => toggleClient(client)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 text-left transition-colors"
                            >
                              {selectedClients.includes(client) ? (
                                <CheckSquare size={18} className="text-emerald-600 flex-shrink-0" />
                              ) : (
                                <Square size={18} className="text-gray-300 flex-shrink-0" />
                              )}
                              <span className="text-sm text-gray-700">{client}</span>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="p-3 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setDropdownOpen(false)}
                          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedClients.length > 0 || startDate || endDate) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
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
                {selectedClients.slice(0, 3).map((client) => (
                  <span
                    key={client}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100"
                  >
                    {client.length > 15 ? client.substring(0, 15) + '...' : client}
                    <button 
                      onClick={() => toggleClient(client)} 
                      className="hover:bg-emerald-100 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {selectedClients.length > 3 && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                    +{selectedClients.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Analyzing client utilization..." />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <KPICard
              title="Total Allotments"
              value={data.metrics.total_allotments}
              subtitle="Count of all client slots"
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

          {/* Clients Summary Bar Chart */}
          {clientsBarData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Building2 size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Clients by Total Allotments</h3>
                  <p className="text-sm text-gray-500">Distribution of allotments across clients</p>
                </div>
              </div>
              <BarChart data={clientsBarData} color="#6366f1" />
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
          description="Select clients or adjust date range to view utilization data"
        />
      )}
    </div>
  );
}
