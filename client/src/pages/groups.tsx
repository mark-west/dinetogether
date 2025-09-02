import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import CreateGroupModal from "@/components/CreateGroupModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupCard } from "@/components/ui/group-card";
import { PlusIcon, UsersIcon } from "@/components/ui/app-icons";
import { InteractiveAISuggestions } from "@/components/InteractiveAISuggestions";

export default function Groups() {
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

  const { data: groups, isLoading: groupsLoading } = useQuery<any[]>({
    queryKey: ["/api/groups"],
    retry: false,
    enabled: isAuthenticated,
  });

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
            <h1 className="font-bold text-lg text-foreground">My Groups</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCreateModal(true)}
              data-testid="button-create-group-mobile"
            >
              <PlusIcon />
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
              <PlusIcon className="mr-2" />
              Create Group
            </Button>
          </div>

          {/* AI Restaurant Suggestions for Groups */}
          {groups && groups.length > 0 && (
            <InteractiveAISuggestions
              title="Find Restaurants for Your Groups"
              subtitle="Get personalized recommendations based on all your group members' preferences and history"
              variant="group"
              groupId={groups[0]?.id}
              groups={groups}
            />
          )}

          {groupsLoading ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-44 sm:h-48" />
              ))}
            </div>
          ) : groups && Array.isArray(groups) && groups.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groups.map((group: any) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  variant="detailed"
                  showActions={true}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                <UsersIcon className="text-3xl text-muted-foreground" />
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
                <PlusIcon className="mr-2" />
                Create Your First Group
              </Button>
            </div>
          )}
      </div>
      
      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
