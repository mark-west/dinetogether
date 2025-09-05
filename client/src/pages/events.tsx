import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useBatchRatings } from "@/hooks/useBatchRatings";
import CreateEventModal from "@/components/CreateEventModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/ui/event-card";
import { PlusIcon, CalendarIcon } from "@/components/ui/app-icons";
import { NaturalLanguageSearch } from "@/components/NaturalLanguageSearch";

// Star Rating Component
function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starSize = size === "md" ? "text-base" : "text-sm";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`fas fa-star ${starSize} ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// Past Event Card with Rating
function PastEventCard({ event, averageRating }: { event: any; averageRating?: any }) {
  const [, navigate] = useLocation();

  return (
    <Card 
      className="opacity-75 hover:shadow-md transition-shadow cursor-pointer" 
      onClick={() => navigate(`/events/${event.id}`)}
      data-testid={`card-past-event-${event.id}`}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {event.restaurantImageUrl ? (
            <img 
              src={event.restaurantImageUrl} 
              alt={event.restaurantName} 
              className="w-full sm:w-20 h-48 sm:h-20 rounded-lg object-cover"
              data-testid={`img-past-restaurant-${event.id}`}
            />
          ) : (
            <div className="w-full sm:w-20 h-48 sm:h-20 bg-muted rounded-lg flex items-center justify-center">
              <i className="fas fa-utensils text-muted-foreground text-xl"></i>
            </div>
          )}
          
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate" data-testid={`text-past-event-name-${event.id}`}>
                  {event.name}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid={`text-past-restaurant-${event.id}`}>
                  {event.restaurantName || 'Restaurant TBD'}
                </p>
                <p className="text-sm text-muted-foreground" data-testid={`text-past-group-${event.id}`}>
                  {event.group.name}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                {averageRating?.averageRating > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={averageRating.averageRating} size="md" />
                    <span className="text-sm font-medium text-foreground">
                      {averageRating.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({averageRating.totalRatings})
                    </span>
                  </div>
                )}
                <Badge variant="outline" className="shrink-0" data-testid={`status-past-${event.id}`}>
                  Completed
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <i className="fas fa-calendar"></i>
                <span data-testid={`text-past-date-${event.id}`}>
                  {format(new Date(event.dateTime), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Events() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/groups"],
    retry: false,
    enabled: isAuthenticated,
  });


  const upcomingEvents = Array.isArray(events) ? events.filter((event: any) => !isPast(new Date(event.dateTime))) : [];
  const pastEvents = Array.isArray(events) ? events.filter((event: any) => isPast(new Date(event.dateTime))) : [];

  if (isLoading) {
    return (
      <>
        <div className="md:hidden bg-card border-b border-border p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
        {/* Mobile Header */}
        <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg text-foreground">Events</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCreateModal(true)}
              data-testid="button-create-event-mobile"
            >
              <PlusIcon />
            </Button>
          </div>
        </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Events</h2>
              <p className="text-muted-foreground">Your restaurant events and dining plans</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="hidden md:flex"
              data-testid="button-create-event"
            >
              <PlusIcon className="mr-2" />
              Create Event
            </Button>
          </div>

          {/* AI Dining Concierge */}
          <NaturalLanguageSearch collapsed={true} />

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming" data-testid="tab-upcoming">
                Upcoming ({upcomingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="past" data-testid="tab-past">
                Past ({pastEvents.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="space-y-4">
              {eventsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event: any) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant="detailed"
                      showActions={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-calendar text-3xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No upcoming events</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    Create your first event to start planning restaurant nights with your groups.
                  </p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    data-testid="button-create-first-event"
                  >
                    <PlusIcon className="mr-2" />
                    Create Your First Event
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past" className="space-y-4">
              {eventsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : pastEvents.length > 0 ? (
                <div className="space-y-4">
                  {pastEvents.map((event: any) => (
                    <PastEventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-history text-3xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No past events</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Your completed events will appear here once you start attending restaurant nights.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
      </div>
      
      {showCreateModal && (
        <CreateEventModal 
          onClose={() => setShowCreateModal(false)}
          groups={Array.isArray(groups) ? groups : []}
        />
      )}
    </>
  );
}
