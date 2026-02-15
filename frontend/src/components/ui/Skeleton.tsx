import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'stat-card';
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'default' }) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  if (variant === 'stat-card') {
    return (
      <div className={`overflow-hidden shadow-md rounded-xl border border-gray-200 ${className}`}>
        <div className="px-3 py-4 sm:px-6 sm:py-6">
          <div className="flex items-center sm:flex-row flex-col sm:items-center">
            <div className={`hidden sm:block flex-shrink-0 rounded-xl p-3 sm:p-4 ${baseClasses} w-12 h-12 sm:w-14 sm:h-14`} />
            <div className="sm:ml-5 w-full text-center sm:text-left space-y-2">
              <div className={`h-3 sm:h-4 w-24 ${baseClasses} mx-auto sm:mx-0`} />
              <div className={`h-8 sm:h-9 w-16 ${baseClasses} mx-auto sm:mx-0`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className={`${baseClasses} ${className}`} />;
};

export default Skeleton;
