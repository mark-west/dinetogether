import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import CreateGroupModal from "@/components/CreateGroupModal";
import InviteModal from "@/components/InviteModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Groups() {
  const { isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<{ groupId: string; groupName: string } | null>(null);

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

  const { data: groups, isLoading: groupsLoading } = useQuery<any[]>({
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
            <h1 className="font-bold text-lg text-foreground">My Groups</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCreateModal(true)}
              data-testid="button-create-group-mobile"
            >
              <i className="fas fa-plus"></i>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">My Groups</h2>
              <p className="text-muted-foreground">Manage your restaurant groups and memberships</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="hidden md:flex"
              data-testid="button-create-group"
            >
              <i className="fas fa-plus mr-2"></i>
              Create Group
            </Button>
          </div>

          {groupsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : groups && Array.isArray(groups) && groups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group: any) => (
                <Card 
                  key={group.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => window.location.href = `/groups/${group.id}`}
                  data-testid={`card-group-${group.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg" data-testid={`text-group-name-${group.id}`}>
                            {group.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground" data-testid={`text-member-count-${group.id}`}>
                            {group.memberCount} members
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        group.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-800'
                      }`} data-testid={`text-role-${group.id}`}>
                        {group.role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {group.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-description-${group.id}`}>
                        {group.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Created {format(new Date(group.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/groups/${group.id}`}
                        data-testid={`button-view-group-${group.id}`}
                      >
                        <i className="fas fa-eye mr-2"></i>
                        View
                      </Button>
                      {group.role === 'admin' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowInviteModal({ groupId: group.id, groupName: group.name })}
                          data-testid={`button-invite-${group.id}`}
                        >
                          <i className="fas fa-user-plus mr-2"></i>
                          Invite
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-users text-3xl text-muted-foreground"></i>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No groups yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create your first group to start organizing restaurant nights with friends. 
                Groups are invite-only and perfect for close friends or colleagues.
              </p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                data-testid="button-create-first-group"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Your First Group
              </Button>
            </div>
          )}
        </div>
      </div>

      <MobileNavigation />
      
      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} />
      )}
      
      {showInviteModal && (
        <InviteModal 
          groupId={showInviteModal.groupId}
          groupName={showInviteModal.groupName}
          onClose={() => setShowInviteModal(null)} 
        />
      )}
    </div>
  );
}
