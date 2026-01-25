import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
}

const statusStyles: Record<string, StatusConfig> = {
  Completed: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  Ongoing: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  Upcoming: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  Cancelled: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  Pending: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
  },
};

const defaultStyle: StatusConfig = {
  bg: 'bg-gray-50 border-gray-200',
  text: 'text-gray-700',
  dot: 'bg-gray-500',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const style = statusStyles[status] || defaultStyle;
  
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg border font-medium',
        style.bg,
        style.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', style.dot)} />
      {status}
    </span>
  );
}
