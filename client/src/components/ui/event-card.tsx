import { Card, CardContent } from "./card";
import { Button } from "./button";
import { StatusIndicator, RsvpStatus } from "./status-indicator";
import { RestaurantIcon, CalendarIcon, LocationIcon, EyeIcon, ChatIcon, ReplyIcon } from "./app-icons";
import { format, isToday, isTomorrow } from "date-fns";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    restaurantName?: string;
    restaurantImageUrl?: string;
    restaurantAddress?: string;
    dateTime: string;
    description?: string;
    group: {
      name: string;
    };
    rsvpStatus?: RsvpStatus;
    attendeeCount?: number;
  };
  variant?: 'summary' | 'detailed';
  showActions?: boolean;
  onClick?: () => void;
  className?: string;
}

const formatEventDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  } else if (isTomorrow(date)) {
    return `Tomorrow, ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'EEEE, MMM d, h:mm a');
  }
};

export function EventCard({ 
  event, 
  variant = 'summary', 
  showActions = false,
  onClick,
  className = '' 
}: EventCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/events/${event.id}`;
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    
    switch (action) {
      case 'view':
        window.location.href = `/events/${event.id}`;
        break;
      case 'chat':
        window.location.href = `/chat/${event.id}`;
        break;
      case 'rsvp':
        window.location.href = `/events/${event.id}`;
        break;
    }
  };

  return (
    <Card 
      className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleCardClick}
      data-testid={`card-event-${event.id}`}
    >
      <CardContent className={variant === 'detailed' ? 'p-6' : 'p-4'}>
        {/* Mobile Stack Layout */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Restaurant Image */}
          <div className="w-full sm:w-auto flex justify-center sm:justify-start">
            {event.restaurantImageUrl ? (
              <img 
                src={event.restaurantImageUrl} 
                alt={event.restaurantName} 
                className={`rounded-lg object-cover ${variant === 'detailed' ? 'w-24 h-24 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-16 sm:h-16'}`}
                data-testid={`img-restaurant-${event.id}`}
              />
            ) : (
              <div className={`bg-muted rounded-lg flex items-center justify-center ${variant === 'detailed' ? 'w-24 h-24 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-16 sm:h-16'}`}>
                <RestaurantIcon 
                  className="text-muted-foreground" 
                  size={variant === 'detailed' ? 'xl' : 'lg'} 
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 w-full text-center sm:text-left">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
              <div className="flex-1">
                <h4 className={`font-semibold text-foreground ${variant === 'detailed' ? 'text-lg' : ''}`} data-testid={`text-restaurant-${event.id}`}>
                  {event.restaurantName || event.name}
                </h4>
                <p className="text-sm text-muted-foreground" data-testid={`text-group-${event.id}`}>
                  {event.group.name}
                </p>
              </div>
              {event.rsvpStatus && (
                <StatusIndicator 
                  status={event.rsvpStatus as RsvpStatus} 
                  variant={variant === 'detailed' ? 'both' : 'badge'}
                  className="flex-shrink-0 mx-auto sm:mx-0"
                />
              )}
            </div>
            
            {/* Event Details */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground ${variant === 'detailed' ? 'mb-4' : 'mb-3'}`}>
              <div className="flex items-center gap-1 justify-center sm:justify-start">
                <CalendarIcon size="xs" />
                <span data-testid={`text-date-${event.id}`}>{formatEventDate(event.dateTime)}</span>
              </div>
              {event.restaurantAddress && (
                <div className="flex items-center gap-1 justify-center sm:justify-start">
                  <LocationIcon size="xs" />
                  <span data-testid={`text-location-${event.id}`} className="truncate">{event.restaurantAddress}</span>
                </div>
              )}
            </div>
            
            {/* Description (detailed variant only) */}
            {variant === 'detailed' && event.description && (
              <p className="text-sm text-muted-foreground mb-4" data-testid={`text-description-${event.id}`}>
                {event.description}
              </p>
            )}
            
            {/* Attendee Count or Actions */}
            {showActions ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto"
                  onClick={(e) => handleActionClick(e, 'view')}
                  data-testid={`button-view-${event.id}`}
                >
                  <EyeIcon className="mr-2" size="sm" />
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={(e) => handleActionClick(e, 'chat')}
                  data-testid={`button-chat-${event.id}`}
                >
                  <ChatIcon className="mr-2" size="sm" />
                  Chat
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={(e) => handleActionClick(e, 'rsvp')}
                  data-testid={`button-rsvp-${event.id}`}
                >
                  <ReplyIcon className="mr-2" size="sm" />
                  RSVP
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs text-muted-foreground" data-testid={`text-attendees-${event.id}`}>
                  {event.attendeeCount || 0} going
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}