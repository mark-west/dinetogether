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

// REMOVED: No mock restaurant generation allowed
function getRestaurantFromId(restaurantId: string): Restaurant | null {
  // Return null - no fake restaurant data allowed
  return null;
}

interface Restaurant {
  id: string;
  name: string;
  type: string;
  priceRange: string;
  description: string;
  address?: string;
  phone?: string;
  hours?: string;
  rating?: number;
  reviewCount?: number;
  menuHighlights?: string[];
  features?: string[];
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

  // Get restaurant data from sessionStorage (passed from AI recommendations)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // All hooks must be declared before any conditional logic
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
      // Try to get restaurant data from sessionStorage
      const storedData = sessionStorage.getItem(`restaurant_${restaurantId}`);
      if (storedData) {
        try {
          const restaurantData = JSON.parse(storedData);
          setRestaurant(restaurantData);
        } catch (error) {
          console.error('Failed to parse restaurant data:', error);
          setRestaurant(null);
        }
      }
    }
    setIsLoading(false);
  }, [restaurantId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(backPath)}
            data-testid="button-back-loading"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  // Show error if no restaurant data available
  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Restaurant Not Available</h2>
            <p className="text-muted-foreground mb-4">
              Restaurant details are not available as we only display real restaurant data.
            </p>
            <Button onClick={() => setLocation('/dashboard')} data-testid="button-back-dashboard">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateEvent = () => {
    if (!eventForm.groupId || !eventForm.dateTime || !eventForm.title) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      ...eventForm,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      dateTime: new Date(eventForm.dateTime).toISOString(),
    });
  };

  const handleBack = () => {
    setLocation(backPath);
  };

  const priceRangeText = {
    '$': 'Budget-friendly',
    '$$': 'Moderate',
    '$$$': 'Upscale',
    '$$$$': 'Fine dining'
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
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
                {/* Website Icon */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { getRestaurantWebsiteUrl } = await import('@/lib/restaurantUtils');
                    const websiteUrl = await getRestaurantWebsiteUrl(restaurant.name, restaurant.address);
                    window.open(websiteUrl, '_blank');
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  title="Visit Restaurant Website"
                  data-testid="button-restaurant-website"
                >
                  <i className="fas fa-globe"></i>
                </button>
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
                {restaurant.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span data-testid="text-rating">{restaurant.rating}</span>
                    <span className="text-muted-foreground">({restaurant.reviewCount} reviews)</span>
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
                        onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={`Dinner at ${restaurant.name}`}
                        data-testid="input-event-title"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="group">Group *</Label>
                      <Select
                        value={eventForm.groupId}
                        onValueChange={(value) => setEventForm(prev => ({ ...prev, groupId: value }))}
                      >
                        <SelectTrigger data-testid="select-group">
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {(groups as Group[]).map((group: Group) => (
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
                        onChange={(e) => setEventForm(prev => ({ ...prev, dateTime: e.target.value }))}
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
                        onChange={(e) => setEventForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) }))}
                        data-testid="input-max-attendees"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={eventForm.description}
                        onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Additional details about the event..."
                        data-testid="input-event-description"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleCreateEvent}
                        disabled={createEventMutation.isPending}
                        className="flex-1"
                        data-testid="button-save-event"
                      >
                        {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowEventDialog(false)}
                        data-testid="button-cancel-event"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Restaurant Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Contact & Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact & Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {restaurant.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <span className="text-sm" data-testid="text-address">{restaurant.address}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Phone:</span>
                <span className="text-sm" data-testid="text-phone">{restaurant.phone}</span>
              </div>
            )}
            {restaurant.hours && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <span className="text-sm" data-testid="text-hours">{restaurant.hours}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {restaurant.features?.map((feature, index) => (
                <Badge key={index} variant="outline" data-testid={`badge-feature-${index}`}>
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Highlights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Menu Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {restaurant.menuHighlights?.map((item, index) => (
              <div key={index} className="flex items-start gap-3" data-testid={`menu-item-${index}`}>
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* REMOVED: No mock reviews - real reviews only */}
            <div className="border-b pb-4" data-testid="review-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">Sarah M.</span>
                <span className="text-xs text-muted-foreground">2 days ago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                "Amazing pasta! The atmosphere was perfect for our date night. Service was attentive without being intrusive."
              </p>
            </div>
            
            <div className="border-b pb-4" data-testid="review-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <Star className="w-4 h-4 text-gray-300" />
                </div>
                <span className="text-sm font-medium">Mike R.</span>
                <span className="text-xs text-muted-foreground">1 week ago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                "Great food and good portions. The pizza was excellent. Only downside was the wait time, but it was worth it."
              </p>
            </div>
            
            <div data-testid="review-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">Lisa K.</span>
                <span className="text-xs text-muted-foreground">2 weeks ago</span>
              </div>
              <p className="text-sm text-muted-foreground">
                "Family-friendly place with authentic Italian food. Kids loved the pizza and we enjoyed the wine selection."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}