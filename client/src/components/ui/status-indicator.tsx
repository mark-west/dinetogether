import { Badge } from "./badge";

export type RsvpStatus = 'confirmed' | 'maybe' | 'declined' | 'pending';

interface StatusIndicatorProps {
  status: RsvpStatus;
  variant?: 'dot' | 'badge' | 'both';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getStatusColor = (status: RsvpStatus) => {
  switch (status) {
    case 'confirmed': return 'bg-green-500';
    case 'maybe': return 'bg-yellow-500';
    case 'declined': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusBadgeColor = (status: RsvpStatus) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'maybe': return 'bg-yellow-100 text-yellow-800';
    case 'declined': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: RsvpStatus) => {
  switch (status) {
    case 'confirmed': return 'Going';
    case 'maybe': return 'Maybe';
    case 'declined': return 'Declined';
    default: return 'Pending';
  }
};

const getDotSize = (size: 'sm' | 'md' | 'lg') => {
  switch (size) {
    case 'sm': return 'w-2 h-2';
    case 'md': return 'w-3 h-3';
    case 'lg': return 'w-4 h-4';
  }
};

export function StatusIndicator({ 
  status, 
  variant = 'both', 
  size = 'md',
  className = '' 
}: StatusIndicatorProps) {
  if (variant === 'dot') {
    return (
      <div className={`${getDotSize(size)} rounded-full ${getStatusColor(status)} ${className}`}></div>
    );
  }

  if (variant === 'badge') {
    return (
      <Badge 
        variant="secondary" 
        className={`${getStatusBadgeColor(status)} ${className}`}
      >
        {getStatusText(status)}
      </Badge>
    );
  }

  // variant === 'both'
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${getDotSize(size)} rounded-full ${getStatusColor(status)}`}></div>
      <Badge variant="secondary" className={getStatusBadgeColor(status)}>
        {getStatusText(status)}
      </Badge>
    </div>
  );
}