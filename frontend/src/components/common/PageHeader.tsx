import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ title, description, actions, icon }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="hidden sm:flex w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl items-center justify-center text-white shadow-lg shadow-primary-500/25">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
            {description && (
              <p className="mt-1.5 text-sm sm:text-base text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
