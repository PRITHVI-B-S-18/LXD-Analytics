import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  AlertTriangle, 
  Calendar, 
  Building2, 
  BookOpen, 
  Clock, 
  Download,
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
  KPICard,
} from '../../../../components';
import { getPendingAllotments, getStatus, getFilters } from '../../../../services/api';
import type { PendingAllotment, StatusResponse, FilterOptions } from '../../../../types';

export default function PendingAllotments() {
  const [data, setData] = useState<PendingAllotment[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Filter states
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

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
      if (!status?.is_loaded) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getPendingAllotments(startDate, endDate);
        
        // Apply client-side filters
        let filtered = result.data;
        if (selectedClients.length > 0) {
          filtered = filtered.filter((d) => selectedClients.includes(d.Client));
        }
        if (selectedCourses.length > 0) {
          filtered = filtered.filter((d) => selectedCourses.includes(d.Course));
        }
        
        setData(filtered);
        setTotal(filtered.reduce((sum, item) => sum + item['Pending Allotments'], 0));
      } catch (error) {
        console.error('Failed to fetch pending allotments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status?.is_loaded, startDate, endDate, selectedClients, selectedCourses]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (startDate || endDate) count++;
    if (selectedClients.length > 0) count++;
    if (selectedCourses.length > 0) count++;
    return count;
  }, [startDate, endDate, selectedClients, selectedCourses]);

  const clearAllFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedClients([]);
    setSelectedCourses([]);
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return filters?.clients || [];
    return (filters?.clients || []).filter(c => c.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [filters?.clients, clientSearch]);

  const filteredCourses = useMemo(() => {
    if (!courseSearch) return filters?.courses || [];
    return (filters?.courses || []).filter(c => c.toLowerCase().includes(courseSearch.toLowerCase()));
  }, [filters?.courses, courseSearch]);

  const toggleClient = (client: string) => {
    setSelectedClients(prev => 
      prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client]
    );
  };

  const toggleCourse = (course: string) => {
    setSelectedCourses(prev => 
      prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
    );
  };

  const columns = useMemo<ColumnDef<PendingAllotment>[]>(
    () => [
      {
        accessorKey: 'Delivery ID',
        header: 'Delivery ID',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={16} className="text-orange-600" />
            </div>
            <span className="font-semibold text-gray-900">{info.getValue() as string}</span>
          </div>
        ),
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
        accessorKey: 'Batch',
        header: 'Batch',
        cell: (info) => {
          const value = info.getValue() as string;
          return value ? (
            <span className="text-sm text-gray-600 font-medium">{value}</span>
          ) : (
            <span className="text-sm text-gray-400 italic">N/A</span>
          );
        },
      },
      {
        accessorKey: 'Pending Allotments',
        header: 'Pending Slots',
        cell: (info) => {
          const count = info.getValue() as number;
          const colorClass = count >= 10 
            ? 'bg-red-100 text-red-700 border-red-200' 
            : count >= 5 
              ? 'bg-orange-100 text-orange-700 border-orange-200'
              : 'bg-yellow-100 text-yellow-700 border-yellow-200';
          return (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center min-w-[40px] h-9 px-3 rounded-xl text-sm font-bold border ${colorClass}`}>
                {count}
              </span>
              <span className="text-xs text-gray-500">slots</span>
            </div>
          );
        },
      },
    ],
    []
  );

  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = ['Delivery ID', 'Course', 'Client', 'Batch', 'Pending Allotments'];
    const rows = data.map((row) => [
      row['Delivery ID'],
      row.Course,
      row.Client,
      row.Batch || '',
      row['Pending Allotments'],
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending_allotments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!status?.is_loaded && !loading) {
    return (
      <>
        <PageHeader
          title="Pending Allotments"
          description="Programs with unassigned trainer slots"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to view pending allotments"
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Allotments"
        description="Track and manage unassigned trainer slots"
        icon={<AlertTriangle size={24} />}
        actions={
          <button
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Total Pending"
          value={total}
          subtitle="Unassigned slots"
          icon={<AlertTriangle size={20} />}
          color="orange"
          variant="gradient"
        />
        <KPICard
          title="Programs Affected"
          value={data.length}
          subtitle="Need attention"
          icon={<BookOpen size={20} />}
          color="red"
          variant="gradient"
        />
        <KPICard
          title="Avg. Per Program"
          value={data.length > 0 ? Math.round(total / data.length) : 0}
          subtitle="Pending slots"
          icon={<Clock size={20} />}
          color="yellow"
          variant="outlined"
        />
        <KPICard
          title="Clients Affected"
          value={new Set(data.map((d) => d.Client)).size}
          subtitle="With pending slots"
          icon={<Building2 size={20} />}
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
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Filter size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Filter Pending Allotments</h3>
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
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 focus:bg-white transition-colors"
                  />
                  <span className="text-gray-400 text-sm">→</span>
                  <input
                    type="date"
                    value={endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 focus:bg-white transition-colors"
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
                      setCourseDropdownOpen(false);
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
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-orange-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <button
                            key={client}
                            onClick={() => toggleClient(client)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-left text-sm transition-colors"
                          >
                            {selectedClients.includes(client) ? (
                              <CheckSquare size={16} className="text-orange-600" />
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
                          className="w-full px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen size={14} className="inline mr-1.5" />
                  Course
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setCourseDropdownOpen(!courseDropdownOpen);
                      setClientDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {selectedCourses.length === 0
                        ? 'All courses'
                        : `${selectedCourses.length} selected`}
                    </span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform ${courseDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {courseDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search courses..."
                            value={courseSearch}
                            onChange={(e) => setCourseSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-orange-500 bg-white"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCourses.map((course) => (
                          <button
                            key={course}
                            onClick={() => toggleCourse(course)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-left text-sm transition-colors"
                          >
                            {selectedCourses.includes(course) ? (
                              <CheckSquare size={16} className="text-orange-600" />
                            ) : (
                              <Square size={16} className="text-gray-300" />
                            )}
                            <span className="text-gray-700 truncate">{course}</span>
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => setCourseDropdownOpen(false)}
                          className="w-full px-3 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
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
                {selectedClients.slice(0, 2).map((client) => (
                  <span
                    key={client}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium border border-orange-100"
                  >
                    {client.length > 12 ? client.substring(0, 12) + '...' : client}
                    <button 
                      onClick={() => toggleClient(client)} 
                      className="hover:bg-orange-100 rounded-full p-0.5"
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
                {selectedCourses.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                    <BookOpen size={12} />
                    {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''}
                    <button 
                      onClick={() => setSelectedCourses([])}
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

      {/* Data Table or Empty State */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading pending allotments..." />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎉</span>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">All Clear!</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            No pending allotments found for the selected filters. All trainer slots have been assigned.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <DataTable
            data={data}
            columns={columns}
            searchPlaceholder="Search by Delivery ID, Course, or Client..."
            pageSize={15}
          />
        </div>
      )}
    </div>
  );
}
