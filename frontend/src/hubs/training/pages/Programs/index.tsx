import { useState, useEffect, useMemo, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  BookOpen, 
  Building2, 
  Calendar, 
  CheckCircle, 
  RefreshCw, 
  Clock,
  Download,
  LayoutGrid,
  List,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { 
  PageHeader, 
  DataTable, 
  LoadingSpinner, 
  EmptyState, 
  StatusBadge, 
  KPICard,
} from '../../../../components';
import { getPrograms, getStatus, getFilters } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils';
import type { Program, StatusResponse, FilterOptions } from '../../../../types';

export default function Programs() {
  const [data, setData] = useState<Program[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [statusData, filtersData] = await Promise.all([
          getStatus(),
          getFilters(),
        ]);
        setStatus(statusData);
        setFilters(filtersData);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchInitial();
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
        const result = await getPrograms(
          selectedStatuses.length > 0 ? selectedStatuses : undefined,
          selectedClients.length > 0 ? selectedClients : undefined
        );
        
        // Apply date filter client-side
        let filtered = result.data;
        if (startDate) {
          filtered = filtered.filter((p) => {
            const progStart = new Date(p['Start Date']);
            return progStart >= startDate;
          });
        }
        if (endDate) {
          filtered = filtered.filter((p) => {
            const progStart = new Date(p['Start Date']);
            return progStart <= endDate;
          });
        }
        
        setData(filtered);
      } catch (error) {
        console.error('Failed to fetch programs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status?.is_loaded, selectedStatuses, selectedClients, startDate, endDate]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };

    if (statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdownOpen]);

  // Close client dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    };

    if (clientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clientDropdownOpen]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedClients.length > 0) count++;
    if (startDate || endDate) count++;
    return count;
  }, [selectedStatuses, selectedClients, startDate, endDate]);

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedClients([]);
    setStartDate(null);
    setEndDate(null);
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return filters?.clients || [];
    return (filters?.clients || []).filter(c => c.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [filters?.clients, clientSearch]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleClient = (client: string) => {
    setSelectedClients(prev => 
      prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client]
    );
  };

  // Calculate stats
  const stats = useMemo(() => {
    const ongoing = data.filter((p) => String(p.Status || '').toLowerCase() === 'ongoing').length;
    const completed = data.filter((p) => String(p.Status || '').toLowerCase() === 'completed').length;
    const upcoming = data.filter((p) => String(p.Status || '').toLowerCase() === 'upcoming').length;
    const uniqueClients = new Set(data.map((p) => p.Client)).size;
    return { ongoing, completed, upcoming, uniqueClients };
  }, [data]);

  const columns = useMemo<ColumnDef<Program>[]>(
    () => [
      {
        accessorKey: 'Delivery ID',
        header: 'Delivery ID',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
              <BookOpen size={16} className="text-indigo-600" />
            </div>
            <span className="font-semibold text-gray-900">{info.getValue() as string}</span>
          </div>
        ),
      },
      {
        accessorKey: 'Status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue() as string} />,
      },
      {
        accessorKey: 'Course',
        header: 'Course',
        cell: (info) => (
          <div className="max-w-[220px]">
            <p className="text-sm font-medium text-gray-900 truncate">{info.getValue() as string}</p>
          </div>
        ),
      },
      {
        accessorKey: 'Client',
        header: 'Client',
        cell: (info) => (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            <Building2 size={14} />
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'Start Date',
        header: 'Start Date',
        cell: (info) => (
          <span className="text-sm text-gray-600 font-medium">
            {formatDisplayDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: 'End Date',
        header: 'End Date',
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {formatDisplayDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: 'Batch',
        header: 'Batch',
        cell: (info) => {
          const value = info.getValue() as string;
          return value ? (
            <span className="text-sm text-gray-600">{value}</span>
          ) : (
            <span className="text-sm text-gray-400 italic">N/A</span>
          );
        },
      },
    ],
    []
  );

  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = ['Delivery ID', 'Status', 'Course', 'Client', 'Start Date', 'End Date', 'Batch'];
    const rows = data.map((row) => [
      row['Delivery ID'],
      row.Status,
      row.Course,
      row.Client,
      row['Start Date'],
      row['End Date'],
      row.Batch || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `programs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!status?.is_loaded && !loading) {
    return (
      <>
        <PageHeader
          title="Programs"
          description="All training programs"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to view programs"
        />
      </>
    );
  }

  // Full page loading while fetching initial data
  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading programs..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs"
        description="Manage and track all training programs"
        icon={<BookOpen size={24} />}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
            <button
              onClick={exportToCSV}
              disabled={data.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <KPICard
          title="Total Programs"
          value={data.length}
          icon={<BookOpen size={20} />}
          color="indigo"
          variant="gradient"
        />
        <KPICard
          title="Ongoing"
          value={stats.ongoing}
          icon={<RefreshCw size={18} />}
          color="yellow"
          variant="outlined"
        />
        <KPICard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle size={18} />}
          color="green"
          variant="outlined"
        />
        <KPICard
          title="Upcoming"
          value={stats.upcoming}
          icon={<Clock size={18} />}
          color="purple"
          variant="outlined"
        />
        <KPICard
          title="Clients"
          value={stats.uniqueClients}
          icon={<Building2 size={18} />}
          color="blue"
          variant="outlined"
        />
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Filter size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Filter Programs</h3>
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
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
            <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CheckCircle size={14} className="inline mr-1.5" />
                  Status
                </label>
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => {
                      setStatusDropdownOpen(!statusDropdownOpen);
                      setClientDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {selectedStatuses.length === 0
                        ? 'All statuses'
                        : `${selectedStatuses.length} selected`}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {statusDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        {(filters?.statuses || []).map((status) => (
                          <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-indigo-50 text-left text-sm transition-colors"
                          >
                            {selectedStatuses.includes(status) ? (
                              <CheckSquare size={16} className="text-indigo-600" />
                            ) : (
                              <Square size={16} className="text-gray-300" />
                            )}
                            <span className="text-gray-700">{status}</span>
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setStatusDropdownOpen(false)}
                          className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={14} className="inline mr-1.5" />
                  Client
                </label>
                <div className="relative" ref={clientDropdownRef}>
                  <button
                    onClick={() => {
                      setClientDropdownOpen(!clientDropdownOpen);
                      setStatusDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {selectedClients.length === 0
                        ? 'All clients'
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
                            placeholder="Search clients..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <button
                            key={client}
                            onClick={() => toggleClient(client)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left text-sm transition-colors"
                          >
                            {selectedClients.includes(client) ? (
                              <CheckSquare size={16} className="text-indigo-600" />
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
                          className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={14} className="inline mr-1.5" />
                  Start Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                  <span className="text-gray-400 text-sm">→</span>
                  <input
                    type="date"
                    value={endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Active:</span>
                {selectedStatuses.map((status) => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100"
                  >
                    {status}
                    <button 
                      onClick={() => toggleStatus(status)} 
                      className="hover:bg-green-100 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {selectedClients.slice(0, 2).map((client) => (
                  <span
                    key={client}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100"
                  >
                    {client.length > 12 ? client.substring(0, 12) + '...' : client}
                    <button 
                      onClick={() => toggleClient(client)} 
                      className="hover:bg-indigo-100 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {selectedClients.length > 2 && (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                    +{selectedClients.length - 2} clients
                  </span>
                )}
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Display */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading programs..." />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Programs Found</h3>
          <p className="text-gray-500">Try adjusting your filters to see more results.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            data={data}
            columns={columns}
            searchPlaceholder="Search by Delivery ID, Course, or Client..."
            pageSize={15}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((program) => (
            <div
              key={program['Delivery ID']}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <BookOpen size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{program['Delivery ID']}</p>
                    <p className="text-xs text-gray-500">{program.Batch || 'No Batch'}</p>
                  </div>
                </div>
                <StatusBadge status={program.Status} size="sm" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{program.Course}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Building2 size={12} />
                <span>{program.Client}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>{formatDisplayDate(program['Start Date'])}</span>
                </div>
                <span className="text-gray-300">→</span>
                <span>{formatDisplayDate(program['End Date'])}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
