import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvitePage() {
  const params = useParams();
  const { toast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  // Get invite code from URL params
  const inviteCode = params.inviteCode;

  const { data: inviteData, isLoading: inviteLoading, error } = useQuery<{invite: any; group: any}>({
    queryKey: [`/api/invites/${inviteCode}`],
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!inviteCode && !hasError,
    throwOnError: false,
    gcTime: 0, // Don't cache failed queries
  });

  // Only load auth AFTER we have valid invite data
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!inviteData && !hasError,
    throwOnError: false,
    gcTime: 0,
  });

  const isAuthenticated = !!user;
  const isLoading = authLoading;

  // Set error state when there's an error to prevent further requests
  useEffect(() => {
    if (error) {
      setHasError(true);
    }
  }, [error]);

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/invites/${inviteCode}/accept`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've joined the group successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setTimeout(() => {
        window.location.href = "/groups";
      }, 1500);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to accept this invite",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      const errorMessage = (error as Error).message;
      toast({
        title: "Error",
        description: errorMessage.includes("already a member") 
          ? "You're already a member of this group!"
          : "Failed to accept invite",
        variant: "destructive",
      });
    },
  });

  // Removed automatic auth redirect to prevent infinite loops

  const handleAcceptInvite = () => {
    setIsAccepting(true);
    acceptInviteMutation.mutate();
  };

  if (isLoading || inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || hasError || (!inviteLoading && !inviteData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-exclamation-triangle text-2xl text-destructive"></i>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Invite</h2>
                <p className="text-sm text-muted-foreground">
                  This invite link is invalid, expired, or has already been used.
                </p>
              </div>
              <Button onClick={() => window.location.href = "/"} data-testid="button-home">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invite, group } = inviteData as {invite: any; group: any};

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-users text-2xl text-primary"></i>
          </div>
          <CardTitle className="text-xl" data-testid="text-group-name">
            Join {group?.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            You've been invited to join this dining group
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Group Info */}
          <div className="text-center space-y-2">
            {group?.description && (
              <p className="text-sm text-muted-foreground" data-testid="text-group-description">
                {group.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>
                <i className="fas fa-calendar mr-1"></i>
                Created {group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Recently'}
              </span>
            </div>
          </div>

          {/* User Info */}
          {isAuthenticated && user && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {(user as any).profileImageUrl ? (
                  <img 
                    src={(user as any).profileImageUrl} 
                    alt="Your avatar"
                    className="w-10 h-10 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                    {((user as any).firstName?.[0] || (user as any).email?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm" data-testid="text-user-name">
                    {(user as any).firstName && (user as any).lastName 
                      ? `${(user as any).firstName} ${(user as any).lastName}`
                      : (user as any).email
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Ready to join</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvite}
              disabled={isAccepting || acceptInviteMutation.isPending || !isAuthenticated}
              className="w-full"
              data-testid="button-accept-invite"
            >
              {isAccepting || acceptInviteMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Joining...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Accept Invite
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/"}
              className="w-full"
              data-testid="button-decline"
            >
              <i className="fas fa-times mr-2"></i>
              Maybe Later
            </Button>
          </div>

          {/* Login prompt for unauthenticated users */}
          {!isAuthenticated && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                You need to log in to accept this invite
              </p>
              <Button 
                onClick={() => window.location.href = "/api/login"}
                variant="outline"
                className="w-full"
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Log In to Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}