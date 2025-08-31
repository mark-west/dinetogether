import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import QRCode from 'qrcode';

interface InviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

// No schema needed since we're not collecting any input

export default function InviteModal({ groupId, groupName, onClose }: InviteModalProps) {
  const { toast } = useToast();
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [activeQrCode, setActiveQrCode] = useState<string>('');

  // No form needed

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "invites"],
    retry: false,
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/groups/${groupId}/invites`, {});
    },
    onSuccess: (invite) => {
      setGeneratedInvite(invite);
      setShowInviteLink(true);
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

  const createNewInvite = () => {
    createInviteMutation.mutate();
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

  const generateQRCode = async (inviteCode: string) => {
    try {
      // Toggle QR code if clicking same invite
      if (showQrCode && activeQrCode === inviteCode) {
        setShowQrCode(false);
        setActiveQrCode('');
        return;
      }
      
      const link = `${window.location.origin}/invite/${inviteCode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(link, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
      setActiveQrCode(inviteCode);
      setShowQrCode(true);
      toast({
        title: "QR Code Generated!",
        description: "QR code is ready to scan",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  const deleteInvite = async (inviteId: string) => {
    try {
      await apiRequest("DELETE", `/api/invites/${inviteId}`);
      toast({
        title: "Success",
        description: "Invite removed successfully",
      });
      
      // Reset UI state if deleting the currently displayed invite
      if (generatedInvite && generatedInvite.id === inviteId) {
        setShowInviteLink(false);
        setGeneratedInvite(null);
      }
      
      // Reset QR code state
      setShowQrCode(false);
      setActiveQrCode('');
      setQrCodeUrl('');
      
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "invites"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove invite",
        variant: "destructive"
      });
    }
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
                Generate a shareable link or QR code to invite friends to join {groupName}.
              </p>
            </div>
            
            <Button 
              onClick={createNewInvite}
              disabled={createInviteMutation.isPending}
              data-testid="button-create-invite"
              className="w-full"
              size="lg"
            >
              {createInviteMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating Invite...
                </>
              ) : (
                <>
                  <i className="fas fa-link mr-2"></i>
                  Generate Invite Link
                </>
              )}
            </Button>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateQRCode(generatedInvite.inviteCode)}
                        data-testid="button-show-qr"
                      >
                        <i className="fas fa-qrcode"></i>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteInvite(generatedInvite.id)}
                        data-testid="button-delete-generated"
                        className="text-red-600 hover:text-red-700"
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </div>
                  
                  {showQrCode && qrCodeUrl && activeQrCode === generatedInvite.inviteCode && (
                    <div className="text-center py-4">
                      <Label className="text-xs text-green-700 dark:text-green-300 mb-2 block">QR Code - Scan to Join</Label>
                      <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code for invite link" 
                          className="w-48 h-48"
                          data-testid="qr-code-image"
                        />
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        Friends can scan this with their phone camera
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowQrCode(false)}
                        className="mt-2"
                        data-testid="button-hide-qr"
                      >
                        Hide QR Code
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Expires on {(() => {
                      try {
                        return generatedInvite.expiresAt ? format(new Date(generatedInvite.expiresAt), 'MMM d, yyyy') : 'Unknown';
                      } catch (error) {
                        return 'Unknown';
                      }
                    })()}
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
                            Created {(() => {
                              try {
                                return invite.createdAt ? format(new Date(invite.createdAt), 'MMM d, h:mm a') : 'Unknown';
                              } catch (error) {
                                return 'Unknown';
                              }
                            })()}
                            {invite.status === 'pending' && invite.expiresAt && (() => {
                              try {
                                return ` • Expires ${format(new Date(invite.expiresAt), 'MMM d')}`;
                              } catch (error) {
                                return ' • Expires Unknown';
                              }
                            })()}
                          </p>
                        </div>
                        
                        {invite.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyInviteLink(invite.inviteCode)}
                              data-testid={`button-copy-${invite.id}`}
                            >
                              <i className="fas fa-copy"></i>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateQRCode(invite.inviteCode)}
                              data-testid={`button-qr-${invite.id}`}
                            >
                              <i className="fas fa-qrcode"></i>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteInvite(invite.id)}
                              data-testid={`button-delete-${invite.id}`}
                              className="text-red-600 hover:text-red-700"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* QR Code display for individual invites */}
                      {showQrCode && activeQrCode === invite.inviteCode && qrCodeUrl && (
                        <div className="mt-4 text-center py-4 border-t">
                          <Label className="text-xs text-muted-foreground mb-2 block">QR Code - Scan to Join</Label>
                          <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
                            <img 
                              src={qrCodeUrl} 
                              alt="QR Code for invite link" 
                              className="w-32 h-32"
                              data-testid={`qr-code-${invite.id}`}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Friends can scan this with their phone camera
                          </p>
                        </div>
                      )}
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