import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { UsersIcon, EyeIcon, UserPlusIcon } from "./app-icons";
import { format } from "date-fns";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description?: string;
    photoUrl?: string;
    memberCount: number;
    role: 'admin' | 'member';
    createdAt: string;
  };
  variant?: 'summary' | 'detailed';
  showActions?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GroupCard({ 
  group, 
  variant = 'summary', 
  showActions = false,
  onClick,
  className = '' 
}: GroupCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/groups/${group.id}`;
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    
    switch (action) {
      case 'view':
        window.location.href = `/groups/${group.id}`;
        break;
      case 'invite':
        window.location.href = `/groups/${group.id}?tab=members&invite=true`;
        break;
    }
  };

  if (variant === 'detailed') {
    return (
      <Card 
        className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={handleCardClick}
        data-testid={`card-group-${group.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            {/* Group Photo */}
            <div className="w-full sm:w-auto flex justify-center sm:justify-start">
              {group.photoUrl ? (
                <img 
                  src={group.photoUrl} 
                  alt={`${group.name} photo`}
                  className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                  data-testid={`img-group-photo-${group.id}`}
                />
              ) : (
                <div className="w-20 h-20 sm:w-16 sm:h-16 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {group.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                <CardTitle className="text-lg leading-tight" data-testid={`text-group-name-${group.id}`}>
                  {group.name}
                </CardTitle>
                <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 mx-auto sm:mx-0 ${
                  group.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-800'
                }`} data-testid={`text-role-${group.id}`}>
                  {group.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground" data-testid={`text-member-count-${group.id}`}>
                {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${group.id}`}>
              {group.description}
            </p>
          )}
          
          <div className="text-sm text-muted-foreground">
            <span>Created {format(new Date(group.createdAt), 'MMM d, yyyy')}</span>
          </div>
          
          {showActions && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs w-full"
                onClick={(e) => handleActionClick(e, 'view')}
                data-testid={`button-view-group-${group.id}`}
              >
                <EyeIcon className="mr-1" size="xs" />
                View
              </Button>
              {group.role === 'admin' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs w-full"
                  onClick={(e) => handleActionClick(e, 'invite')}
                  data-testid={`button-invite-${group.id}`}
                >
                  <UserPlusIcon className="mr-1" size="xs" />
                  Invite
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Summary variant (for dashboard)
  return (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleCardClick}
      data-testid={`card-group-${group.id}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 w-full">
            <div className="w-16 h-16 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold mx-auto sm:mx-0">
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h4 className="font-semibold text-foreground" data-testid={`text-group-name-${group.id}`}>
                {group.name}
              </h4>
              <p className="text-sm text-muted-foreground" data-testid={`text-member-count-${group.id}`}>
                {group.memberCount} members
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full mx-auto sm:mx-0 ${
            group.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-800'
          }`} data-testid={`text-role-${group.id}`}>
            {group.role === 'admin' ? 'Admin' : 'Member'}
          </span>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <span>Created {format(new Date(group.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </CardContent>
    </Card>
  );
}