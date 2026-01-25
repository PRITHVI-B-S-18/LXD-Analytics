import { ReactNode } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl flex items-center justify-center">
        {icon || <FileSpreadsheet className="h-10 w-10 text-gray-400" />}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:from-primary-700 hover:to-primary-600 transition-all shadow-lg shadow-primary-500/25"
        >
          <Upload size={18} />
          {action.label}
        </button>
      )}
    </div>
  );
}
