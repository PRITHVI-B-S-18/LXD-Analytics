import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  pageSize?: number;
  showSearch?: boolean;
}

export default function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  showSearch = true,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const totalResults = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  return (
    <div className="overflow-hidden">
      {/* Search */}
      {showSearch && (
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-500 focus:bg-white transition-colors"
            />
          </div>
          {globalFilter && (
            <p className="mt-2 text-xs text-gray-500">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
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
                            <div className="flex flex-col -space-y-1.5">
                              <ChevronUp className="h-3 w-3" />
                              <ChevronDown className="h-3 w-3" />
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
                <td
                  colSpan={columns.length}
                  className="px-6 py-16 text-center"
                >
                  <div className="text-gray-400">
                    <Search size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-gray-500">No results found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr 
                  key={row.id} 
                  className={clsx(
                    'hover:bg-gray-50/50 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-900">
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
      {totalResults > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{currentPage * pageSize + 1}</span> to{' '}
            <span className="font-semibold">{Math.min((currentPage + 1) * pageSize, totalResults)}</span>{' '}
            of <span className="font-semibold">{totalResults}</span> results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => table.setPageIndex(pageNum)}
                    className={clsx(
                      'min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all',
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                    )}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
