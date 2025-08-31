import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GroupDetails() {
  const { groupId } = useParams();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["/api/groups", groupId],
    retry: false,
    enabled: isAuthenticated && !!groupId,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "members"],
    retry: false,
    enabled: isAuthenticated && !!groupId,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "events"],
    retry: false,
    enabled: isAuthenticated && !!groupId,
  });

  if (isLoading || groupLoading) {
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

  if (!group) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Group not found</h2>
              <p className="text-muted-foreground mb-4">The group you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={() => window.location.href = '/groups'}>
                Back to Groups
              </Button>
            </div>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  const formatEventDate = (dateTime: string | Date) => {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  };

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
            <h1 className="font-bold text-lg text-foreground">Group Details</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Group Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-group-name">
                        {group?.name}
                      </h1>
                      {group?.description && (
                        <p className="text-muted-foreground" data-testid="text-group-description">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-users"></i>
                      <span data-testid="text-member-count">
                        {Array.isArray(members) ? members.length : 0} members
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-calendar"></i>
                      <span>Created {group?.createdAt ? format(new Date(group.createdAt), 'MMM d, yyyy') : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs defaultValue="events" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            
            <TabsContent value="events" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Group Events</h2>
                <Button 
                  onClick={() => window.location.href = '/events'}
                  data-testid="button-create-event"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create Event
                </Button>
              </div>
              
              {eventsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : Array.isArray(events) && events.length > 0 ? (
                <div className="space-y-4">
                  {events?.map((event: any) => (
                    <Card 
                      key={event.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => window.location.href = `/events/${event.id}`}
                      data-testid={`card-event-${event.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {event.restaurantImageUrl ? (
                            <img 
                              src={event.restaurantImageUrl} 
                              alt={event.restaurantName} 
                              className="w-16 h-16 rounded-lg object-cover"
                              data-testid={`img-event-${event.id}`}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                              <i className="fas fa-utensils text-xl text-muted-foreground"></i>
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2" data-testid={`text-event-name-${event.id}`}>
                              {event.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-restaurant-${event.id}`}>
                              {event.restaurantName || 'Restaurant TBD'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <i className="fas fa-calendar"></i>
                                <span data-testid={`text-date-${event.id}`}>{formatEventDate(event.dateTime)}</span>
                              </div>
                              {event.restaurantAddress && (
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-map-marker-alt"></i>
                                  <span data-testid={`text-location-${event.id}`}>{event.restaurantAddress}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-calendar text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No events yet</h3>
                  <p className="text-sm text-muted-foreground">Create the first event for this group!</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="members" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Group Members</h2>
              </div>
              
              {membersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : Array.isArray(members) && members.length > 0 ? (
                <div className="space-y-4">
                  {members?.map((member: any) => (
                    <Card key={member.userId} data-testid={`card-member-${member.userId}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {member.user.profileImageUrl ? (
                            <img 
                              src={member.user.profileImageUrl} 
                              alt="Profile" 
                              className="w-12 h-12 rounded-full object-cover"
                              data-testid={`img-member-${member.userId}`}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                              <i className="fas fa-user text-muted-foreground"></i>
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h3 className="font-medium" data-testid={`text-member-name-${member.userId}`}>
                              {member.user.firstName && member.user.lastName 
                                ? `${member.user.firstName} ${member.user.lastName}`
                                : member.user.email
                              }
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {member.user.email}
                            </p>
                          </div>
                          
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} data-testid={`text-member-role-${member.userId}`}>
                            {member.role}
                          </Badge>
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
                  <h3 className="font-medium text-foreground mb-2">No members</h3>
                  <p className="text-sm text-muted-foreground">This group is empty.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
}