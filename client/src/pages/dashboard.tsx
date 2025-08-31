import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import CreateEventModal from "@/components/CreateEventModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/ui/event-card";
import { GroupCard } from "@/components/ui/group-card";
import { CheckCircleIcon, StarIcon, CalendarIcon, UsersIcon, PlusIcon } from "@/components/ui/app-icons";
import logoImage from "@assets/fulllogo_1756644214427.jpg";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showEventModal, setShowEventModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events/upcoming"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/groups"],
    retry: false,
    enabled: isAuthenticated,
  });


  if (isLoading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
          <div className="md:hidden bg-card border-b border-border p-4">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex-1 p-4 md:p-6 space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="Dine Together" 
                className="w-10 h-10 rounded-lg object-cover"
                data-testid="img-logo"
              />
              <h1 className="font-semibold text-xl text-gradient">Dine Together</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt"></i>
              </Button>
              {user?.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="User avatar" 
                  className="w-8 h-8 rounded-full object-cover"
                  data-testid="img-avatar"
                />
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Dashboard Header */}
          <div className="space-y-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground" data-testid="text-welcome">
                Welcome back{(user as any)?.firstName ? `, ${(user as any).firstName}` : ''}!
              </h2>
              <p className="text-muted-foreground">Here's what's happening with your restaurant groups</p>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersIcon className="text-primary" size="sm" />
                    <span className="text-sm font-medium text-muted-foreground">Groups</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-group-count">
                      {(stats as any)?.groupCount || 0}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="text-secondary" size="sm" />
                    <span className="text-sm font-medium text-muted-foreground">Events</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-event-count">
                      {(stats as any)?.eventCount || 0}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircleIcon className="text-green-500" size="sm" />
                    <span className="text-sm font-medium text-muted-foreground">Attended</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-attended-count">
                      {(stats as any)?.attendedCount || 0}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StarIcon className="text-yellow-500" size="sm" />
                    <span className="text-sm font-medium text-muted-foreground">Rating</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid="text-rating">
                      {(stats as any)?.averageRating?.toFixed(1) || '0.0'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">Upcoming Events</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/events'}
                data-testid="button-view-all-events"
              >
                View All
              </Button>
            </div>
            
            {eventsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : upcomingEvents && Array.isArray(upcomingEvents) && upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {(upcomingEvents as any[]).map((event: any) => (
                  <EventCard 
                    key={event.id}
                    event={event}
                    variant="summary"
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">No upcoming events</h4>
                  <p className="text-sm text-muted-foreground mb-4">Create your first event to get started</p>
                  <Button onClick={() => setShowEventModal(true)} data-testid="button-create-first-event">
                    Create Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* My Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">My Groups</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.location.href = '/groups'}
                data-testid="button-manage-groups"
              >
                Manage All
              </Button>
            </div>
            
            {groupsLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : groups && Array.isArray(groups) && groups.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {(groups as any[]).slice(0, 4).map((group: any) => (
                  <GroupCard 
                    key={group.id}
                    group={group}
                    variant="summary"
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <UsersIcon className="text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">No groups yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">Create your first group to start organizing dinners</p>
                  <Button onClick={() => setShowGroupModal(true)} data-testid="button-create-first-group">
                    Create Group
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        className="fab w-14 h-14 gradient-bg rounded-full shadow-lg hover:shadow-xl transition-shadow"
        onClick={() => setShowEventModal(true)}
        data-testid="button-fab"
      >
        <PlusIcon size="lg" />
      </Button>

      <MobileNavigation />
      
      {showEventModal && (
        <CreateEventModal 
          onClose={() => setShowEventModal(false)}
          groups={(groups as any[]) || []}
        />
      )}
      
      {showGroupModal && (
        <CreateGroupModal onClose={() => setShowGroupModal(false)} />
      )}
    </div>
  );
}
