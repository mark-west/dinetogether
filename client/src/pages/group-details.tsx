import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Group } from "@shared/schema";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import InviteModal from "@/components/InviteModal";
import PhotoUploader from "@/components/PhotoUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function GroupDetails() {
  const { groupId } = useParams();
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [duplicateGroupName, setDuplicateGroupName] = useState('');
  
  // Check URL parameters for auto-opening invite modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const inviteParam = urlParams.get('invite');
    
    if (tabParam === 'members') {
      setActiveTab('members');
    }
    
    if (inviteParam === 'true') {
      setShowInviteModal(true);
      // Clean up URL parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

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

  // Group photo update mutation
  const updateGroupPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      return await apiRequest("PUT", `/api/groups/${groupId}/photo`, { photoUrl });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group photo updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to update group photo",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/groups/${groupId}/members/${userId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  // Rename group mutation
  const renameGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("PUT", `/api/groups/${groupId}`, { name });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group renamed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowRenameDialog(false);
      setNewGroupName('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to rename group",
        variant: "destructive",
      });
    },
  });

  // Duplicate group mutation
  const duplicateGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", `/api/groups/${groupId}/duplicate`, { name });
    },
    onSuccess: (newGroup) => {
      toast({
        title: "Success",
        description: "Group duplicated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowDuplicateDialog(false);
      setDuplicateGroupName('');
      // Navigate to the new group
      navigate(`/groups/${newGroup.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to duplicate group",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/groups/${groupId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      // Navigate back to dashboard
      navigate('/');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  const handleGroupPhotoSelect = (photoUrl: string) => {
    updateGroupPhotoMutation.mutate(photoUrl);
  };

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
                <div className="relative">
                  {(group as Group)?.photoUrl ? (
                    <img 
                      src={(group as Group).photoUrl!} 
                      alt={`${(group as Group).name} photo`}
                      className="w-24 h-24 rounded-lg object-cover"
                      data-testid="img-group-photo"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                      {(group as Group).name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Show edit button if user is admin */}
                  {(group as Group).adminId === user?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={() => setShowPhotoUploader(true)}
                      data-testid="button-edit-group-photo"
                    >
                      <i className="fas fa-camera text-xs"></i>
                    </Button>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-group-name">
                        {(group as Group)?.name}
                      </h1>
                      {(group as Group)?.description ? (
                        <p className="text-muted-foreground" data-testid="text-group-description">
                          {(group as Group).description}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          No description provided
                        </p>
                      )}
                    </div>
                    
                    {/* Admin actions */}
                    {(group as Group).adminId === user?.id && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowInviteModal(true)}
                          data-testid="button-invite-members-header"
                        >
                          <i className="fas fa-user-plus mr-1"></i>
                          Invite
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewGroupName((group as Group).name);
                            setShowRenameDialog(true);
                          }}
                          data-testid="button-rename-group"
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Rename
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDuplicateGroupName(`${(group as Group).name} (Copy)`);
                            setShowDuplicateDialog(true);
                          }}
                          data-testid="button-duplicate-group"
                        >
                          <i className="fas fa-copy mr-1"></i>
                          Duplicate
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid="button-delete-group"
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Group</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{(group as Group).name}"? This will permanently delete the group, all its events, and remove all members. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteGroupMutation.mutate()}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Group
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
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
                      <span>Created {(group as Group)?.createdAt ? format(new Date((group as Group).createdAt!), 'MMM d, yyyy') : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                {group?.adminId === user?.id && (
                  <Button 
                    onClick={() => setShowInviteModal(true)}
                    data-testid="button-invite-members"
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Invite Members
                  </Button>
                )}
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
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} data-testid={`text-member-role-${member.userId}`}>
                              {member.role}
                            </Badge>
                            {/* Show remove button for admin (but not for themselves) */}
                            {group?.adminId === user?.id && member.userId !== user?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`button-remove-member-${member.userId}`}
                                  >
                                    <i className="fas fa-user-minus"></i>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {member.user.firstName && member.user.lastName 
                                        ? `${member.user.firstName} ${member.user.lastName}`
                                        : member.user.email
                                      } from this group? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => removeMemberMutation.mutate(member.userId)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove Member
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
      
      {showInviteModal && group && (
        <InviteModal 
          groupId={group.id}
          groupName={group.name}
          onClose={() => setShowInviteModal(false)} 
        />
      )}
      
      {/* Group Photo Uploader Modal */}
      <PhotoUploader
        isOpen={showPhotoUploader}
        onClose={() => setShowPhotoUploader(false)}
        onPhotoSelect={handleGroupPhotoSelect}
        currentPhotoUrl={(group as Group)?.photoUrl || ""}
        title="Update Group Photo"
        description="Upload a photo that represents your group"
      />

      {/* Rename Group Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter new group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              data-testid="input-new-group-name"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRenameDialog(false);
                setNewGroupName('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => renameGroupMutation.mutate(newGroupName)}
              disabled={!newGroupName.trim() || renameGroupMutation.isPending}
              data-testid="button-confirm-rename"
            >
              {renameGroupMutation.isPending ? 'Renaming...' : 'Rename Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Group Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter name for duplicated group"
              value={duplicateGroupName}
              onChange={(e) => setDuplicateGroupName(e.target.value)}
              data-testid="input-duplicate-group-name"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicateGroupName('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => duplicateGroupMutation.mutate(duplicateGroupName)}
              disabled={!duplicateGroupName.trim() || duplicateGroupMutation.isPending}
              data-testid="button-confirm-duplicate"
            >
              {duplicateGroupMutation.isPending ? 'Duplicating...' : 'Duplicate Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}