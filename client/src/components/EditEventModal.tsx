import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import RestaurantSearch from "./RestaurantSearch";
import type { Event } from "@shared/schema";

const editEventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  restaurantName: z.string().optional(),
  restaurantAddress: z.string().optional(),
  restaurantImageUrl: z.string().optional(),
  restaurantPlaceId: z.string().optional(),
  restaurantLat: z.string().optional(),
  restaurantLng: z.string().optional(),
  dateTime: z.string().min(1, "Date and time are required"),
});

type EditEventForm = z.infer<typeof editEventSchema>;

interface EditEventModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditEventModal({ event, isOpen, onClose }: EditEventModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const form = useForm<EditEventForm>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      name: event.name,
      description: event.description || '',
      restaurantName: event.restaurantName || '',
      restaurantAddress: event.restaurantAddress || '',
      restaurantImageUrl: event.restaurantImageUrl || '',
      restaurantPlaceId: event.restaurantPlaceId || '',
      restaurantLat: event.restaurantLat || '',
      restaurantLng: event.restaurantLng || '',
      dateTime: new Date(event.dateTime).toISOString().slice(0, 16),
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditEventForm) => {
      return apiRequest('PUT', `/api/events/${event.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Event Updated",
        description: "Event details have been updated and participants notified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events/upcoming'] });
      onClose();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
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
        title: "Update Failed",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/events/${event.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Event Cancelled",
        description: "Event has been cancelled and participants notified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events/upcoming'] });
      onClose();
      navigate('/events');
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
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
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditEventForm) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    deleteMutation.mutate();
    setShowCancelConfirm(false);
  };

  const handleRestaurantSelect = (restaurant: any) => {
    form.setValue('restaurantName', restaurant.name);
    form.setValue('restaurantAddress', restaurant.address);
    form.setValue('restaurantImageUrl', restaurant.photoUrl || '');
    form.setValue('restaurantPlaceId', restaurant.placeId);
    form.setValue('restaurantLat', restaurant.location?.lat?.toString() || '');
    form.setValue('restaurantLng', restaurant.location?.lng?.toString() || '');
  };

  return (
    <>
      <Dialog open={isOpen && !showCancelConfirm} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]" data-testid="modal-edit-event">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details. Participants will be notified of changes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Dinner at..."
                  data-testid="input-event-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Optional details about the event..."
                  rows={3}
                  data-testid="input-event-description"
                />
              </div>

              <div>
                <Label htmlFor="restaurant">Restaurant</Label>
                <RestaurantSearch
                  onSelect={handleRestaurantSelect}
                  placeholder="Search for a restaurant..."
                  initialValue={form.watch("restaurantName")}
                />
              </div>

              <div>
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  {...form.register("dateTime")}
                  data-testid="input-event-datetime"
                />
                {form.formState.errors.dateTime && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.dateTime.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleCancel}
                data-testid="button-cancel-event"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Cancel Event
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-save-event"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent data-testid="modal-cancel-confirm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancel Event?</DialogTitle>
            <DialogDescription>
              This will permanently cancel "{event.name}" and notify all participants.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              Keep Event
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {deleteMutation.isPending ? "Cancelling..." : "Yes, Cancel Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}