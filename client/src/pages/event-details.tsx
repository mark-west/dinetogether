import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format, isToday, isTomorrow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import CalendarActions from "@/components/CalendarActions";
import DirectionsButton from "@/components/DirectionsButton";
import EditEventModal from "@/components/EditEventModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function EventDetails() {
  const { eventId } = useParams();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [rsvpStatus, setRsvpStatus] = useState<string>('pending');
  const [newSuggestion, setNewSuggestion] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["/api/events", eventId],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });

  const { data: rsvps, isLoading: rsvpsLoading } = useQuery({
    queryKey: ["/api/events", eventId, "rsvps"],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/events", eventId, "suggestions"],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/events", eventId, "messages"],
    retry: false,
    enabled: isAuthenticated && !!eventId,
    refetchInterval: 5000,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("POST", `/api/events/${eventId}/rsvp`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "RSVP updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "rsvps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update RSVP",
        variant: "destructive",
      });
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: async (suggestionText: string) => {
      await apiRequest("POST", `/api/events/${eventId}/suggestions`, {
        restaurantName: suggestionText,
        notes: "",
      });
    },
    onSuccess: () => {
      setNewSuggestion('');
      toast({
        title: "Success",
        description: "Restaurant suggestion added!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "suggestions"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add suggestion",
        variant: "destructive",
      });
    },
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'maybe': return 'bg-yellow-500';
      case 'declined': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Going';
      case 'maybe': return 'Maybe';
      case 'declined': return 'Declined';
      default: return 'Pending';
    }
  };

  // Find current user's RSVP
  useEffect(() => {
    if (rsvps && user) {
      const userRsvp = rsvps.find((rsvp: any) => rsvp.userId === user.id);
      setRsvpStatus(userRsvp?.status || 'pending');
    }
  }, [rsvps, user]);

  const handleAddSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestion.trim()) return;
    suggestionMutation.mutate(newSuggestion.trim());
  };

  if (isLoading || eventLoading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
          <div className="md:hidden bg-card border-b border-border p-4">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex-1 p-4 md:p-6 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Event not found</h2>
              <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => window.location.href = '/events'}>
                Back to Events
              </Button>
            </div>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  const mapMarkers = [];
  if (event.restaurantLat && event.restaurantLng) {
    mapMarkers.push({
      position: { 
        lat: parseFloat(event.restaurantLat), 
        lng: parseFloat(event.restaurantLng) 
      },
      title: event.restaurantName || event.name,
      info: `<div><strong>${event.restaurantName || event.name}</strong><br/>${event.restaurantAddress || ''}</div>`
    });
  }

  return (
    <div className="app-container">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              <i className="fas fa-arrow-left"></i>
            </Button>
            <h1 className="font-bold text-lg text-foreground">Event Details</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Event Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                {event.restaurantImageUrl ? (
                  <img 
                    src={event.restaurantImageUrl} 
                    alt={event.restaurantName} 
                    className="w-24 h-24 rounded-lg object-cover"
                    data-testid="img-event-restaurant"
                  />
                ) : (
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    <i className="fas fa-utensils text-2xl text-muted-foreground"></i>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-event-name">
                        {event.name}
                      </h1>
                      {event.restaurantName && (
                        <p className="text-lg text-muted-foreground mb-1" data-testid="text-restaurant-name">
                          {event.restaurantName}
                        </p>
                      )}
                      {event.restaurantAddress && (
                        <p className="text-sm text-muted-foreground" data-testid="text-restaurant-address">
                          <i className="fas fa-map-marker-alt mr-2"></i>
                          {event.restaurantAddress}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(rsvpStatus)}`}></div>
                      <Badge variant="secondary" data-testid="status-current">
                        {getStatusText(rsvpStatus)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-calendar"></i>
                      <span data-testid="text-event-date">{formatEventDate(event.dateTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-users"></i>
                      <span data-testid="text-attendee-count">
                        {rsvps?.filter((r: any) => r.status === 'confirmed').length || 0} attending
                      </span>
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-4" data-testid="text-event-description">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    <CalendarActions event={event} />
                    {event.restaurantAddress && (
                      <DirectionsButton 
                        address={event.restaurantAddress}
                        restaurantName={event.restaurantName}
                        lat={event.restaurantLat}
                        lng={event.restaurantLng}
                      />
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/chat/${eventId}`}
                      data-testid="button-chat"
                    >
                      <i className="fas fa-comments mr-2"></i>
                      Chat
                    </Button>
                    {user && event.createdBy === user.id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowEditModal(true)}
                        data-testid="button-edit-event"
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit Event
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {(event.restaurantName || event.restaurantAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-map-marker-alt"></i>
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Map Display - show map if API works, fallback if not */}
                {mapMarkers.length > 0 ? (
                  <GoogleMapComponent
                    center={mapMarkers[0].position}
                    markers={mapMarkers}
                    zoom={15}
                    className="w-full h-64 rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center p-6">
                      <i className="fas fa-map-marker-alt text-3xl text-muted-foreground mb-3"></i>
                      <p className="text-sm text-muted-foreground">Map unavailable</p>
                      <p className="text-xs text-muted-foreground mt-1">Location details below</p>
                    </div>
                  </div>
                )}
                
                {/* Restaurant Info */}
                {(event.restaurantName || event.restaurantAddress) && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      {event.restaurantName && (
                        <p className="font-medium" data-testid="text-restaurant-name">{event.restaurantName}</p>
                      )}
                      {event.restaurantAddress && (
                        <p className="text-sm text-muted-foreground" data-testid="text-restaurant-address">{event.restaurantAddress}</p>
                      )}
                    </div>
                    {event.restaurantAddress && (
                      <DirectionsButton 
                        address={event.restaurantAddress}
                        restaurantName={event.restaurantName}
                        lat={event.restaurantLat}
                        lng={event.restaurantLng}
                        size="sm"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* RSVP Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-reply"></i>
                Your RSVP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {['confirmed', 'maybe', 'declined'].map((status) => (
                  <Button
                    key={status}
                    variant={rsvpStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setRsvpStatus(status);
                      rsvpMutation.mutate(status);
                    }}
                    disabled={rsvpMutation.isPending}
                    data-testid={`button-rsvp-${status}`}
                  >
                    <i className={`fas fa-${status === 'confirmed' ? 'check' : status === 'maybe' ? 'question' : 'times'} mr-2`}></i>
                    {getStatusText(status)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Attendees and Suggestions */}
          <Tabs defaultValue="attendees" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendees" data-testid="tab-attendees">
                Attendees ({rsvps?.filter((r: any) => r.status === 'confirmed').length || 0})
              </TabsTrigger>
              <TabsTrigger value="suggestions" data-testid="tab-suggestions">
                Restaurant Suggestions ({suggestions?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendees" className="space-y-4">
              {rsvpsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : rsvps && rsvps.length > 0 ? (
                <div className="space-y-3">
                  {rsvps.map((rsvp: any) => (
                    <Card key={rsvp.id} data-testid={`rsvp-${rsvp.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {rsvp.user.profileImageUrl ? (
                            <img 
                              src={rsvp.user.profileImageUrl} 
                              alt={`${rsvp.user.firstName} ${rsvp.user.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                              data-testid={`img-rsvp-avatar-${rsvp.id}`}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                              {(rsvp.user.firstName?.[0] || rsvp.user.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`text-rsvp-name-${rsvp.id}`}>
                              {rsvp.user.firstName && rsvp.user.lastName 
                                ? `${rsvp.user.firstName} ${rsvp.user.lastName}`
                                : rsvp.user.email
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Responded {format(new Date(rsvp.respondedAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(rsvp.status)}`}></div>
                            <span className="text-sm font-medium" data-testid={`text-rsvp-status-${rsvp.id}`}>
                              {getStatusText(rsvp.status)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-users text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No RSVPs yet</h3>
                  <p className="text-sm text-muted-foreground">Be the first to respond to this event!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="suggestions" className="space-y-4">
              {/* Add suggestion form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suggest a Restaurant</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSuggestion} className="space-y-4">
                    <Textarea
                      value={newSuggestion}
                      onChange={(e) => setNewSuggestion(e.target.value)}
                      placeholder="Suggest a restaurant name, address, or any details..."
                      rows={3}
                      data-testid="input-new-suggestion"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newSuggestion.trim() || suggestionMutation.isPending}
                      data-testid="button-add-suggestion"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      {suggestionMutation.isPending ? "Adding..." : "Add Suggestion"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Existing suggestions */}
              {suggestionsLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion: any) => (
                    <Card key={suggestion.id} data-testid={`suggestion-${suggestion.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {suggestion.user.profileImageUrl ? (
                            <img 
                              src={suggestion.user.profileImageUrl} 
                              alt={`${suggestion.user.firstName} ${suggestion.user.lastName}`}
                              className="w-8 h-8 rounded-full object-cover"
                              data-testid={`img-suggestion-avatar-${suggestion.id}`}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {(suggestion.user.firstName?.[0] || suggestion.user.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm" data-testid={`text-suggestion-restaurant-${suggestion.id}`}>
                                  {suggestion.restaurantName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  by {suggestion.user.firstName && suggestion.user.lastName 
                                    ? `${suggestion.user.firstName} ${suggestion.user.lastName}`
                                    : suggestion.user.email
                                  }
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <i className="fas fa-thumbs-up"></i>
                                <span data-testid={`text-suggestion-votes-${suggestion.id}`}>
                                  {suggestion.votes || 0}
                                </span>
                              </div>
                            </div>
                            
                            {suggestion.restaurantAddress && (
                              <p className="text-sm text-muted-foreground mb-2" data-testid={`text-suggestion-address-${suggestion.id}`}>
                                <i className="fas fa-map-marker-alt mr-1"></i>
                                {suggestion.restaurantAddress}
                              </p>
                            )}
                            
                            {suggestion.notes && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-suggestion-notes-${suggestion.id}`}>
                                {suggestion.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-lightbulb text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No suggestions yet</h3>
                  <p className="text-sm text-muted-foreground">Help the group decide by suggesting restaurants!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNavigation />
      
      {/* Edit Event Modal */}
      {event && (
        <EditEventModal
          event={event}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}