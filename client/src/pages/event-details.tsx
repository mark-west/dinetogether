import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format, isToday, isTomorrow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLoadingNavigation } from "@/hooks/useLoadingNavigation";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import CalendarActions from "@/components/CalendarActions";
import DirectionsButton from "@/components/DirectionsButton";
import EditEventModal from "@/components/EditEventModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InteractiveStarRating } from "@/components/InteractiveStarRating";
import { getRestaurantWebsiteUrl } from '@/lib/restaurantUtils';

// Helper function to format today's restaurant hours
const formatTodaysHours = (restaurantHours: any): string => {
  if (!restaurantHours) return 'Hours not available';
  
  try {
    const hoursData = restaurantHours.weekdayDescriptions || 
                     restaurantHours.weekday_text ||
                     restaurantHours.periods;
    
    if (Array.isArray(hoursData) && hoursData.length > 0) {
      const today = new Date().getDay();
      const googleDay = today === 0 ? 6 : today - 1; // Convert Sunday=0 to Monday=0 format
      
      if (hoursData[googleDay]) {
        return hoursData[googleDay];
      }
      return hoursData[0] || 'Hours not available';
    }
    
    return 'Hours not available';
  } catch (error) {
    console.error('Error formatting hours:', error);
    return 'Hours not available';
  }
};

// Star Rating Component
function StarRating({ rating, interactive = false, onRatingChange }: { 
  rating: number; 
  interactive?: boolean; 
  onRatingChange?: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`fas fa-star text-sm ${
            star <= rating ? 'text-yellow-400' : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={interactive ? () => onRatingChange?.(star) : undefined}
          data-testid={`star-${star}`}
        />
      ))}
    </div>
  );
}

// Photos Tab Component
function PhotosTab({ eventId }: { eventId: string }) {
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const { toast } = useToast();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: [`/api/events/${eventId}/photos`],
    retry: false,
    enabled: !!eventId,
  });

  const addPhotoMutation = useMutation({
    mutationFn: async (data: { url: string; caption?: string }) => {
      return apiRequest("POST", `/api/events/${eventId}/photos`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/photos`] });
      setNewPhotoUrl("");
      setNewPhotoCaption("");
      setIsAddingPhoto(false);
      toast({ title: "Photo added successfully!" });
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
      toast({ title: "Failed to add photo", variant: "destructive" });
    },
  });

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    addPhotoMutation.mutate({
      url: newPhotoUrl,
      caption: newPhotoCaption || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (error && error.message.includes('404')) {
    // Event not found, redirect to events page
    navigateWithLoading('/events');
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Photos ({photos.length})</h3>
        <Dialog open={isAddingPhoto} onOpenChange={setIsAddingPhoto}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-photo">
              <i className="fas fa-camera mr-2"></i>
              Add Photo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="photo-url">Photo URL</Label>
                <Input
                  id="photo-url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  data-testid="input-photo-url"
                />
              </div>
              <div>
                <Label htmlFor="photo-caption">Caption (optional)</Label>
                <Input
                  id="photo-caption"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="Add a caption..."
                  data-testid="input-photo-caption"
                />
              </div>
              <Button 
                onClick={handleAddPhoto} 
                disabled={!newPhotoUrl.trim() || addPhotoMutation.isPending}
                data-testid="button-save-photo"
              >
                {addPhotoMutation.isPending ? "Adding..." : "Add Photo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-camera text-2xl text-muted-foreground"></i>
          </div>
          <h3 className="font-medium text-foreground mb-2">No photos yet</h3>
          <p className="text-sm text-muted-foreground">Be the first to add one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo: any) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="aspect-square bg-gray-100">
                <img
                  src={photo.url}
                  alt={photo.caption || "Event photo"}
                  className="w-full h-full object-cover"
                  data-testid={`img-photo-${photo.id}`}
                />
              </div>
              <CardContent className="p-3">
                {photo.caption && (
                  <p className="text-sm mb-2" data-testid={`text-photo-caption-${photo.id}`}>
                    {photo.caption}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={photo.uploader?.profileImageUrl} />
                    <AvatarFallback>
                      {photo.uploader?.firstName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{photo.uploader?.firstName} {photo.uploader?.lastName}</span>
                  <span>•</span>
                  <span>{format(new Date(photo.createdAt), 'MMM d')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Diaries Tab Component
function DiariesTab({ eventId }: { eventId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();

  const { data: userDiary } = useQuery({
    queryKey: [`/api/events/${eventId}/diary`],
    retry: false,
    enabled: !!eventId,
  });

  const { data: diaries = [], isLoading } = useQuery({
    queryKey: [`/api/events/${eventId}/diaries`],
    retry: false,
    enabled: !!eventId,
  });

  useEffect(() => {
    if (userDiary) {
      setTitle(userDiary.title || "");
      setNotes(userDiary.notes || "");
      setCost(userDiary.cost?.toString() || "");
      setCurrency(userDiary.costCurrency || "USD");
      setIsPublic(userDiary.isPublic ?? true);
    }
  }, [userDiary]);

  const saveDiaryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/events/${eventId}/diary`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/diary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/diaries`] });
      setIsEditing(false);
      toast({ title: "Diary saved successfully!" });
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
      toast({ title: "Failed to save diary", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!title.trim()) return;
    saveDiaryMutation.mutate({
      title,
      notes: notes || undefined,
      cost: cost ? cost.toString() : undefined,
      costCurrency: cost ? currency : undefined,
      isPublic,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Diary Entries</h3>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-edit-diary">
              <i className="fas fa-book mr-2"></i>
              {userDiary ? 'Edit My Entry' : 'Add Diary Entry'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>My Diary Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="diary-title">Title</Label>
                <Input
                  id="diary-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="How was the experience?"
                  data-testid="input-diary-title"
                />
              </div>
              <div>
                <Label htmlFor="diary-notes">Notes</Label>
                <Textarea
                  id="diary-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share your thoughts about the meal, service, atmosphere..."
                  className="h-24"
                  data-testid="input-diary-notes"
                />
              </div>
              <div>
                <Label htmlFor="diary-cost">Cost (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="diary-cost"
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                    data-testid="input-diary-cost"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="diary-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  data-testid="switch-diary-public"
                />
                <Label htmlFor="diary-public">Make this entry public</Label>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={!title.trim() || saveDiaryMutation.isPending}
                data-testid="button-save-diary"
              >
                {saveDiaryMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {diaries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-book text-2xl text-muted-foreground"></i>
          </div>
          <h3 className="font-medium text-foreground mb-2">No diary entries yet</h3>
          <p className="text-sm text-muted-foreground">Share your experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {diaries.map((diary: any) => (
            <Card key={diary.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={diary.user?.profileImageUrl} />
                    <AvatarFallback>
                      {diary.user?.firstName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium" data-testid={`text-diary-author-${diary.id}`}>
                        {diary.user?.firstName} {diary.user?.lastName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(diary.createdAt), 'MMM d, yyyy')}
                      </span>
                      {diary.cost && (
                        <Badge variant="outline" className="ml-auto">
                          <i className="fas fa-dollar-sign w-3 h-3 mr-1"></i>
                          {diary.cost} {diary.costCurrency || 'USD'}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium mb-2" data-testid={`text-diary-title-${diary.id}`}>
                      {diary.title}
                    </h4>
                    {diary.notes && (
                      <p className="text-gray-600" data-testid={`text-diary-notes-${diary.id}`}>
                        {diary.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Ratings Tab Component
function RatingsTab({ eventId }: { eventId: string }) {
  const [isRating, setIsRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const { toast } = useToast();

  const { data: userRating } = useQuery({
    queryKey: [`/api/events/${eventId}/rating`],
    retry: false,
    enabled: !!eventId,
  });

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: [`/api/events/${eventId}/ratings`],
    retry: false,
    enabled: !!eventId,
  });

  const { data: averageRating = { averageRating: 0, totalRatings: 0 } } = useQuery({
    queryKey: [`/api/events/${eventId}/average-rating`],
    retry: false,
    enabled: !!eventId,
  });

  useEffect(() => {
    if (userRating) {
      setRating(userRating.rating || 0);
      setReview(userRating.review || "");
      setIsPublic(userRating.isPublic ?? true);
    }
  }, [userRating]);

  const saveRatingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/events/${eventId}/rating`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rating`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/ratings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/average-rating`] });
      setIsRating(false);
      toast({ title: "Rating saved successfully!" });
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
      toast({ title: "Failed to save rating", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (rating === 0) return;
    saveRatingMutation.mutate({
      rating,
      review: review || undefined,
      isPublic,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Ratings & Reviews</h3>
          {averageRating.totalRatings > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={averageRating.averageRating} />
              <span className="text-sm text-gray-600">
                {averageRating.averageRating.toFixed(1)} ({averageRating.totalRatings} ratings)
              </span>
            </div>
          )}
        </div>
        <Dialog open={isRating} onOpenChange={setIsRating}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-rating">
              <i className="fas fa-star mr-2"></i>
              {userRating ? 'Edit Rating' : 'Add Rating'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate This Experience</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Your Rating</Label>
                <div className="mt-2">
                  <StarRating 
                    rating={rating} 
                    interactive={true} 
                    onRatingChange={setRating}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="review">Review (optional)</Label>
                <Textarea
                  id="review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your thoughts about the restaurant, food, service..."
                  className="h-24"
                  data-testid="input-rating-review"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="rating-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  data-testid="switch-rating-public"
                />
                <Label htmlFor="rating-public">Make this rating public</Label>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={rating === 0 || saveRatingMutation.isPending}
                data-testid="button-save-rating"
              >
                {saveRatingMutation.isPending ? "Saving..." : "Save Rating"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {ratings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-star text-2xl text-muted-foreground"></i>
          </div>
          <h3 className="font-medium text-foreground mb-2">No ratings yet</h3>
          <p className="text-sm text-muted-foreground">Be the first to rate this experience!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ratings.map((rating: any) => (
            <Card key={rating.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={rating.user?.profileImageUrl} />
                    <AvatarFallback>
                      {rating.user?.firstName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium" data-testid={`text-rating-author-${rating.id}`}>
                        {rating.user?.firstName} {rating.user?.lastName}
                      </span>
                      <StarRating rating={rating.rating} />
                      <span className="text-sm text-gray-500 ml-auto">
                        {format(new Date(rating.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {rating.review && (
                      <p className="text-gray-600" data-testid={`text-rating-review-${rating.id}`}>
                        {rating.review}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventDetails() {
  const { eventId } = useParams();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { navigateWithLoading, isLoading: isNavigationLoading } = useLoadingNavigation();
  const [rsvpStatus, setRsvpStatus] = useState<string>('pending');
  const [showEditModal, setShowEditModal] = useState(false);

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

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["/api/events", eventId],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });

  const { data: rsvps, isLoading: rsvpsLoading } = useQuery({
    queryKey: ["/api/events", eventId, "rsvps"],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });


  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/events", eventId, "messages"],
    retry: false,
    enabled: isAuthenticated && !!eventId,
    refetchInterval: 5000,
  });

  const { data: averageRating = { averageRating: 0, totalRatings: 0 } } = useQuery({
    queryKey: [`/api/events/${eventId}/average-rating`],
    retry: false,
    enabled: !!eventId,
  });

  const { data: userRating } = useQuery({
    queryKey: [`/api/events/${eventId}/rating`],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });

  const saveRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest("PUT", `/api/events/${eventId}/rating`, {
        rating,
        review: "",
        isPublic: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rating`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/average-rating`] });
      toast({ title: "Rating saved successfully!" });
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
      toast({ title: "Failed to save rating", variant: "destructive" });
    },
  });

  const handleRatingChange = (rating: number) => {
    saveRatingMutation.mutate(rating);
  };

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("POST", `/api/events/${eventId}/rsvp`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "RSVP updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "rsvps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
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
        description: "Failed to update RSVP",
        variant: "destructive",
      });
    },
  });


  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'EEEE, MMM d, h:mm a');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'maybe': return 'bg-yellow-500';
      case 'declined': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Going';
      case 'maybe': return 'Maybe';
      case 'declined': return 'Declined';
      default: return 'Pending';
    }
  };

  // Find current user's RSVP
  useEffect(() => {
    if (rsvps && user) {
      const userRsvp = rsvps.find((rsvp: any) => rsvp.userId === user.id);
      setRsvpStatus(userRsvp?.status || 'pending');
    }
  }, [rsvps, user]);


  if (isLoading || eventLoading) {
    return (
      <>
        <div className="md:hidden bg-card border-b border-border p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Event not found</h2>
          <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigateWithLoading('/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const mapMarkers = [];
  if (event.restaurantLat && event.restaurantLng) {
    const lat = parseFloat(event.restaurantLat);
    const lng = parseFloat(event.restaurantLng);
    
    // Only add marker if coordinates are valid numbers
    if (!isNaN(lat) && !isNaN(lng)) {
      mapMarkers.push({
        position: { lat, lng },
        title: event.restaurantName || event.name,
        info: `<div><strong>${event.restaurantName || event.name}</strong><br/>${event.restaurantAddress || ''}</div>`
      });
    }
  }

  return (
    <>
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
          <h1 className="font-bold text-lg text-foreground">Event Details</h1>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Event Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-full sm:w-auto flex justify-center sm:justify-start">
                  {event.restaurantImageUrl ? (
                    <img 
                      src={event.restaurantImageUrl} 
                      alt={event.restaurantName} 
                      className="w-28 h-28 sm:w-24 sm:h-24 rounded-lg object-cover"
                      data-testid="img-event-restaurant"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-24 sm:h-24 bg-muted rounded-lg flex items-center justify-center">
                      <i className="fas fa-utensils text-2xl text-muted-foreground"></i>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-event-name">
                        {event.name}
                      </h1>
                      {event.restaurantName && (
                        <p className="text-lg text-muted-foreground mb-1" data-testid="text-restaurant-name">
                          {event.restaurantName}
                        </p>
                      )}
                      {event.restaurantAddress && (
                        <p className="text-sm text-muted-foreground" data-testid="text-restaurant-address">
                          <i className="fas fa-map-marker-alt mr-2"></i>
                          {event.restaurantAddress}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 justify-center sm:justify-end">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(rsvpStatus)}`}></div>
                      <Badge variant="secondary" data-testid="status-current">
                        {getStatusText(rsvpStatus)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <i className="fas fa-calendar"></i>
                      <span data-testid="text-event-date">{formatEventDate(event.dateTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <i className="fas fa-users"></i>
                      <span data-testid="text-attendee-count">
                        {rsvps?.filter((r: any) => r.status === 'confirmed').length || 0} attending
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 justify-center sm:justify-start">
                      {averageRating?.averageRating > 0 && (
                        <div className="flex items-center gap-2">
                          <StarRating rating={averageRating.averageRating} />
                          <span className="font-medium text-foreground">
                            {averageRating.averageRating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            ({averageRating.totalRatings} rating{averageRating.totalRatings !== 1 ? 's' : ''})
                          </span>
                        </div>
                      )}
                      {isAuthenticated && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Your rating:</span>
                          <InteractiveStarRating
                            currentRating={userRating?.rating || 0}
                            onRatingChange={handleRatingChange}
                            disabled={saveRatingMutation.isPending}
                            size="sm"
                          />
                          {saveRatingMutation.isPending && (
                            <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-500 rounded-full"></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-4" data-testid="text-event-description">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <CalendarActions event={event} />
                    {event.restaurantAddress && (
                      <DirectionsButton 
                        address={event.restaurantAddress}
                        restaurantName={event.restaurantName}
                        lat={event.restaurantLat}
                        lng={event.restaurantLng}
                      />
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => navigateWithLoading(`/chat/${eventId}`)}
                      disabled={isNavigationLoading(`/chat/${eventId}`)}
                      data-testid="button-chat"
                    >
                      {isNavigationLoading(`/chat/${eventId}`) ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full mr-2"></div>
                      ) : (
                        <i className="fas fa-comments mr-2"></i>
                      )}
                      Chat
                    </Button>
                    {user && event.createdBy === user.id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setShowEditModal(true)}
                        data-testid="button-edit-event"
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit Event
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {(event.restaurantName || event.restaurantAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-map-marker-alt"></i>
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Map Display - always try to show map if we have coordinates */}
                {mapMarkers.length > 0 ? (
                  <GoogleMapComponent
                    center={mapMarkers[0].position}
                    markers={mapMarkers}
                    zoom={15}
                    className="w-full h-64 rounded-lg"
                  />
                ) : event.restaurantAddress ? (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center p-6">
                      <i className="fas fa-map-marker-alt text-3xl text-muted-foreground mb-3"></i>
                      <p className="text-sm text-muted-foreground">Map not available for this location</p>
                      <p className="text-xs text-muted-foreground mt-1">Address details below</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center p-6">
                      <i className="fas fa-map-marker-alt text-3xl text-muted-foreground mb-3"></i>
                      <p className="text-sm text-muted-foreground">No location specified</p>
                    </div>
                  </div>
                )}
                
                {/* Enhanced Restaurant Info */}
                {(event.restaurantName || event.restaurantAddress) && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      {/* Restaurant Name & Basic Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          
                          {event.restaurantAddress && (
                            <p className="text-sm text-muted-foreground mb-2" data-testid="text-restaurant-address">
                              <i className="fas fa-map-marker-alt mr-2"></i>
                              {event.restaurantAddress}
                            </p>
                          )}
                          
                          {/* Restaurant Hours */}
                          {(event as any).restaurantHours && (
                            <div className="text-sm text-muted-foreground">
                              <i className="fas fa-clock mr-2"></i>
                              <span data-testid="text-restaurant-hours">
                                Today: {formatTodaysHours((event as any).restaurantHours)}
                              </span>
                            </div>
                          )}
                          
                          {/* Phone Number */}
                          {(event as any).restaurantPhone && (
                            <div className="text-sm text-muted-foreground mt-2">
                              <i className="fas fa-phone mr-2"></i>
                              <a href={`tel:${(event as any).restaurantPhone}`} 
                                 className="hover:underline" 
                                 data-testid="link-restaurant-phone">
                                {(event as any).restaurantPhone}
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {/* Directions Button */}
                        {event.restaurantAddress && (
                          <DirectionsButton 
                            address={event.restaurantAddress}
                            restaurantName={event.restaurantName}
                            lat={event.restaurantLat}
                            lng={event.restaurantLng}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    {event.restaurantName && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={async () => {
                            // Use direct website URL if available, otherwise search
                            const websiteUrl = (event as any).restaurantWebsite || 
                              await getRestaurantWebsiteUrl(event.restaurantName!, event.restaurantAddress);
                            window.open(websiteUrl, '_blank', 'noopener,noreferrer');
                          }}
                          data-testid="button-restaurant-website"
                        >
                          <i className="fas fa-globe mr-2"></i>
                          🍽️ Visit Restaurant Website
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* RSVP Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-reply"></i>
                Your RSVP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {['confirmed', 'maybe', 'declined'].map((status) => (
                  <Button
                    key={status}
                    variant={rsvpStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setRsvpStatus(status);
                      rsvpMutation.mutate(status);
                    }}
                    disabled={rsvpMutation.isPending}
                    data-testid={`button-rsvp-${status}`}
                  >
                    <i className={`fas fa-${status === 'confirmed' ? 'check' : status === 'maybe' ? 'question' : 'times'} mr-2`}></i>
                    {getStatusText(status)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Attendees, Suggestions, Photos, Diaries, Ratings */}
          <Tabs defaultValue="attendees" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendees" data-testid="tab-attendees">
                Attendees ({rsvps?.filter((r: any) => r.status === 'confirmed').length || 0})
              </TabsTrigger>
              <TabsTrigger value="photos" data-testid="tab-photos">
                Photos
              </TabsTrigger>
              <TabsTrigger value="diaries" data-testid="tab-diaries">
                Diaries
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendees" className="space-y-4">
              {rsvpsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : rsvps && rsvps.length > 0 ? (
                <div className="space-y-3">
                  {rsvps.map((rsvp: any) => (
                    <Card key={rsvp.id} data-testid={`rsvp-${rsvp.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {rsvp.user.profileImageUrl ? (
                            <img 
                              src={rsvp.user.profileImageUrl} 
                              alt={`${rsvp.user.firstName} ${rsvp.user.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                              data-testid={`img-rsvp-avatar-${rsvp.id}`}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                              {(rsvp.user.firstName?.[0] || rsvp.user.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`text-rsvp-name-${rsvp.id}`}>
                              {rsvp.user.firstName && rsvp.user.lastName 
                                ? `${rsvp.user.firstName} ${rsvp.user.lastName}`
                                : rsvp.user.email
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Responded {format(new Date(rsvp.respondedAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(rsvp.status)}`}></div>
                            <span className="text-sm font-medium" data-testid={`text-rsvp-status-${rsvp.id}`}>
                              {getStatusText(rsvp.status)}
                            </span>
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
                  <h3 className="font-medium text-foreground mb-2">No RSVPs yet</h3>
                  <p className="text-sm text-muted-foreground">Be the first to respond to this event!</p>
                </div>
              )}
            </TabsContent>
            

            <TabsContent value="photos" className="space-y-4">
              <PhotosTab eventId={eventId} />
            </TabsContent>

            <TabsContent value="diaries" className="space-y-4">
              <DiariesTab eventId={eventId} />
            </TabsContent>

          </Tabs>
      </div>
      
      {/* Edit Event Modal */}
      {event && (
        <EditEventModal
          event={event}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}