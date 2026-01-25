interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="relative">
        <div
          className={`animate-spin rounded-full border-primary-200 ${sizeClasses[size]}`}
          style={{ borderTopColor: 'transparent' }}
        />
        <div
          className={`absolute inset-0 animate-spin rounded-full border-primary-600 ${sizeClasses[size]}`}
          style={{ 
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            animationDirection: 'reverse',
            animationDuration: '0.6s',
          }}
        />
      </div>
      {text && (
        <p className="mt-4 text-sm text-gray-500 animate-pulse">{text}</p>
      )}
    </div>
  );
}
