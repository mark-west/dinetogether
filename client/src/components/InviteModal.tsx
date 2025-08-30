import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface InviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address").optional(),
});

export default function InviteModal({ groupId, groupName, onClose }: InviteModalProps) {
  const { toast } = useToast();
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<any>(null);

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "invites"],
    retry: false,
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      return await apiRequest("POST", `/api/groups/${groupId}/invites`, data);
    },
    onSuccess: (invite) => {
      setGeneratedInvite(invite);
      setShowInviteLink(true);
      form.reset();
      toast({
        title: "Success",
        description: "Invite created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "invites"] });
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
        description: "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof inviteSchema>) => {
    createInviteMutation.mutate(data);
  };

  const copyInviteLink = (inviteCode: string) => {
    const link = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite People to {groupName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Invite */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Create New Invite</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate an invite link to share with friends. Email is optional.
              </p>
            </div>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  {...form.register("email")}
                  data-testid="input-invite-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <Button 
                type="submit" 
                disabled={createInviteMutation.isPending}
                data-testid="button-create-invite"
                className="w-full"
              >
                {createInviteMutation.isPending ? "Creating..." : "Generate Invite Link"}
              </Button>
            </form>
          </div>

          {/* Show Generated Invite */}
          {showInviteLink && generatedInvite && (
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <i className="fas fa-check-circle text-green-600"></i>
                  <span className="font-medium text-green-800 dark:text-green-200">Invite Created!</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-green-700 dark:text-green-300">Invite Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/invite/${generatedInvite.inviteCode}`}
                        readOnly
                        className="bg-white dark:bg-gray-800 text-xs"
                        data-testid="input-invite-link"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyInviteLink(generatedInvite.inviteCode)}
                        data-testid="button-copy-invite"
                      >
                        <i className="fas fa-copy"></i>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Expires on {format(new Date(generatedInvite.expiresAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Invites */}
          <div>
            <h3 className="font-medium mb-4">Recent Invites</h3>
            {invitesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : invites && Array.isArray(invites) && invites.length > 0 ? (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {invites.map((invite: any) => (
                  <Card key={invite.id} data-testid={`invite-${invite.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(invite.status)} text-white border-0`}
                            >
                              {invite.status}
                            </Badge>
                            {invite.invitedEmail && (
                              <span className="text-sm text-muted-foreground truncate" data-testid={`text-invite-email-${invite.id}`}>
                                {invite.invitedEmail}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created {format(new Date(invite.createdAt), 'MMM d, h:mm a')}
                            {invite.status === 'pending' && ` • Expires ${format(new Date(invite.expiresAt), 'MMM d')}`}
                          </p>
                        </div>
                        
                        {invite.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invite.inviteCode)}
                            data-testid={`button-copy-${invite.id}`}
                          >
                            <i className="fas fa-copy"></i>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-envelope text-muted-foreground"></i>
                </div>
                <p className="text-sm text-muted-foreground">No invites created yet</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}