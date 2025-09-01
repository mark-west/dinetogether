import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileNavigation from "@/components/MobileNavigation";

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch all users with pagination
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users', { search: searchQuery }],
    queryFn: () => apiRequest(`/api/admin/users${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`),
  });

  // Fetch all groups
  const { data: allGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/admin/groups'],
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User account has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => apiRequest(`/api/admin/groups/${groupId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: "Group deleted",
        description: "Group has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  // Add admin note mutation
  const addNoteMutation = useMutation({
    mutationFn: (data: { userId: string; note: string }) => 
      apiRequest(`/api/admin/users/${data.userId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: data.note }),
      }),
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "Admin note has been saved.",
      });
      setAdminNote("");
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 pb-20 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, groups, and resolve issues</p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-users text-blue-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-layer-group text-green-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Total Groups</p>
                  <p className="text-2xl font-bold">{stats?.totalGroups || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-calendar text-purple-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{stats?.totalEvents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-star text-orange-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Active Today</p>
                  <p className="text-2xl font-bold">{stats?.activeToday || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="groups">Group Management</TabsTrigger>
            <TabsTrigger value="issues">Issue Resolution</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <div className="flex gap-4">
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                    data-testid="input-search-users"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            {user.profileImageUrl ? (
                              <img 
                                src={user.profileImageUrl} 
                                alt={user.firstName || user.email} 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <i className="fas fa-user text-muted-foreground"></i>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.email
                              }
                            </h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {user.groupCount || 0} groups
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {user.eventCount || 0} events
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                                data-testid={`button-user-details-${user.id}`}
                              >
                                <i className="fas fa-eye mr-2"></i>
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Name</Label>
                                      <p className="text-sm">
                                        {selectedUser.firstName && selectedUser.lastName 
                                          ? `${selectedUser.firstName} ${selectedUser.lastName}`
                                          : 'Not set'
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Email</Label>
                                      <p className="text-sm">{selectedUser.email}</p>
                                    </div>
                                    <div>
                                      <Label>Joined</Label>
                                      <p className="text-sm">
                                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Last Active</Label>
                                      <p className="text-sm">
                                        {selectedUser.updatedAt 
                                          ? new Date(selectedUser.updatedAt).toLocaleDateString()
                                          : 'Unknown'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Add Admin Note</Label>
                                    <Textarea
                                      value={adminNote}
                                      onChange={(e) => setAdminNote(e.target.value)}
                                      placeholder="Add a note about this user..."
                                      className="mt-2"
                                      data-testid="input-admin-note"
                                    />
                                    <Button 
                                      onClick={() => addNoteMutation.mutate({
                                        userId: selectedUser.id,
                                        note: adminNote
                                      })}
                                      disabled={!adminNote.trim() || addNoteMutation.isPending}
                                      className="mt-2"
                                      data-testid="button-add-note"
                                    >
                                      {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                                    </Button>
                                  </div>
                                  
                                  {selectedUser.adminNotes && selectedUser.adminNotes.length > 0 && (
                                    <div>
                                      <Label>Admin Notes</Label>
                                      <div className="mt-2 space-y-2">
                                        {selectedUser.adminNotes.map((note: any, index: number) => (
                                          <div key={index} className="p-3 bg-muted rounded">
                                            <p className="text-sm">{note.content}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {new Date(note.createdAt).toLocaleDateString()}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.email
                                  }'s account? This will remove all their data, groups, and events. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid="button-confirm-delete-user"
                                >
                                  Delete Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-users text-2xl text-muted-foreground"></i>
                    </div>
                    <h3 className="font-medium">No users found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Group Management</CardTitle>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-muted rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : allGroups && allGroups.length > 0 ? (
                  <div className="space-y-4">
                    {allGroups.map((group: any) => (
                      <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            {group.photoUrl ? (
                              <img 
                                src={group.photoUrl} 
                                alt={group.name} 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <i className="fas fa-layer-group text-muted-foreground"></i>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Admin: {group.adminUser?.firstName && group.adminUser?.lastName 
                                ? `${group.adminUser.firstName} ${group.adminUser.lastName}`
                                : group.adminUser?.email
                              }
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {group.memberCount || 0} members
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {group.eventCount || 0} events
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/groups/${group.id}`}
                            data-testid={`button-view-group-${group.id}`}
                          >
                            <i className="fas fa-external-link-alt mr-2"></i>
                            View Group
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Group</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete "{group.name}"? This will remove all events, members, and data associated with this group. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteGroupMutation.mutate(group.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid="button-confirm-delete-group"
                                >
                                  Delete Group
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-layer-group text-2xl text-muted-foreground"></i>
                    </div>
                    <h3 className="font-medium">No groups found</h3>
                    <p className="text-sm text-muted-foreground">No groups have been created yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Issue Resolution Tools</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Common tools for resolving user issues and managing accounts
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">
                      <i className="fas fa-user-check mr-2 text-green-600"></i>
                      Account Recovery
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Help users who lost access to their accounts
                    </p>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-search mr-2"></i>
                      Search by Email
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">
                      <i className="fas fa-users-cog mr-2 text-blue-600"></i>
                      Group Issues
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Resolve group membership and permission problems
                    </p>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-tools mr-2"></i>
                      Group Tools
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">
                      <i className="fas fa-calendar-times mr-2 text-orange-600"></i>
                      Event Problems
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fix event scheduling and notification issues
                    </p>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-calendar-check mr-2"></i>
                      Event Tools
                    </Button>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">
                      <i className="fas fa-ban mr-2 text-red-600"></i>
                      Account Moderation
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Suspend or restrict problematic accounts
                    </p>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-shield-alt mr-2"></i>
                      Moderation Tools
                    </Button>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MobileNavigation />
    </div>
  );
}