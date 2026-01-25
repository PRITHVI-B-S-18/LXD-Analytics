import { useState, useEffect, useMemo, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  UserCheck,
  Calendar,
  Search,
  Download,
  ChevronDown,
  X,
  MapPin,
} from 'lucide-react';
import {
  PageHeader,
  DataTable,
  LoadingSpinner,
  EmptyState,
  KPICard,
} from '../../../../components';
import { getStatus, getDatapoint } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils';
import type { StatusResponse, DatapointRow } from '../../../../types';

interface DeploymentRow {
  Date: string;
  'Delivery ID': string;
  Course: string;
  Batch: string;
  Client: string;
  Status: string;
}

export default function TrainerDeployment() {
  const [allData, setAllData] = useState<DatapointRow[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [trainerSearch, setTrainerSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const statusData = await getStatus();
        setStatus(statusData);
        
        if (!statusData.is_loaded) {
          setLoading(false);
          return;
        }

        // Fetch first page to get total count
        const firstPage = await getDatapoint(null, null, 1, 1000);
        let allRows = [...firstPage.data];
        
        // If there are more pages, fetch them all
        if (firstPage.total_pages > 1) {
          const MAX_PAGE_SIZE = 1000;
          const totalPages = firstPage.total_pages;
          
          for (let page = 2; page <= totalPages; page++) {
            const pageData = await getDatapoint(null, null, page, MAX_PAGE_SIZE);
            allRows = [...allRows, ...pageData.data];
          }
        }
        
        setAllData(allRows);
        console.log('[TrainerDeployment] Loaded data:', allRows.length, 'rows');
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Get unique trainers from datapoint data with their codes (those with actual assignments)
  const trainerMap = useMemo(() => {
    const map = new Map<string, string>(); // trainer name -> trainer code
    
    if (!allData || allData.length === 0) {
      console.log('[TrainerDeployment] No data available');
      return map;
    }
    
    allData.forEach((row) => {
      const trainer = row.Trainer;
      const code = row['Trainer Code'] || '';
      
      // Check if trainer exists and is not empty/pending
      if (trainer && 
          String(trainer).trim() !== '' && 
          String(trainer).toLowerCase() !== 'nan' &&
          String(trainer).toLowerCase() !== 'pending' &&
          String(trainer).toLowerCase() !== 'not allotted') {
        const trainerName = String(trainer).trim();
        const trainerCode = String(code).trim();
        // Store or update with code if not already set
        if (!map.has(trainerName) || (trainerCode && trainerCode !== 'nan' && trainerCode !== '')) {
          map.set(trainerName, trainerCode && trainerCode.toLowerCase() !== 'nan' ? trainerCode : '');
        }
      }
    });
    
    console.log('[TrainerDeployment] Total rows:', allData.length);
    console.log('[TrainerDeployment] Found trainers:', map.size);
    if (map.size > 0) {
      console.log('[TrainerDeployment] Sample trainers:', Array.from(map.keys()).slice(0, 5));
    }
    return map;
  }, [allData]);

  // Get sorted list of trainers with display format "Name - Code"
  const assignedTrainers = useMemo(() => {
    return Array.from(trainerMap.entries())
      .map(([name, code]) => ({
        name,
        code,
        display: code ? `${name} - ${code}` : name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [trainerMap]);

  // Filter trainers for dropdown based on search (search in name, code, or display)
  const filteredTrainers = useMemo(() => {
    if (!trainerSearch) return assignedTrainers;
    const search = trainerSearch.toLowerCase();
    return assignedTrainers.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.code.toLowerCase().includes(search) ||
        t.display.toLowerCase().includes(search)
    );
  }, [assignedTrainers, trainerSearch]);

  // Get deployment data for selected trainer
  const deploymentData = useMemo<DeploymentRow[]>(() => {
    if (!selectedTrainer) return [];

    let filtered = allData.filter((row) => {
      const trainer = String(row.Trainer || '').trim();
      return trainer === selectedTrainer;
    });

    // Apply date filter
    if (startDate) {
      filtered = filtered.filter((row) => {
        const rowDate = row.Date ? String(row.Date).split('T')[0] : '';
        return rowDate >= startDate;
      });
    }
    if (endDate) {
      filtered = filtered.filter((row) => {
        const rowDate = row.Date ? String(row.Date).split('T')[0] : '';
        return rowDate <= endDate;
      });
    }

    // Sort by date first, then map to display format
    return filtered
      .sort((a, b) => {
        const dateA = a.Date ? String(a.Date).split('T')[0] : '';
        const dateB = b.Date ? String(b.Date).split('T')[0] : '';
        return dateA.localeCompare(dateB);
      })
      .map((row) => ({
        Date: formatDisplayDate(row.Date),
        'Delivery ID': String(row['Delivery ID'] || ''),
        Course: String(row.Course || ''),
        Batch: String(row.Batch || ''),
        Client: String(row.Client || ''),
        Status: String(row.Status || ''),
      }));
  }, [allData, selectedTrainer, startDate, endDate]);

  // Stats for selected trainer
  const stats = useMemo(() => {
    if (!selectedTrainer || deploymentData.length === 0) {
      return {
        totalDeployments: 0,
        uniquePrograms: 0,
        uniqueClients: 0,
        dateRange: '',
      };
    }

    const programs = new Set(deploymentData.map((d) => d['Delivery ID']));
    const clients = new Set(deploymentData.map((d) => d.Client));
    const dates = deploymentData.map((d) => d.Date).filter(Boolean).sort();

    return {
      totalDeployments: deploymentData.length,
      uniquePrograms: programs.size,
      uniqueClients: clients.size,
      dateRange: dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : '',
    };
  }, [deploymentData, selectedTrainer]);

  const columns = useMemo<ColumnDef<DeploymentRow>[]>(
    () => [
      {
        accessorKey: 'Date',
        header: 'Date',
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Delivery ID',
        header: 'Delivery ID',
        cell: (info) => (
          <span className="text-sm font-semibold text-indigo-600">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Course',
        header: 'Course',
        cell: (info) => (
          <span className="text-sm text-gray-700">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Batch',
        header: 'Batch',
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
        accessorKey: 'Client',
        header: 'Client',
        cell: (info) => (
          <span className="text-sm text-gray-600">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Status',
        header: 'Status',
        cell: (info) => {
          const value = info.getValue() as string;
          const statusColor =
            value?.toLowerCase() === 'ongoing'
              ? 'bg-green-100 text-green-700'
              : value?.toLowerCase() === 'completed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700';
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
              {value || '—'}
            </span>
          );
        },
      },
    ],
    []
  );

  // Get display name for selected trainer
  const selectedTrainerDisplay = useMemo(() => {
    const trainer = assignedTrainers.find((t) => t.name === selectedTrainer);
    return trainer?.display || selectedTrainer;
  }, [assignedTrainers, selectedTrainer]);

  const handleSelectTrainer = (trainerName: string) => {
    setSelectedTrainer(trainerName);
    setTrainerSearch('');
    setDropdownOpen(false);
  };

  const clearTrainer = () => {
    setSelectedTrainer('');
    setTrainerSearch('');
  };

  const exportToCSV = () => {
    if (deploymentData.length === 0) return;

    const headers = ['Date', 'Delivery ID', 'Course', 'Batch', 'Client', 'Status'];
    const csvContent = [
      headers.join(','),
      ...deploymentData.map((row) =>
        headers.map((h) => `"${row[h as keyof DeploymentRow] || ''}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trainer_deployment_${selectedTrainer}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading trainer deployment data..." />
      </div>
    );
  }

  if (!status?.is_loaded) {
    return (
      <>
        <PageHeader
          title="Trainer Calendar"
          description="View deployment schedule for individual trainers"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to view trainer calendar"
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainer Calendar"
        description="View deployment schedule and assignments for individual trainers"
        icon={<MapPin size={24} />}
      />

      {/* Trainer Selection & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <UserCheck size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Select Trainer</h3>
            <p className="text-xs text-gray-500">
              Search and select a trainer to view their deployment schedule
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trainer Selector */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Trainer Name
            </label>
            <div className="relative">
              {selectedTrainer ? (
                <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-indigo-600" />
                    <span className="font-medium text-indigo-700">{selectedTrainerDisplay}</span>
                  </div>
                  <button
                    onClick={clearTrainer}
                    className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
                  >
                    <X size={16} className="text-indigo-600" />
                  </button>
                </div>
              ) : (
                <div
                  className="relative cursor-pointer"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={trainerSearch}
                    onChange={(e) => {
                      setTrainerSearch(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Search trainer by name..."
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <ChevronDown
                    size={16}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              )}

              {/* Dropdown */}
              {dropdownOpen && !selectedTrainer && (
                <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 max-h-64 overflow-y-auto">
                  {assignedTrainers.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      <p className="font-medium mb-1">No trainers found</p>
                      <p className="text-xs">No trainers with assignments found in the data.</p>
                    </div>
                  ) : filteredTrainers.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      <p className="font-medium mb-1">No matches</p>
                      <p className="text-xs">No trainers match your search "{trainerSearch}"</p>
                    </div>
                  ) : (
                    filteredTrainers.map((trainer) => (
                      <button
                        key={trainer.name}
                        onClick={() => handleSelectTrainer(trainer.name)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-indigo-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                      >
                        <UserCheck size={14} className="text-gray-400" />
                        <div className="flex flex-col">
                          <span className="font-medium">{trainer.name}</span>
                          {trainer.code && (
                            <span className="text-xs text-gray-500">{trainer.code}</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedTrainer || startDate || endDate) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTrainer && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                <UserCheck size={12} />
                {selectedTrainerDisplay}
                <button onClick={clearTrainer} className="ml-1 hover:text-indigo-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <Calendar size={12} />
                From: {startDate}
                <button onClick={() => setStartDate('')} className="ml-1 hover:text-green-900">
                  <X size={12} />
                </button>
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                <Calendar size={12} />
                To: {endDate}
                <button onClick={() => setEndDate('')} className="ml-1 hover:text-orange-900">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {selectedTrainer && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Deployments"
            value={stats.totalDeployments}
            icon={<Calendar size={20} />}
            color="indigo"
          />
          <KPICard
            title="Unique Programs"
            value={stats.uniquePrograms}
            icon={<MapPin size={20} />}
            color="green"
          />
          <KPICard
            title="Unique Clients"
            value={stats.uniqueClients}
            icon={<UserCheck size={20} />}
            color="orange"
          />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Calendar size={16} />
              <span className="text-sm font-medium">Date Range</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {stats.dateRange || 'No data'}
            </p>
          </div>
        </div>
      )}

      {/* Deployment Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Deployment Schedule</h3>
            <p className="text-sm text-gray-500">
              {selectedTrainer
                ? `Showing ${deploymentData.length} deployments for ${selectedTrainerDisplay}`
                : 'Select a trainer to view their deployment schedule'}
            </p>
          </div>
          {selectedTrainer && deploymentData.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              <Download size={16} />
              Export CSV
            </button>
          )}
        </div>

        {!selectedTrainer ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck size={32} className="text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Trainer</h4>
            <p className="text-gray-500 text-sm">
              Search and select a trainer from the dropdown above to view their deployment schedule
            </p>
          </div>
        ) : deploymentData.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-orange-500" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Deployments Found</h4>
            <p className="text-gray-500 text-sm">
              No deployment records found for {selectedTrainerDisplay} in the selected date range
            </p>
          </div>
        ) : (
          <DataTable
            data={deploymentData}
            columns={columns}
            pageSize={20}
            searchPlaceholder="Search deployments..."
          />
        )}
      </div>
    </div>
  );
}
