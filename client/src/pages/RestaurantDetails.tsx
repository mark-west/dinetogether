import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
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
  openingHours?: any;
}

interface Group {
  id: string;
  name: string;
}

export default function RestaurantDetails() {
  const [, params] = useRoute('/restaurant/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    groupId: '',
    dateTime: '',
    maxAttendees: 4
  });

  const restaurantId = params?.id;
  const backPath = new URLSearchParams(window.location.search).get('back') || '/dashboard';
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: groups = [] } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!user
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
        title: '',
        description: '',
        groupId: '',
        dateTime: '',
        maxAttendees: 4
      });
      setLocation(`/events/${data.id}`);
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

  useEffect(() => {
    const loadRestaurant = () => {
      if (!restaurantId) return;
      
      setIsLoading(true);
      try {
        // Get restaurant data from sessionStorage (set by AI recommendations)
        const cachedData = sessionStorage.getItem(`restaurant_${restaurantId}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          console.log('LOADED RESTAURANT DATA:', parsed);
          setRestaurant(parsed);
          setIsLoading(false);
          
          // Pre-fill event title with restaurant name
          if (parsed.name) {
            setEventForm(prev => ({
              ...prev,
              title: `Dining at ${parsed.name}`
            }));
          }
          return;
        }

        // If no cached data, redirect back 
        console.log('No restaurant data found for ID:', restaurantId);
        toast({
          title: "Restaurant Not Found",
          description: "Please select a restaurant from AI recommendations",
          variant: "destructive"
        });
        setLocation('/dashboard');
      } catch (error) {
        console.error('Error loading restaurant:', error);
        toast({
          title: "Error",
          description: "Failed to load restaurant details",
          variant: "destructive"
        });
        setLocation('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadRestaurant();
  }, [restaurantId, toast, setLocation]);

  const handleCreateEvent = () => {
    if (!eventForm.title || !eventForm.groupId || !eventForm.dateTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const eventData = {
      ...eventForm,
      restaurantId: restaurant?.id,
      restaurantName: restaurant?.name,
      restaurantAddress: restaurant?.address || restaurant?.location || ''
    };

    createEventMutation.mutate(eventData);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-muted-foreground">Restaurant not found</h2>
          <p className="text-muted-foreground mt-2">Please select a restaurant from AI recommendations</p>
          <Button onClick={() => setLocation('/dashboard')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const displayRating = restaurant.rating || restaurant.estimatedRating || 4.0;
  const displayAddress = restaurant.address || restaurant.location || '';

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(backPath)}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-bg" data-testid="button-create-event">
              <Calendar className="w-4 h-4 mr-2" />
              Create Event Here
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Dining Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Team lunch at..."
                  data-testid="input-event-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell your group about this dining experience..."
                  rows={3}
                  data-testid="textarea-event-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupId">Select Group *</Label>
                <Select 
                  value={eventForm.groupId} 
                  onValueChange={(value) => setEventForm(prev => ({ ...prev, groupId: value }))}
                >
                  <SelectTrigger data-testid="select-group">
                    <SelectValue placeholder="Choose a dining group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group: Group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time *</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={eventForm.dateTime}
                  onChange={(e) => setEventForm(prev => ({ ...prev, dateTime: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  data-testid="input-event-datetime"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  min="1"
                  max="50"
                  value={eventForm.maxAttendees}
                  onChange={(e) => setEventForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 4 }))}
                  data-testid="input-max-attendees"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateEvent}
                  disabled={createEventMutation.isPending}
                  className="flex-1 gradient-bg"
                  data-testid="button-confirm-event"
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEventDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-event"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Restaurant Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-3xl font-bold" data-testid="text-restaurant-name">
                  {restaurant.name}
                </CardTitle>
                {restaurant.confidence && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Match
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1" data-testid="text-cuisine-type">
                  <Utensils className="w-4 h-4" />
                  <span className="capitalize">{restaurant.type}</span>
                </div>
                
                <div className="flex items-center gap-1" data-testid="text-price-range">
                  <DollarSign className="w-4 h-4" />
                  <span>{restaurant.priceRange}</span>
                </div>
                
                <div className="flex items-center gap-1" data-testid="text-rating">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(displayRating)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-1 font-medium">{displayRating.toFixed(1)}</span>
                  {(restaurant.reviewCount || restaurant.userRatingsTotal) && (
                    <span className="text-sm">
                      ({restaurant.reviewCount || restaurant.userRatingsTotal} reviews)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          {restaurant.description && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground" data-testid="text-restaurant-description">
                {restaurant.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Location & Hours */}
          <div className="grid md:grid-cols-2 gap-6">
            {displayAddress && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h3>
                <p className="text-muted-foreground" data-testid="text-restaurant-address">
                  {displayAddress}
                </p>
              </div>
            )}
            
            {restaurant.openingHours && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Hours
                </h3>
                <div className="text-muted-foreground text-sm space-y-1" data-testid="text-restaurant-hours">
                  {restaurant.openingHours.open_now !== undefined && (
                    <p className={`font-medium mb-2 ${restaurant.openingHours.open_now ? 'text-green-600' : 'text-red-600'}`}>
                      {restaurant.openingHours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                    </p>
                  )}
                  {restaurant.openingHours.weekday_text && restaurant.openingHours.weekday_text.length > 0 ? (
                    <div className="space-y-1">
                      {restaurant.openingHours.weekday_text.map((hours: string, index: number) => (
                        <p key={index} className="text-sm">{hours}</p>
                      ))}
                    </div>
                  ) : restaurant.openingHours.periods && restaurant.openingHours.periods.length > 0 ? (
                    <div className="space-y-1">
                      {restaurant.openingHours.periods.map((period: any, index: number) => {
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const openDay = days[period.open?.day];
                        const openTime = period.open ? `${String(period.open.hour).padStart(2, '0')}:${String(period.open.minute).padStart(2, '0')}` : '';
                        const closeTime = period.close ? `${String(period.close.hour).padStart(2, '0')}:${String(period.close.minute).padStart(2, '0')}` : '';
                        return (
                          <p key={index} className="text-sm">
                            {openDay}: {openTime} - {closeTime || 'Open 24 hours'}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm">Hours information available on website</p>
                      <Button 
                        onClick={async () => {
                          const { getRestaurantWebsiteUrl } = await import('@/lib/restaurantUtils');
                          const websiteUrl = await getRestaurantWebsiteUrl(restaurant.name, displayAddress);
                          window.location.href = websiteUrl;
                        }}
                        variant="link" 
                        className="p-0 h-auto text-xs"
                      >
                        View Website for Hours
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Match Score */}
          {restaurant.confidence && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Match Score
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.round(restaurant.confidence * 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-purple-600" data-testid="text-match-score">
                  {Math.round(restaurant.confidence * 100)}% match
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your preferences and dining history
              </p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => setShowEventDialog(true)}
              className="flex-1 gradient-bg"
              size="lg"
              data-testid="button-plan-event"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Plan Dining Event
            </Button>
            
            <Button 
              onClick={async () => {
                const { getRestaurantWebsiteUrl } = await import('@/lib/restaurantUtils');
                const websiteUrl = await getRestaurantWebsiteUrl(restaurant.name, displayAddress);
                window.location.href = websiteUrl;
              }}
              variant="outline" 
              className="flex-1"
              size="lg"
              data-testid="button-visit-website"
            >
              <Globe className="w-5 h-5 mr-2" />
              Visit Website
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setLocation(backPath)}
              className="flex-1"
              size="lg"
              data-testid="button-back-to-search"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Search
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}