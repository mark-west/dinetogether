import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import RestaurantSearch from "@/components/RestaurantSearch";
import GoogleMapComponent from "@/components/GoogleMapComponent";
import CalendarActions from "@/components/CalendarActions";

const createEventSchema = z.object({
  groupId: z.string().min(1, "Please select a group"),
  name: z.string().min(1, "Event name is required"),
  restaurantName: z.string().optional(),
  restaurantAddress: z.string().optional(),
  restaurantImageUrl: z.string().optional(),
  restaurantPlaceId: z.string().optional(),
  restaurantLat: z.number().optional(),
  restaurantLng: z.number().optional(),
  dateTime: z.string().min(1, "Date and time are required"),
  description: z.string().optional(),
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

interface CreateEventModalProps {
  onClose: () => void;
  groups: any[];
  preSelectedGroupId?: string;
}

export default function CreateEventModal({ onClose, groups, preSelectedGroupId }: CreateEventModalProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [isNameCustomized, setIsNameCustomized] = useState(false);
  
  // Generate unique default event name
  const generateDefaultEventName = () => {
    const timestamp = Date.now();
    const eventNumber = timestamp % 10000; // Use last 4 digits of timestamp
    return `New Event ${eventNumber}`;
  };
  
  const [defaultEventName] = useState(generateDefaultEventName());

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      groupId: preSelectedGroupId || "",
      name: defaultEventName,
      restaurantName: "",
      restaurantAddress: "",
      restaurantImageUrl: "",
      restaurantPlaceId: "",
      restaurantLat: undefined,
      restaurantLng: undefined,
      dateTime: "",
      description: "",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventFormData) => {
      // Convert datetime-local input to ISO string
      const dateTime = new Date(data.dateTime).toISOString();
      
      await apiRequest("POST", "/api/events", {
        ...data,
        dateTime,
        restaurantLat: selectedRestaurant?.location?.lat,
        restaurantLng: selectedRestaurant?.location?.lng,
        restaurantImageUrl: selectedRestaurant?.photoUrl,
        restaurantPlaceId: selectedRestaurant?.placeId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsOpen(false);
      onClose();
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
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateEventFormData) => {
    createEventMutation.mutate(data);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  // Get minimum datetime (current time)
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto" data-testid="modal-create-event">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Group</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-group">
                        <SelectValue placeholder="Choose a group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id} data-testid={`select-group-${group.id}`}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Friday Night Dinner" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Mark as customized if user types something different
                        const restaurantName = selectedRestaurant?.name;
                        if (e.target.value !== defaultEventName && e.target.value !== restaurantName) {
                          setIsNameCustomized(true);
                        }
                      }}
                      data-testid="input-event-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Restaurant (Optional)
                </label>
                <div className="mt-1">
                  <RestaurantSearch
                    onSelect={(restaurant) => {
                      setSelectedRestaurant(restaurant);
                      form.setValue('restaurantName', restaurant.name);
                      form.setValue('restaurantAddress', restaurant.address);
                      form.setValue('restaurantImageUrl', restaurant.photoUrl || '');
                      form.setValue('restaurantPlaceId', restaurant.placeId);
                      form.setValue('restaurantLat', restaurant.location?.lat);
                      form.setValue('restaurantLng', restaurant.location?.lng);
                      setShowMap(true);
                      
                      // Auto-update event name if not customized
                      if (!isNameCustomized) {
                        form.setValue('name', restaurant.name);
                      }
                    }}
                    placeholder="Search for restaurants..."
                    initialValue=""
                  />
                </div>
              </div>
              
              {selectedRestaurant && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <i className="fas fa-utensils text-primary"></i>
                    <div>
                      <p className="font-medium text-sm" data-testid="text-selected-restaurant">
                        {selectedRestaurant.name}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-selected-address">
                        {selectedRestaurant.address}
                      </p>
                    </div>
                  </div>
                  {selectedRestaurant.rating && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <i className="fas fa-star text-yellow-500"></i>
                      <span>{selectedRestaurant.rating}/5</span>
                      {selectedRestaurant.priceLevel && (
                        <span className="ml-2">
                          {'$'.repeat(selectedRestaurant.priceLevel)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMap(!showMap)}
                      data-testid="button-toggle-map"
                    >
                      <i className={`fas fa-map${showMap ? '-minus' : '-plus'} mr-1`}></i>
                      {showMap ? 'Hide' : 'Show'} Map
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedRestaurant.address)}`;
                        window.open(url, '_blank');
                      }}
                      data-testid="button-directions"
                    >
                      <i className="fas fa-directions mr-1"></i>
                      Directions
                    </Button>
                  </div>
                </div>
              )}
              
              {showMap && selectedRestaurant?.location && (
                <GoogleMapComponent
                  center={selectedRestaurant.location}
                  markers={[{
                    position: selectedRestaurant.location,
                    title: selectedRestaurant.name,
                    info: `<div><strong>${selectedRestaurant.name}</strong><br/>${selectedRestaurant.address}</div>`
                  }]}
                  className="w-full h-48 rounded-lg"
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      min={minDateTime}
                      {...field} 
                      data-testid="input-event-datetime"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special notes for the group..." 
                      rows={3}
                      {...field} 
                      data-testid="input-event-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
                data-testid="button-cancel-event"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createEventMutation.isPending}
                data-testid="button-create-event"
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
