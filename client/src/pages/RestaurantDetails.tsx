import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Calendar, Users, Star, MapPin, Clock, Phone, Globe, DollarSign, Utensils } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  description: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  openingHours?: any;
  rating?: number;
  userRatingsTotal?: number;
  menuHighlights?: string[];
  features?: string[];
  reviews?: any[];
  businessStatus?: string;
  placeId?: string;
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

  // Fetch user groups for event creation
  const { data: groups = [] } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!user
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest('POST', '/api/events', eventData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Created",
        description: "Your dining event has been created successfully!",
      });
      setShowEventDialog(false);
      setEventForm({
        title: '',
        description: '',
        groupId: '',
        dateTime: '',
        maxAttendees: 4
      });
      setLocation('/events');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (restaurantId) {
      // Get restaurant data from sessionStorage
      const storedData = sessionStorage.getItem(`restaurant_${restaurantId}`);
      if (storedData) {
        try {
          const restaurantData = JSON.parse(storedData);
          console.log('Restaurant data:', restaurantData);
          setRestaurant(restaurantData);
        } catch (error) {
          console.error('Error parsing restaurant data:', error);
        }
      }
      setIsLoading(false);
    }
  }, [restaurantId]);

  const handleBack = () => {
    setLocation(backPath);
  };

  const handleCreateEvent = () => {
    if (!eventForm.title || !eventForm.groupId || !eventForm.dateTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      ...eventForm,
      restaurantName: restaurant?.name || '',
      restaurantAddress: restaurant?.address || '',
      dateTime: new Date(eventForm.dateTime).toISOString(),
    });
  };

  const formatHours = (openingHours: any) => {
    if (!openingHours) return 'Hours not available';
    
    if (typeof openingHours === 'string') {
      return openingHours;
    }
    
    // Handle weekday_text format
    if (openingHours.weekday_text) {
      const today = new Date().getDay();
      const googleDay = today === 0 ? 6 : today - 1; // Convert to Google's format
      return openingHours.weekday_text[googleDay] || 'Hours not available';
    }
    
    return 'Hours not available';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Button onClick={handleBack} variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Restaurant not found</h2>
            <p className="text-muted-foreground">Unable to load restaurant details.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Back Button */}
        <Button 
          onClick={handleBack} 
          variant="ghost" 
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>

        {/* Restaurant Header Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2" data-testid="text-restaurant-name">
                  {restaurant.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <Utensils className="w-3 h-3 mr-1" />
                    {restaurant.type}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {restaurant.priceRange}
                  </Badge>
                  {restaurant.rating && (
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-md">
                      <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                      <span className="font-medium">{restaurant.rating}</span>
                      {restaurant.userRatingsTotal && (
                        <span className="text-white/80">({restaurant.userRatingsTotal})</span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-white/90 text-lg" data-testid="text-description">
                  {restaurant.description}
                </p>
              </div>
              <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-white text-blue-600 hover:bg-white/90"
                    data-testid="button-create-event"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Dining Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Event Title *</Label>
                      <Input
                        id="title"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                        placeholder="Dinner at..."
                        data-testid="input-event-title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                        placeholder="Optional event description"
                        data-testid="textarea-event-description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="groupId">Select Group *</Label>
                      <Select value={eventForm.groupId} onValueChange={(value) => setEventForm({...eventForm, groupId: value})}>
                        <SelectTrigger data-testid="select-group">
                          <SelectValue placeholder="Choose a group" />
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
                    <div>
                      <Label htmlFor="dateTime">Date & Time *</Label>
                      <Input
                        id="dateTime"
                        type="datetime-local"
                        value={eventForm.dateTime}
                        onChange={(e) => setEventForm({...eventForm, dateTime: e.target.value})}
                        data-testid="input-event-datetime"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxAttendees">Max Attendees</Label>
                      <Input
                        id="maxAttendees"
                        type="number"
                        min="2"
                        max="20"
                        value={eventForm.maxAttendees}
                        onChange={(e) => setEventForm({...eventForm, maxAttendees: parseInt(e.target.value)})}
                        data-testid="input-max-attendees"
                      />
                    </div>
                    <Button 
                      onClick={handleCreateEvent} 
                      className="w-full" 
                      disabled={createEventMutation.isPending}
                      data-testid="button-submit-event"
                    >
                      {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {/* Contact Information Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Contact & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {restaurant.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm" data-testid="text-address">{restaurant.address}</span>
                </div>
              )}
              
              {restaurant.phoneNumber && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Phone className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <a 
                    href={`tel:${restaurant.phoneNumber}`} 
                    className="text-sm text-blue-600 hover:underline font-medium"
                    data-testid="link-phone"
                  >
                    {restaurant.phoneNumber}
                  </a>
                </div>
              )}
              
              {restaurant.website && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Globe className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <a 
                    href={restaurant.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-600 hover:underline font-medium"
                    data-testid="link-website"
                  >
                    Visit Website
                  </a>
                </div>
              )}
              
              {restaurant.openingHours && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm" data-testid="text-hours">
                    {formatHours(restaurant.openingHours)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restaurant Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Details & Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {restaurant.features && restaurant.features.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {restaurant.menuHighlights && restaurant.menuHighlights.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Menu Highlights</h4>
                  <div className="flex flex-wrap gap-2">
                    {restaurant.menuHighlights.map((item, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {restaurant.businessStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge 
                    variant={restaurant.businessStatus === 'OPERATIONAL' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {restaurant.businessStatus === 'OPERATIONAL' ? 'Open' : restaurant.businessStatus}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        {restaurant.reviews && restaurant.reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {restaurant.reviews.slice(0, 3).map((review: any, index: number) => (
                  <div key={index} className="border-l-2 border-blue-200 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{review.author_name}</span>
                      <span className="text-xs text-muted-foreground">{review.relative_time_description}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}