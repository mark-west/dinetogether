import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X } from "lucide-react";

interface PhotoUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelect: (photoUrl: string) => void;
  currentPhotoUrl?: string;
  title: string;
  description?: string;
}

export default function PhotoUploader({
  isOpen,
  onClose,
  onPhotoSelect,
  currentPhotoUrl,
  title,
  description = "Choose a photo to upload"
}: PhotoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // For now, create a mock upload URL since object storage isn't set up
      // In a real implementation, this would:
      // 1. Get a presigned upload URL from the backend
      // 2. Upload the file to object storage
      // 3. Return the public URL
      
      // Mock implementation - in production this would be the actual uploaded URL
      const mockUploadUrl = previewUrl; // Use the preview URL as a placeholder
      
      toast({
        title: "Photo uploaded",
        description: "Your photo has been uploaded successfully!",
      });
      
      onPhotoSelect(mockUploadUrl);
      onClose();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    onPhotoSelect("");
    onClose();
  };

  const resetModal = () => {
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
          
          {/* Current photo preview */}
          {(previewUrl || currentPhotoUrl) && (
            <div className="relative">
              <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                <img 
                  src={previewUrl || currentPhotoUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              {previewUrl && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={resetModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* File input */}
          {!previewUrl && (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                
                <div>
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                      Click to upload a photo
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </Label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-photo-upload"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            {currentPhotoUrl && (
              <Button
                variant="destructive"
                onClick={handleRemovePhoto}
                data-testid="button-remove-photo"
              >
                Remove Photo
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            
            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                data-testid="button-upload"
              >
                {isUploading ? "Uploading..." : "Upload Photo"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}