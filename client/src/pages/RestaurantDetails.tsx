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
import { ArrowLeft, Calendar, Users, Star, MapPin, Clock, DollarSign, Utensils } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  description: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  website?: string;
  websiteUri?: string;
  hours?: string;
  openingHours?: any;
  rating?: number;
  estimatedRating?: number;
  reviewCount?: number;
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
      const storedData = sessionStorage.getItem(`restaurant_${restaurantId}`);
      if (storedData) {
        try {
          const restaurantData = JSON.parse(storedData);
          console.log('FULL API DATA RECEIVED:', restaurantData);
          console.log('SERVER DEBUG INFO:', restaurantData._serverDebug);
          console.log('CONTACT DATA CHECK:', {
            phone: restaurantData.phone,
            phoneNumber: restaurantData.phoneNumber, 
            website: restaurantData.website,
            websiteUri: restaurantData.websiteUri,
            hours: restaurantData.hours
          });
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
      restaurantName: restaurant?.name,
      restaurantAddress: restaurant?.address,
      dateTime: new Date(eventForm.dateTime).toISOString(),
    });
  };

  const formatGoogleOpeningHours = (openingHours: any) => {
    if (!openingHours) return '';
    
    if (typeof openingHours === 'string') {
      return openingHours;
    }
    
    if (openingHours.weekdayText || openingHours.weekday_text) {
      const weekdayText = openingHours.weekdayText || openingHours.weekday_text;
      const today = new Date().getDay();
      const googleDayIndex = today === 0 ? 6 : today - 1;
      const todaysHours = weekdayText[googleDayIndex];
      return todaysHours || 'Hours not available';
    }
    
    if (openingHours.periods) {
      const today = new Date().getDay();
      const todaysPeriod = openingHours.periods.find((p: any) => p.open?.day === today);
      if (todaysPeriod) {
        const openTime = todaysPeriod.open?.time || 'Unknown';
        const closeTime = todaysPeriod.close?.time || 'Unknown';
        return `${openTime} - ${closeTime}`;
      }
    }
    
    if (openingHours.openNow !== undefined || openingHours.open_now !== undefined) {
      const isOpen = openingHours.openNow || openingHours.open_now;
      return isOpen ? 'Currently Open' : 'Currently Closed';
    }
    
    return 'Hours not available';
  };

  const priceRangeText = {
    '$': 'Budget-friendly',
    '$$': 'Moderate',
    '$$$': 'Upscale',
    '$$$$': 'Fine dining'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <Card>
              <CardHeader>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
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
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        </div>

        {/* Restaurant Overview */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl" data-testid="text-restaurant-name">
                    {restaurant.name}
                  </CardTitle>
                  {restaurant.website && (
                    <button
                      onClick={() => window.open(restaurant.website, '_blank')}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      title="Visit Restaurant Website"
                      data-testid="button-restaurant-website"
                    >
                      <i className="fas fa-globe"></i>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                  <Badge variant="secondary" data-testid="badge-cuisine-type">
                    <Utensils className="w-3 h-3 mr-1" />
                    {restaurant.type}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-price-range">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {restaurant.priceRange} - {priceRangeText[restaurant.priceRange as keyof typeof priceRangeText]}
                  </Badge>
                  {(restaurant.rating || restaurant.estimatedRating) && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span data-testid="text-rating">
                        {restaurant.rating || restaurant.estimatedRating}
                      </span>
                      {(restaurant.reviewCount || restaurant.userRatingsTotal) && (
                        <span className="text-muted-foreground">
                          ({restaurant.reviewCount || restaurant.userRatingsTotal} reviews)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground mb-4" data-testid="text-description">
                  {restaurant.description}
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
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
          </CardHeader>
        </Card>

        {/* DEBUG: Show Raw API Data */}
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800">🔍 API Data Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Phone Fields:</strong>
                <ul className="mt-1 space-y-1">
                  <li>phoneNumber: <code className="bg-white px-1 rounded">{restaurant.phoneNumber || 'null'}</code></li>
                  <li>phone: <code className="bg-white px-1 rounded">{restaurant.phone || 'null'}</code></li>
                </ul>
              </div>
              <div>
                <strong>Website Fields:</strong>
                <ul className="mt-1 space-y-1">
                  <li>website: <code className="bg-white px-1 rounded">{restaurant.website || 'null'}</code></li>
                  <li>websiteUri: <code className="bg-white px-1 rounded">{restaurant.websiteUri || 'null'}</code></li>
                </ul>
              </div>
              <div>
                <strong>Hours Fields:</strong>
                <ul className="mt-1 space-y-1">
                  <li>openingHours: <code className="bg-white px-1 rounded">{restaurant.openingHours ? 'Object' : 'null'}</code></li>
                  <li>hours: <code className="bg-white px-1 rounded">{restaurant.hours || 'null'}</code></li>
                </ul>
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Raw JSON Data</summary>
              <pre className="mt-2 p-2 bg-white text-xs overflow-auto max-h-40 rounded">
                {JSON.stringify(restaurant, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>

        {/* Restaurant Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact & Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {restaurant.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-address">{restaurant.address}</span>
                </div>
              )}
              
              {/* Try ALL possible phone fields */}
              {(restaurant.phone || restaurant.phoneNumber) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Phone:</span>
                  <a 
                    href={`tel:${restaurant.phone || restaurant.phoneNumber}`} 
                    className="text-sm text-primary hover:underline" 
                    data-testid="link-phone"
                  >
                    {restaurant.phone || restaurant.phoneNumber}
                  </a>
                </div>
              )}
              
              {/* Try ALL possible website fields */}
              {(restaurant.website || restaurant.websiteUri) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Website:</span>
                  <a 
                    href={restaurant.website || restaurant.websiteUri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-primary hover:underline"
                    data-testid="link-website"
                  >
                    Visit Website
                  </a>
                </div>
              )}
              
              {/* Try ALL possible hours fields */}
              {(restaurant.hours || restaurant.openingHours) && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm" data-testid="text-hours">
                    {restaurant.hours || formatGoogleOpeningHours(restaurant.openingHours)}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Features & Highlights</CardTitle>
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
            </CardContent>
          </Card>
        </div>

        {/* Reviews */}
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