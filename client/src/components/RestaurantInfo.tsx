import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Calendar, Users, Star, MapPin, DollarSign, Utensils, Sparkles, Globe, Clock } from 'lucide-react';
import { getRestaurantWebsiteUrl, getWebsiteLinkText } from '@/lib/restaurantUtils';
import GoogleMapComponent from './GoogleMapComponent';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  description: string;
  address?: string;
  location?: string;
  rating?: number;
  estimatedRating?: number;
  reviewCount?: number;
  userRatingsTotal?: number;
  confidence?: number;
  phoneNumber?: string;
  website?: string;
  openingHours?: {
    open_now?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
  };
  menuHighlights?: string[];
  features?: string[];
  reviews?: any[];
  latitude?: number;
  longitude?: number;
}

interface Group {
  id: string;
  name: string;
}

interface RestaurantInfoProps {
  restaurant: Restaurant;
  onBack?: () => void;
  backText?: string;
  showEventCreation?: boolean;
  additionalActions?: React.ReactNode;
  className?: string;
}

// Format business hours for display
function formatBusinessHours(openingHours: any): string {
  if (!openingHours) return 'Hours not available';
  
  try {
    // Check for the enhanced weekdayDescriptions first
    if (openingHours.weekdayDescriptions && Array.isArray(openingHours.weekdayDescriptions)) {
      return openingHours.weekdayDescriptions.join('\n');
    }
    
    // Fallback to other possible formats
    const hoursData = openingHours.weekday_text || 
                     openingHours.regularOpeningHours?.weekdayDescriptions;
    
    if (Array.isArray(hoursData)) {
      return hoursData.join('\n') || 'Hours not available';
    }
    
    return 'Hours not available';
  } catch (error) {
    console.error('Error formatting business hours:', error);
    return 'Hours not available';
  }
}

function formatTodaysHours(openingHours: any): string {
  if (!openingHours) return 'Hours not available';
  
  try {
    // Check for the enhanced weekdayDescriptions first
    let hoursData = openingHours.weekdayDescriptions;
    
    if (!Array.isArray(hoursData)) {
      hoursData = openingHours.weekday_text || 
                  openingHours.regularOpeningHours?.weekdayDescriptions;
    }
    
    if (Array.isArray(hoursData)) {
      const today = new Date().getDay();
      const googleDay = today === 0 ? 6 : today - 1;
      
      if (hoursData[googleDay]) {
        return hoursData[googleDay];
      }
      return hoursData[0] || 'Hours not available';
    }
    
    // Fallback to basic open/closed status
    if (openingHours.open_now !== undefined) {
      return openingHours.open_now ? 'Currently Open' : 'Currently Closed';
    }
    
    return 'Hours not available';
  } catch (error) {
    console.error('Error formatting today\'s hours:', error);
    return 'Hours not available';
  }
}

export function RestaurantInfo({ 
  restaurant, 
  onBack, 
  backText = "Back", 
  showEventCreation = true,
  additionalActions,
  className = ""
}: RestaurantInfoProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: `Dining at ${restaurant.name}`,
    description: '',
    groupId: '',
    dateTime: '',
    maxAttendees: 4
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    enabled: !!user && showEventCreation
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest('POST', '/api/events', eventData);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event Created!",
        description: `Successfully created event at ${restaurant?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setShowEventDialog(false);
      setEventForm({
        title: `Dining at ${restaurant.name}`,
        description: '',
        groupId: '',
        dateTime: '',
        maxAttendees: 4
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive"
      });
      console.error('Error creating event:', error);
    }
  });

  const handleCreateEvent = () => {
    if (!eventForm.groupId || !eventForm.dateTime) {
      toast({
        title: "Missing Information",
        description: "Please select a group and date/time for the event.",
        variant: "destructive"
      });
      return;
    }

    const eventData = {
      groupId: eventForm.groupId,
      name: eventForm.title,
      description: eventForm.description,
      dateTime: eventForm.dateTime,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address || restaurant.location || '',
      restaurantImageUrl: '',
      maxAttendees: eventForm.maxAttendees
    };

    createEventMutation.mutate(eventData);
  };

  const displayRating = restaurant.rating || restaurant.estimatedRating || 0;
  const displayAddress = restaurant.address || restaurant.location || '';
  const businessHours = formatBusinessHours(restaurant.openingHours);
  const todaysHours = formatTodaysHours(restaurant.openingHours);
  const websiteText = getWebsiteLinkText();

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mr-4"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backText}
            </Button>
          )}
          <h1 className="text-2xl font-bold">Restaurant Details</h1>
        </div>

        {/* Restaurant Info Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Utensils className="w-6 h-6 text-orange-500" />
                  <CardTitle className="text-2xl" data-testid="text-restaurant-name">
                    {restaurant.name}
                  </CardTitle>
                </div>
                <p className="text-muted-foreground mb-2">{restaurant.type}</p>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{displayRating.toFixed(1)}/5</span>
                    {restaurant.userRatingsTotal && (
                      <span className="text-sm text-muted-foreground">
                        ({restaurant.userRatingsTotal.toLocaleString()} reviews)
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {restaurant.priceRange}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Address */}
            {displayAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                <span className="text-sm">{displayAddress}</span>
              </div>
            )}

            {/* Hours */}
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium mb-1">Today's Hours</p>
                <p className="text-muted-foreground">{todaysHours}</p>
              </div>
            </div>

            {/* Description */}
            {restaurant.description && (
              <div>
                <p className="text-sm text-muted-foreground">{restaurant.description}</p>
              </div>
            )}

            {/* Features */}
            {restaurant.features && restaurant.features.length > 0 && (
              <div>
                <p className="font-medium mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {restaurant.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                onClick={async () => {
                  const websiteUrl = await getRestaurantWebsiteUrl(restaurant.name, displayAddress);
                  window.location.href = websiteUrl;
                }}
                variant="outline"
                data-testid="button-visit-website"
              >
                <Globe className="w-4 h-4 mr-2" />
                {websiteText}
              </Button>

              {showEventCreation && user && (
                <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-event">
                      <Calendar className="w-4 h-4 mr-2" />
                      Create Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Event at {restaurant.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="eventTitle">Event Title</Label>
                        <Input
                          id="eventTitle"
                          value={eventForm.title}
                          onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter event title"
                        />
                      </div>

                      <div>
                        <Label htmlFor="groupSelect">Select Group</Label>
                        <Select value={eventForm.groupId} onValueChange={(value) => setEventForm(prev => ({ ...prev, groupId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a group" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="dateTime">Date & Time</Label>
                        <Input
                          id="dateTime"
                          type="datetime-local"
                          value={eventForm.dateTime}
                          onChange={(e) => setEventForm(prev => ({ ...prev, dateTime: e.target.value }))}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="maxAttendees">Max Attendees</Label>
                        <Input
                          id="maxAttendees"
                          type="number"
                          min="1"
                          max="50"
                          value={eventForm.maxAttendees}
                          onChange={(e) => setEventForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={eventForm.description}
                          onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Add event details..."
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowEventDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateEvent}
                          disabled={createEventMutation.isPending}
                        >
                          {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {additionalActions}
            </div>
          </CardContent>
        </Card>

        {/* Map and Hours Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayAddress && restaurant.latitude && restaurant.longitude ? (
                <GoogleMapComponent
                  center={{ lat: restaurant.latitude, lng: restaurant.longitude }}
                  markers={[{
                    position: { lat: restaurant.latitude, lng: restaurant.longitude },
                    title: restaurant.name,
                    info: `${restaurant.name}<br/>${displayAddress}`
                  }]}
                  zoom={15}
                  className="w-full h-64 rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No location available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Hours Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-line text-muted-foreground">
                {businessHours}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}