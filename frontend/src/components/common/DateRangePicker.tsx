import { format } from 'date-fns';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">From:</label>
        <input
          type="date"
          value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
          onChange={(e) =>
            onStartDateChange(e.target.value ? new Date(e.target.value) : null)
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">To:</label>
        <input
          type="date"
          value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
          onChange={(e) =>
            onEndDateChange(e.target.value ? new Date(e.target.value) : null)
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={() => {
            onStartDateChange(null);
            onEndDateChange(null);
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
