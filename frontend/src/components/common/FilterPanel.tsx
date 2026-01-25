import { useState, useMemo, ReactNode } from 'react';
import { Filter, X, Search, ChevronDown, Check, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  icon?: ReactNode;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  icon,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const term = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(term));
  }, [options, search]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => onChange(filteredOptions.map((o) => o.value));
  const clearAll = () => onChange([]);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-left transition-all',
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-100 bg-white'
            : 'border-gray-200 bg-white hover:border-gray-300'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className={clsx(
            'text-sm truncate',
            selected.length === 0 ? 'text-gray-400' : 'text-gray-700'
          )}>
            {selected.length === 0
              ? placeholder
              : `${selected.length} selected`}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={clsx(
            'text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-100">
              <button
                onClick={selectAll}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearAll}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left group"
                  >
                    <div
                      className={clsx(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                        selected.includes(option.value)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300 group-hover:border-gray-400'
                      )}
                    >
                      {selected.includes(option.value) && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {option.label}
                    </span>
                    {option.count !== undefined && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {option.count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Apply */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface DateFilterProps {
  label: string;
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

export function DateFilter({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateFilterProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={startDate?.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              onStartDateChange(e.target.value ? new Date(e.target.value) : null)
            }
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            placeholder="From"
          />
        </div>
        <span className="text-gray-400">→</span>
        <div className="relative flex-1">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={endDate?.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              onEndDateChange(e.target.value ? new Date(e.target.value) : null)
            }
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            placeholder="To"
          />
        </div>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  children: ReactNode;
  activeCount?: number;
  onClearAll?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function FilterPanel({
  children,
  activeCount = 0,
  onClearAll,
  collapsible = true,
  defaultCollapsed = false,
}: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div
        className={clsx(
          'flex items-center justify-between px-6 py-4',
          collapsible && 'cursor-pointer hover:bg-gray-50'
        )}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Filter size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            {activeCount > 0 && (
              <p className="text-xs text-gray-500">
                {activeCount} filter{activeCount > 1 ? 's' : ''} active
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && onClearAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={14} />
              Clear All
            </button>
          )}
          {collapsible && (
            <ChevronDown
              size={20}
              className={clsx(
                'text-gray-400 transition-transform',
                !isCollapsed && 'rotate-180'
              )}
            />
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
