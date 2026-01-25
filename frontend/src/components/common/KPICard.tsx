import { ReactNode } from 'react';
import clsx from 'clsx';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'indigo' | 'teal';
  variant?: 'default' | 'gradient' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    border: 'border-blue-200',
    text: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    gradient: 'from-green-500 to-green-600',
    border: 'border-green-200',
    text: 'text-green-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-100 text-yellow-600',
    gradient: 'from-yellow-500 to-yellow-600',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
    border: 'border-orange-200',
    text: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    gradient: 'from-red-500 to-red-600',
    border: 'border-red-200',
    text: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    border: 'border-purple-200',
    text: 'text-purple-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-100 text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'bg-teal-100 text-teal-600',
    gradient: 'from-teal-500 to-teal-600',
    border: 'border-teal-200',
    text: 'text-teal-600',
  },
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  variant = 'default',
  size = 'md',
}: KPICardProps) {
  const config = colorConfig[color];

  if (variant === 'gradient') {
    return (
      <div className={clsx(
        'relative overflow-hidden rounded-2xl p-6 text-white shadow-lg',
        `bg-gradient-to-br ${config.gradient}`
      )}>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{title}</p>
              <p className={clsx(
                'mt-2 font-bold text-white',
                size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'
              )}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {subtitle && (
                <p className="mt-1 text-xs text-white/70">{subtitle}</p>
              )}
            </div>
            {icon && (
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                {icon}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'outlined') {
    return (
      <div className={clsx(
        'rounded-2xl border-2 bg-white p-6 transition-all hover:shadow-md',
        config.border
      )}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={clsx(
              'mt-2 font-bold',
              config.text,
              size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={clsx('rounded-xl p-3', config.icon)}>
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={clsx(
            'mt-2 font-bold text-gray-900',
            size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={clsx('rounded-xl p-3', config.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
