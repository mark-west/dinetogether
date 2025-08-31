interface IconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const getSizeClass = (size: IconProps['size'] = 'md') => {
  switch (size) {
    case 'xs': return 'text-xs';
    case 'sm': return 'text-sm';
    case 'md': return 'text-base';
    case 'lg': return 'text-lg';
    case 'xl': return 'text-xl';
    case '2xl': return 'text-2xl';
    case '3xl': return 'text-3xl';
  }
};

export function RestaurantIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-utensils ${getSizeClass(size)} ${className}`}></i>
  );
}

export function CalendarIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-calendar ${getSizeClass(size)} ${className}`}></i>
  );
}

export function UsersIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-users ${getSizeClass(size)} ${className}`}></i>
  );
}

export function LocationIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-map-marker-alt ${getSizeClass(size)} ${className}`}></i>
  );
}

export function ChatIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-comments ${getSizeClass(size)} ${className}`}></i>
  );
}

export function EyeIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-eye ${getSizeClass(size)} ${className}`}></i>
  );
}

export function PlusIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-plus ${getSizeClass(size)} ${className}`}></i>
  );
}

export function ArrowRightIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-arrow-right ${getSizeClass(size)} ${className}`}></i>
  );
}

export function CheckCircleIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-check-circle ${getSizeClass(size)} ${className}`}></i>
  );
}

export function StarIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-star ${getSizeClass(size)} ${className}`}></i>
  );
}

export function UserPlusIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-user-plus ${getSizeClass(size)} ${className}`}></i>
  );
}

export function HomeIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-home ${getSizeClass(size)} ${className}`}></i>
  );
}

export function ReplyIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-reply ${getSizeClass(size)} ${className}`}></i>
  );
}

export function UserIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-user ${getSizeClass(size)} ${className}`}></i>
  );
}

export function EditIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-edit ${getSizeClass(size)} ${className}`}></i>
  );
}

export function CopyIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-copy ${getSizeClass(size)} ${className}`}></i>
  );
}

export function TrashIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-trash ${getSizeClass(size)} ${className}`}></i>
  );
}

export function ClockIcon({ className = '', size }: IconProps) {
  return (
    <i className={`fas fa-clock ${getSizeClass(size)} ${className}`}></i>
  );
}