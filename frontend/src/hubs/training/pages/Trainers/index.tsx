import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Users, 
  Mail, 
  Phone, 
  Building, 
  Search,
  Download,
  UserCheck,
  Briefcase,
  Filter,
  ChevronDown,
  ChevronUp,
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
import { getTrainers, getStatus, getFilters } from '../../../../services/api';
import type { Trainer, StatusResponse, FilterOptions } from '../../../../types';

export default function Trainers() {
  const [data, setData] = useState<Trainer[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusData, trainersData, filtersData] = await Promise.all([
          getStatus(),
          getTrainers(),
          getFilters(),
        ]);
        setStatus(statusData);
        setData(trainersData.data);
        setFilters(filtersData);
      } catch (error) {
        console.error('Failed to fetch trainers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let result = data;
    
    if (selectedTypes.length > 0) {
      result = result.filter((t) => selectedTypes.includes(t['Trainer Type']));
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((t) => 
        t['Trainer Name']?.toLowerCase().includes(term) ||
        t['Trainer Email']?.toLowerCase().includes(term) ||
        t['Trainer Type']?.toLowerCase().includes(term) ||
        t.pt?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [data, selectedTypes, searchTerm]);

  // Calculate stats by type
  const typeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((t) => {
      const type = t['Trainer Type'] || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [data]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
  };

  const columns = useMemo<ColumnDef<Trainer>[]>(
    () => [
      {
        accessorKey: 'Trainer Name',
        header: 'Trainer',
        cell: (info) => {
          const row = info.row.original;
          const initials = (row['Trainer Name'] || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          
          return (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{row['Trainer Name']}</p>
                <p className="text-xs text-gray-500 font-mono">{row.pt}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'Trainer Type',
        header: 'Type',
        cell: (info) => {
          const type = info.getValue() as string;
          const colors: Record<string, string> = {
            'Internal-WILP': 'bg-blue-100 text-blue-700 border-blue-200',
            'Internal': 'bg-green-100 text-green-700 border-green-200',
            'Internal-Fulltime': 'bg-purple-100 text-purple-700 border-purple-200',
            'Freelancer-Direct': 'bg-amber-100 text-amber-700 border-amber-200',
            'Freelancer-Vendor': 'bg-orange-100 text-orange-700 border-orange-200',
          };
          return (
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {type}
            </span>
          );
        },
      },
      {
        accessorKey: 'Trainer Email',
        header: 'Contact',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="space-y-1.5">
              {row['Trainer Email'] && (
                <a
                  href={`mailto:${row['Trainer Email']}`}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <Mail size={14} />
                  <span className="truncate max-w-[180px]">{row['Trainer Email']}</span>
                </a>
              )}
              {row['Trainer Phone'] && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} />
                  <span>{row['Trainer Phone']}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'Vendor Name',
        header: 'Vendor',
        cell: (info) => {
          const vendor = info.getValue() as string;
          const code = info.row.original['Vendor Code'];
          
          if (!vendor || vendor === 'nan') {
            return <span className="text-gray-400 text-sm italic">—</span>;
          }
          
          return (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building size={14} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{vendor}</p>
                {code && code !== 'nan' && (
                  <p className="text-xs text-gray-500">{code}</p>
                )}
              </div>
            </div>
          );
        },
      },
    ],
    []
  );

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['ID', 'Name', 'Type', 'Email', 'Phone', 'Vendor', 'Vendor Code'];
    const rows = filteredData.map((row) => [
      row.pt,
      row['Trainer Name'],
      row['Trainer Type'],
      row['Trainer Email'],
      row['Trainer Phone'],
      row['Vendor Name'] || '',
      row['Vendor Code'] || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!status?.is_loaded && !loading) {
    return (
      <>
        <PageHeader
          title="Trainers"
          description="Trainer directory"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to view trainers"
        />
      </>
    );
  }

  // Full page loading while fetching initial data
  if (loading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading trainers..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainer Directory"
        description="Manage and view all registered trainers"
        icon={<Users size={24} />}
        actions={
          <button
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <Download size={16} />
            Export
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Trainers"
          value={data.length}
          icon={<Users size={20} />}
          color="indigo"
          variant="gradient"
          size="sm"
        />
        {Object.entries(typeStats).slice(0, 5).map(([type, count]) => (
          <KPICard
            key={type}
            title={type.length > 12 ? type.substring(0, 12) + '...' : type}
            value={count}
            icon={type.includes('Internal') ? <UserCheck size={18} /> : <Briefcase size={18} />}
            color={type.includes('Internal') ? 'green' : 'orange'}
            variant="outlined"
            size="sm"
          />
        ))}
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Filter size={18} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">Filter Trainers</h3>
              <p className="text-xs text-gray-500">
                {selectedTypes.length === 0 
                  ? 'No filters applied' 
                  : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedTypes.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear
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
            <div className="pt-4 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users size={14} className="inline mr-1.5" />
                Trainer Type
              </label>
              <div className="relative">
                <button
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    {selectedTypes.length === 0
                      ? 'All types'
                      : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {typeDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      {(filters?.trainer_types || Object.keys(typeStats)).map((type) => (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-purple-50 text-left text-sm transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {selectedTypes.includes(type) ? (
                              <CheckSquare size={16} className="text-purple-600" />
                            ) : (
                              <Square size={16} className="text-gray-300" />
                            )}
                            <span className="text-gray-700">{type}</span>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {typeStats[type] || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                      <button
                        onClick={() => setTypeDropdownOpen(false)}
                        className="w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Type Tags */}
              {selectedTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100"
                    >
                      {type}
                      <button 
                        onClick={() => toggleType(type)} 
                        className="hover:bg-purple-100 rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search and Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" text="Loading trainers..." />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trainer Data</h3>
          <p className="text-gray-500">The uploaded file doesn't contain a Trainer Data sheet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Custom Search */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, ID, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-colors"
              />
            </div>
            {(searchTerm || selectedTypes.length > 0) && (
              <p className="mt-2 text-sm text-gray-500">
                Found <span className="font-semibold text-gray-700">{filteredData.length}</span> trainer{filteredData.length !== 1 ? 's' : ''}
                {searchTerm && <span className="text-gray-400"> matching "{searchTerm}"</span>}
              </p>
            )}
          </div>
          <DataTable
            data={filteredData}
            columns={columns}
            pageSize={15}
            showSearch={false}
          />
        </div>
      )}
    </div>
  );
}
