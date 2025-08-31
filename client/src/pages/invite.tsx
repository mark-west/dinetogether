import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface InviteData {
  invite: {
    inviteCode: string;
    groupId: string;
    status: string;
  };
  group: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function InvitePage() {
  const params = useParams();
  const { toast } = useToast();
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  
  const inviteCode = params.inviteCode;

  // Load invite data first
  useEffect(() => {
    if (!inviteCode) {
      setError("No invite code provided");
      setInviteLoading(false);
      return;
    }

    let isCancelled = false;
    
    const loadInvite = async () => {
      try {
        const response = await fetch(`/api/invites/${inviteCode}`, {
          credentials: 'include'
        });
        
        if (isCancelled) return;
        
        if (!response.ok) {
          throw new Error("Invite not found or expired");
        }
        
        const data = await response.json();
        setInviteData(data);
        setInviteLoading(false);
        
        // Now load auth if invite is valid
        setAuthLoading(true);
        
        const authResponse = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (isCancelled) return;
        
        if (authResponse.ok) {
          const userData = await authResponse.json();
          setUser(userData);
        }
        
        setAuthLoading(false);
        setIsLoading(false);
        
      } catch (err) {
        if (isCancelled) return;
        console.error("Error loading invite:", err);
        setError(err instanceof Error ? err.message : "Failed to load invite");
        setInviteLoading(false);
        setIsLoading(false);
      }
    };

    loadInvite();
    
    return () => {
      isCancelled = true;
    };
  }, [inviteCode]);

  const handleAcceptInvite = async () => {
    if (!inviteCode) return;
    
    setIsAccepting(true);
    
    try {
      const response = await fetch(`/api/invites/${inviteCode}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept invite");
      }
      
      toast({
        title: "Success!",
        description: "You've joined the group successfully!",
      });
      
      setTimeout(() => {
        window.location.href = "/groups";
      }, 1500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to accept invite";
      
      if (errorMessage.includes("Unauthorized")) {
        toast({
          title: "Please log in",
          description: "You need to log in to accept this invite",
          variant: "destructive",
        });
        setTimeout(() => {
          const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/api/login?redirect=${currentUrl}`;
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: errorMessage.includes("already a member") 
          ? "You're already a member of this group!"
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
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

  if (error || !inviteData) {
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

  const { invite, group } = inviteData;
  const isAuthenticated = !!user;

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
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Your avatar"
                    className="w-10 h-10 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                    {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm" data-testid="text-user-name">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email
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
              disabled={isAccepting || !isAuthenticated}
              className="w-full"
              data-testid="button-accept-invite"
            >
              {isAccepting ? (
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
          {!isAuthenticated && !authLoading && (
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                You need to log in to accept this invite
              </p>
              <Button 
                onClick={() => {
                  const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
                  window.location.href = `/api/login?redirect=${currentUrl}`;
                }}
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