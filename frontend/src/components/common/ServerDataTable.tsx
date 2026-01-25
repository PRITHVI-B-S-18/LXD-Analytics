import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

interface ServerDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  onSearch?: (searchTerm: string) => void;
  searchValue?: string;
}

export default function ServerDataTable<T>({
  data,
  columns,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  onSearch,
  searchValue = '',
}: ServerDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const pagination: PaginationState = {
    pageIndex: page - 1, // TanStack Table uses 0-based index
    pageSize,
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    pageCount: totalPages,
    manualPagination: true, // Server-side pagination
    manualSorting: false, // Client-side sorting for current page
  });

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    onPageSizeChange(newSize);
    // Reset to page 1 when page size changes
    onPageChange(1);
  };

  return (
    <div className="overflow-hidden">
      {/* Search */}
      {showSearch && (
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-colors"
            />
          </div>
          {localSearch && (
            <p className="mt-2 text-xs text-gray-500">
              Showing {data.length} of {total} result{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50/80">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={clsx(
                      'px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-gray-900 transition-colors'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-4 w-4 text-primary-600" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-4 w-4 text-primary-600" />
                          ) : (
                            <div className="flex flex-col">
                              <ChevronUp className="h-3 w-3 -mb-1 opacity-30" />
                              <ChevronDown className="h-3 w-3 opacity-30" />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Showing {data.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, total)} of {total} entries
          </span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              page === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              page === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              page >= totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={page >= totalPages}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              page >= totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
