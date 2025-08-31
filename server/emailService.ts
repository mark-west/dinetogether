import sgMail from '@sendgrid/mail';
import type { Event, EventRsvp, User } from '@shared/schema';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface CalendarLinks {
  google: string;
  outlook: string;
  ics: string;
}

function formatDateForCalendar(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function generateCalendarLinks(event: Event): CalendarLinks {
  const eventDate = new Date(event.dateTime);
  const startDate = formatDateForCalendar(eventDate.toISOString());
  const endDate = formatDateForCalendar(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString());
  
  const title = encodeURIComponent(event.name);
  let locationString = '';
  if (event.restaurantName && event.restaurantAddress) {
    locationString = `${event.restaurantName}, ${event.restaurantAddress}`;
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

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&location=${location}&details=${details}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startDate}&enddt=${endDate}&location=${location}&body=${details}`,
    ics: `https://calendar.google.com/calendar/ical/primary/events/${event.id}.ics`
  };
}

function generateIcsContent(event: Event): string {
  const eventDate = new Date(event.dateTime);
  const startDate = formatDateForCalendar(eventDate.toISOString());
  const endDate = formatDateForCalendar(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString());
  
  let locationString = '';
  if (event.restaurantName && event.restaurantAddress) {
    locationString = `${event.restaurantName}, ${event.restaurantAddress}`;
    if (event.restaurantLat && event.restaurantLng) {
      locationString += ` (${event.restaurantLat}, ${event.restaurantLng})`;
    }
  } else if (event.restaurantAddress) {
    locationString = event.restaurantAddress;
  } else if (event.restaurantName) {
    locationString = event.restaurantName;
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DineSync//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${event.name}`,
    `LOCATION:${locationString}`,
    `DESCRIPTION:${event.description || ''}`,
    `UID:${event.id}@dinesync.app`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export async function sendEventUpdateNotifications(
  event: Event,
  rsvps: Array<EventRsvp & { user: User }>,
  type: 'updated' | 'cancelled'
): Promise<void> {
  // Make email sending non-blocking - don't throw errors if email fails
  try {
    const calendarLinks = generateCalendarLinks(event);
    const icsContent = generateIcsContent(event);
    
    const emailPromises = rsvps.map(async (rsvp) => {
      if (!rsvp.user.email) return;

      const formatDateTime = (dateValue: string | Date) => {
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      };

      const subject = type === 'updated' 
        ? `📅 Event Updated: ${event.name}`
        : `❌ Event Cancelled: ${event.name}`;

      const htmlContent = type === 'updated' ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">🍽️ Event Updated!</h2>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">${event.name}</h3>
            <p style="margin: 8px 0;"><strong>📍 Location:</strong> ${event.restaurantName || 'TBD'}</p>
            <p style="margin: 8px 0;"><strong>📅 Date & Time:</strong> ${formatDateTime(event.dateTime.toISOString())}</p>
            ${event.description ? `<p style="margin: 8px 0;"><strong>📝 Details:</strong> ${event.description}</p>` : ''}
          </div>

          <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: #1976d2; margin-top: 0;">📅 Update Your Calendar</h4>
            <p style="margin-bottom: 15px;">Click below to update your calendar with the new event details:</p>
            
            <div style="text-align: center;">
              <a href="${calendarLinks.google}" 
                 style="display: inline-block; background: #4285f4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
                📅 Google Calendar
              </a>
              <a href="${calendarLinks.outlook}" 
                 style="display: inline-block; background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
                📅 Outlook Calendar
              </a>
            </div>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            This email was sent because you RSVP'd to this event. If you can't attend, please update your RSVP in the app.
          </p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f; margin-bottom: 20px;">❌ Event Cancelled</h2>
          
          <div style="background: #ffebee; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #d32f2f; margin-top: 0;">${event.name}</h3>
            <p style="margin: 8px 0;">This event has been cancelled by the organizer.</p>
            <p style="margin: 8px 0;"><strong>Original Date:</strong> ${formatDateTime(event.dateTime.toISOString())}</p>
            <p style="margin: 8px 0;"><strong>Location:</strong> ${event.restaurantName || 'TBD'}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            Please remove this event from your calendar if you have already added it.
          </p>
        </div>
      `;

      const msg = {
        to: rsvp.user.email,
        from: 'dinesync@replit.dev', // Using Replit dev domain for testing
        subject,
        html: htmlContent,
        attachments: type === 'updated' ? [{
          content: Buffer.from(icsContent).toString('base64'),
          filename: `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`,
          type: 'text/calendar',
          disposition: 'attachment'
        }] : undefined
      };

      return sgMail.send(msg);
    });

    const results = await Promise.allSettled(emailPromises);
    
    // Log results for debugging
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Email notifications: ${successful} sent, ${failed} failed out of ${rsvps.length} participants`);
    
    // Log failed attempts for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send email to ${rsvps[index]?.user?.email}:`, result.reason);
      }
    });
  } catch (error) {
    console.error(`Error sending ${type} notifications:`, error);
    // Don't throw - let event update succeed even if email fails
  }
}