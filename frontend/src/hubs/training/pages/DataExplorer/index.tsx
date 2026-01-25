import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Download, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Table,
  ArrowRight,
} from 'lucide-react';
import { PageHeader, ServerDataTable, LoadingSpinner, EmptyState, StatusBadge } from '../../../../components';
import { getDatapoint, getStatus, getRawAllotment } from '../../../../services/api';
import { formatDisplayDate } from '../../../../utils';
import type { DatapointRow, StatusResponse, RawAllotmentResponse, DatapointResponse } from '../../../../types';

type ViewMode = 'transformed' | 'raw';

export default function DataExplorer() {
  const [viewMode, setViewMode] = useState<ViewMode>('transformed');
  const [transformedData, setTransformedData] = useState<DatapointResponse | null>(null);
  const [rawData, setRawData] = useState<RawAllotmentResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawLoading, setRawLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Pagination state
  const [transformedPage, setTransformedPage] = useState(1);
  const [transformedPageSize, setTransformedPageSize] = useState(50);
  const [rawPage, setRawPage] = useState(1);
  const [rawPageSize, setRawPageSize] = useState(50);

  useEffect(() => {
    const fetchStatus = async () => {
      const statusData = await getStatus();
      setStatus(statusData);
    };
    fetchStatus();
  }, []);

  // Fetch transformed data
  useEffect(() => {
    const fetchTransformedData = async () => {
      // Wait for status to be fetched first
      if (status === null) return;
      
      if (!status.is_loaded) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getDatapoint(startDate, endDate, transformedPage, transformedPageSize);
        setTransformedData(result);
      } catch (error) {
        console.error('Failed to fetch transformed data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransformedData();
  }, [status?.is_loaded, startDate, endDate, transformedPage, transformedPageSize]);

  // Fetch raw data - load on mount and when pagination changes
  useEffect(() => {
    const fetchRawData = async () => {
      // Wait for status to be fetched first
      if (status === null || !status.is_loaded) {
        return;
      }

      setRawLoading(true);
      try {
        const result = await getRawAllotment(rawPage, rawPageSize);
        setRawData(result);
      } catch (error) {
        console.error('Failed to fetch raw data:', error);
      } finally {
        setRawLoading(false);
      }
    };

    fetchRawData();
  }, [status?.is_loaded, rawPage, rawPageSize]);

  // Handler for tab switching
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Reset to page 1 when switching tabs
    if (mode === 'transformed') {
      setTransformedPage(1);
    } else {
      setRawPage(1);
    }
  };

  const transformedColumns = useMemo<ColumnDef<DatapointRow>[]>(
    () => [
      {
        accessorKey: 'Delivery ID',
        header: 'Delivery ID',
        cell: (info) => (
          <span className="font-semibold text-gray-900">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue() as string} size="sm" />,
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
          <span className="text-sm text-gray-700 truncate max-w-[150px] block">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'Start Date',
        header: 'Start',
        cell: (info) => (
          <span className="text-xs text-gray-600">{formatDisplayDate(info.getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'End Date',
        header: 'End',
        cell: (info) => (
          <span className="text-xs text-gray-600">{formatDisplayDate(info.getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'Batch',
        header: 'Batch',
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-sm text-gray-600">{val as string}</span>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          );
        },
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
          if (!value || value === 'nan' || value === 'NA') {
            return (
              <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                Pending
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
              {value}
            </span>
          );
        },
      },
      {
        accessorKey: 'Trainer Code',
        header: 'Code',
        cell: (info) => {
          const value = info.getValue() as string;
          return value ? (
            <span className="text-xs font-mono text-gray-500">{value}</span>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          );
        },
      },
      {
        accessorKey: 'Trainer Type',
        header: 'Type',
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value) return <span className="text-gray-400 text-sm">—</span>;
          return (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
              {value}
            </span>
          );
        },
      },
    ],
    []
  );

  // Dynamic columns for raw data
  const rawColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!rawData?.columns) return [];
    
    return rawData.columns.slice(0, 15).map((col) => ({
      accessorKey: col,
      header: col.length > 10 ? col.substring(0, 10) + '...' : col,
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined || val === 'nan') {
          return <span className="text-gray-400">—</span>;
        }
        return <span className="truncate max-w-[120px] block text-sm">{String(val)}</span>;
      },
    }));
  }, [rawData?.columns]);

  const exportToCSV = async () => {
    try {
      setLoading(true);
      
      let allData: any[] = [];
      let headers: string[] = [];
      const MAX_PAGE_SIZE = 1000; // Backend limit
      
      if (viewMode === 'transformed') {
        // Fetch all transformed data
        const total = transformedData?.total || 0;
        if (total === 0) {
          setLoading(false);
          return;
        }
        
        // Fetch in chunks of 1000 (backend max)
        const chunks = Math.ceil(total / MAX_PAGE_SIZE);
        for (let i = 1; i <= chunks; i++) {
          const pageSize = i === chunks ? total - (chunks - 1) * MAX_PAGE_SIZE : MAX_PAGE_SIZE;
          const result = await getDatapoint(startDate, endDate, i, pageSize);
          allData = [...allData, ...result.data];
        }
        
        if (allData.length > 0) {
          headers = Object.keys(allData[0]);
        }
      } else {
        // Fetch all raw data
        const total = rawData?.total || 0;
        if (total === 0) {
          setLoading(false);
          return;
        }
        
        // Fetch in chunks of 1000 (backend max)
        const chunks = Math.ceil(total / MAX_PAGE_SIZE);
        for (let i = 1; i <= chunks; i++) {
          const pageSize = i === chunks ? total - (chunks - 1) * MAX_PAGE_SIZE : MAX_PAGE_SIZE;
          const result = await getRawAllotment(i, pageSize);
          allData = [...allData, ...result.data];
        }
        
        if (allData.length > 0) {
          headers = Object.keys(allData[0]);
        }
      }

      if (allData.length === 0) {
        setLoading(false);
        return;
      }

      const csvHeaders = headers.join(',');
      const rows = allData.map((row) =>
        headers.map((header) => {
          const val = row[header];
          return `"${val !== null && val !== undefined ? String(val).replace(/"/g, '""') : ''}"`;
        }).join(',')
      );
      const csv = [csvHeaders, ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${viewMode}_data_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!status?.is_loaded && !loading) {
    return (
      <>
        <PageHeader
          title="Data Explorer"
          description="Explore raw and transformed data"
        />
        <EmptyState
          title="No Data Loaded"
          description="Upload an Excel file to explore data"
        />
      </>
    );
  }

  // Full page loading while fetching initial data
  if (loading && !transformedData && !rawData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Explorer"
        description="Verify data transformation and explore raw data"
        icon={<Database size={24} />}
        actions={
          <div className="flex items-center gap-4">
            {viewMode === 'transformed' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
                <ArrowRight size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={endDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
              </div>
            )}
            <button
              onClick={exportToCSV}
              disabled={(viewMode === 'transformed' ? transformedData?.data : rawData?.data)?.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        }
      />

      {/* Transformation Status Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Transformation Status</h3>
            <p className="text-sm text-gray-500">Overview of raw and processed data</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Table size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Raw Allotment Rows</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{rawData?.total ?? 0}</div>
          </div>
          <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={16} className="text-indigo-500" />
              <span className="text-sm font-medium text-indigo-600">Transformed Datapoint Rows</span>
            </div>
            <div className="text-3xl font-bold text-indigo-700">{transformedData?.total || 0}</div>
          </div>
          <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Database size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Data Source</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {rawData?.has_datapoint_sheet ? (
                <>
                  <CheckCircle size={20} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-700">Pre-computed Sheet</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} className="text-blue-500" />
                  <span className="text-sm font-semibold text-blue-700">Auto-transformed</span>
                </>
              )}
            </div>
          </div>
        </div>

        {!rawData?.has_datapoint_sheet && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong className="text-blue-800">Formula 1 Applied:</strong>
              <span className="text-blue-700 ml-1">
                The data was automatically transformed from wide format (dates as columns) to long format 
                (one row per date). Values like "Not yet started", "Training completed", "No Class" have been filtered out.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleViewModeChange('transformed')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
              viewMode === 'transformed'
                ? 'text-indigo-700 bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <RefreshCw size={16} />
              Transformed Data (Datapoint)
              <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                viewMode === 'transformed' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {transformedData?.total || 0}
              </span>
            </div>
            {viewMode === 'transformed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
          <button
            onClick={() => handleViewModeChange('raw')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
              viewMode === 'raw'
                ? 'text-indigo-700 bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Table size={16} />
              Raw Allotment Data
              <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                viewMode === 'raw' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {rawData?.total ?? 0}
              </span>
            </div>
            {viewMode === 'raw' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" text="Loading data..." />
          </div>
        ) : viewMode === 'transformed' ? (
          !transformedData || transformedData.data.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Database size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transformed Data</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No data matches the selected filters, or the transformation couldn't be performed.
              </p>
            </div>
          ) : transformedData ? (
            <ServerDataTable
              data={transformedData.data}
              columns={transformedColumns}
              total={transformedData.total}
              page={transformedData.page}
              pageSize={transformedData.page_size}
              totalPages={transformedData.total_pages}
              onPageChange={setTransformedPage}
              onPageSizeChange={setTransformedPageSize}
              searchPlaceholder="Search transformed data..."
            />
          ) : null
        ) : (
          <>
            {rawLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" text="Loading raw data..." />
              </div>
            ) : rawData && rawData.data.length > 0 ? (
              <div>
                <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>
                    <strong>Note:</strong> Showing first {rawColumns.length} of {rawData.columns.length} columns. 
                    Date columns are visible to verify the wide format structure.
                  </span>
                </div>
                <ServerDataTable
                  data={rawData.data as Record<string, unknown>[]}
                  columns={rawColumns}
                  total={rawData.total}
                  page={rawData.page}
                  pageSize={rawData.page_size}
                  totalPages={rawData.total_pages}
                  onPageChange={setRawPage}
                  onPageSizeChange={setRawPageSize}
                  searchPlaceholder="Search raw data..."
                />
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Table size={28} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Raw Allotment Data</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  The uploaded file doesn't contain an Allotment Data sheet.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
