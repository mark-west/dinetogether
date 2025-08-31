import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface CalendarActionsProps {
  event: {
    name: string;
    restaurantName?: string;
    restaurantAddress?: string;
    restaurantLat?: string;
    restaurantLng?: string;
    dateTime: string;
    description?: string;
  };
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
}

export default function CalendarActions({ event, size = "sm", variant = "outline" }: CalendarActionsProps) {
  const formatDateForCalendar = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const generateCalendarLink = (type: 'google' | 'outlook' | 'ics') => {
    const startDate = formatDateForCalendar(event.dateTime);
    const endDate = formatDateForCalendar(new Date(new Date(event.dateTime).getTime() + 2 * 60 * 60 * 1000).toISOString()); // 2 hours later
    
    const title = encodeURIComponent(event.name);
    // Create comprehensive location string with coordinates for better mapping
    let locationString = '';
    if (event.restaurantName && event.restaurantAddress) {
      locationString = `${event.restaurantName}, ${event.restaurantAddress}`;
      // Add coordinates for more precise location if available
      if (event.restaurantLat && event.restaurantLng) {
        locationString += ` (${event.restaurantLat}, ${event.restaurantLng})`;
      }
    } else if (event.restaurantAddress) {
      locationString = event.restaurantAddress;
    } else if (event.restaurantName) {
      locationString = event.restaurantName;
    }
    const location = encodeURIComponent(locationString);
    const details = encodeURIComponent(event.description || '');

    switch (type) {
      case 'google':
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&location=${location}&details=${details}`;
      
      case 'outlook':
        return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&location=${location}&body=${details}`;
      
      case 'ics':
        const icsContent = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//DineTogether//Event//EN',
          'BEGIN:VEVENT',
          `DTSTART:${startDate}`,
          `DTEND:${endDate}`,
          `SUMMARY:${event.name}`,
          `LOCATION:${locationString}`,
          `DESCRIPTION:${event.description || ''}`,
          'END:VEVENT',
          'END:VCALENDAR'
        ].join('\r\n');
        
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        return URL.createObjectURL(blob);
      
      default:
        return '';
    }
  };

  const handleCalendarAction = (type: 'google' | 'outlook' | 'ics') => {
    const link = generateCalendarLink(type);
    
    if (type === 'ics') {
      const a = document.createElement('a');
      a.href = link;
      a.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(link);
    } else {
      window.open(link, '_blank');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="w-full sm:w-auto" data-testid="button-add-to-calendar">
          <i className="fas fa-calendar-plus mr-2"></i>
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleCalendarAction('google')} data-testid="calendar-google">
          <i className="fab fa-google mr-2"></i>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCalendarAction('outlook')} data-testid="calendar-outlook">
          <i className="fab fa-microsoft mr-2"></i>
          Outlook Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCalendarAction('ics')} data-testid="calendar-ics">
          <i className="fas fa-download mr-2"></i>
          Download (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}