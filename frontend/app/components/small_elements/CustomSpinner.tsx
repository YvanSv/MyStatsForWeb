interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className = "" }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} border-white/10 border-t-vert rounded-full animate-spin`}/>
    </div>
  );
};

export const PulseSpinner = () => (
  <div className="flex space-x-1 justify-center items-center h-full">
    <div className="h-2 w-2 bg-vert rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="h-2 w-2 bg-vert rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="h-2 w-2 bg-vert rounded-full animate-bounce"></div>
  </div>
);