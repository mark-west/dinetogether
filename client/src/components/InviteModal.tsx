import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import QRCode from 'qrcode';

interface InviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export default function InviteModal({ groupId, groupName, onClose }: InviteModalProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);

  // Get the group's permanent invite information
  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ["/api/groups", groupId, "invites"],
    retry: false,
  });

  const invite = Array.isArray(invites) ? invites[0] : null; // There's only one permanent invite per group
  const inviteLink = invite?.inviteUrl || `https://dinetogether.app/invite/${invite?.inviteCode}`;

  // Generate QR code when component loads
  useEffect(() => {
    if (invite?.inviteCode) {
      generateQRCode(invite.inviteCode);
    }
  }, [invite?.inviteCode]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    });
  };

  const generateQRCode = async (inviteCode: string) => {
    try {
      const link = `https://dinetogether.app/invite/${inviteCode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(link, {
        width: 256,
        margin: 2,
        color: {
          dark: '#460831',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold">
            INVITE MEMBERS
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Share this link or QR code to invite people to "{groupName}"
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {invitesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : invite ? (
            <>
              {/* Invite Link Section */}
              <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 text-center">Group Invite Link</h3>
                  <div className="flex gap-2">
                    <Input 
                      value={inviteLink} 
                      readOnly 
                      className="font-mono text-sm"
                      data-testid="input-invite-link"
                    />
                    <Button 
                      onClick={copyInviteLink}
                      variant="outline"
                      size="sm"
                      data-testid="button-copy-link"
                    >
                      <i className="fas fa-copy mr-2"></i>
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This link never expires and works forever
                  </p>
                </CardContent>
              </Card>

              {/* QR Code Section */}
              <Card className="border-2 border-dashed border-pink-200 dark:border-pink-800">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-3">QR Code</h3>
                  {qrCodeUrl ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code for group invite" 
                          className="w-48 h-48 border rounded-lg shadow-sm"
                          data-testid="img-qr-code"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scan this QR code to join the group instantly
                      </p>
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mx-auto">
                      <i className="fas fa-qrcode text-4xl text-muted-foreground"></i>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                  How to share
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Copy and send the link via text, email, or social media</li>
                  <li>• Show the QR code for people to scan with their phone</li>
                  <li>• The invite link works forever and never expires</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-exclamation-triangle text-muted-foreground"></i>
              </div>
              <p className="text-sm text-muted-foreground">Unable to load invite information</p>
            </div>
          )}

          {/* Close Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={onClose} 
              className="w-full"
              data-testid="button-close-modal"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}