import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Chat() {
  const { eventId } = useParams();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");

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

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/events", eventId, "messages"],
    retry: false,
    enabled: isAuthenticated && !!eventId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const { data: event } = useQuery({
    queryKey: ["/api/events", eventId],
    retry: false,
    enabled: isAuthenticated && !!eventId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!eventId) throw new Error("No event selected");
      await apiRequest("POST", `/api/events/${eventId}/messages`, { content });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "messages"] });
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
          <div className="md:hidden bg-card border-b border-border p-4">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex-1 p-4 md:p-6 space-y-6">
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-40">
          <h1 className="font-bold text-lg text-foreground">Chat</h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full flex gap-4">
            {/* Event List Sidebar */}
            <div className="w-80 hidden lg:block">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Event Chats</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-full">
                    {eventsLoading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-16" />
                        ))}
                      </div>
                    ) : events && events.length > 0 ? (
                      <div className="space-y-1">
                        {events.map((evt: any) => (
                          <Button
                            key={evt.id}
                            variant={eventId === evt.id ? "secondary" : "ghost"}
                            className="w-full justify-start p-4 h-auto"
                            onClick={() => window.location.href = `/chat/${evt.id}`}
                            data-testid={`button-event-chat-${evt.id}`}
                          >
                            <div className="text-left">
                              <p className="font-medium truncate" data-testid={`text-event-name-${evt.id}`}>
                                {evt.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate" data-testid={`text-event-group-${evt.id}`}>
                                {evt.group.name}
                              </p>
                              <p className="text-xs text-muted-foreground" data-testid={`text-event-date-${evt.id}`}>
                                {format(new Date(evt.dateTime), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        <p>No events with chats</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="flex-1">
              {eventId ? (
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle data-testid="text-chat-event-name">
                          {event?.name || 'Event Chat'}
                        </CardTitle>
                        {event && (
                          <p className="text-sm text-muted-foreground" data-testid="text-chat-event-details">
                            {event.group?.name} • {format(new Date(event.dateTime), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" data-testid="button-event-details">
                        <i className="fas fa-info-circle mr-2"></i>
                        Details
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <Skeleton className="w-8 h-8 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-12 w-64" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((msg: any) => (
                            <div key={msg.id} className="flex gap-3" data-testid={`message-${msg.id}`}>
                              {msg.user.profileImageUrl ? (
                                <img 
                                  src={msg.user.profileImageUrl} 
                                  alt={`${msg.user.firstName} ${msg.user.lastName}`}
                                  className="w-8 h-8 rounded-full object-cover"
                                  data-testid={`img-message-avatar-${msg.id}`}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {(msg.user.firstName?.[0] || msg.user.email?.[0] || '?').toUpperCase()}
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium" data-testid={`text-message-sender-${msg.id}`}>
                                    {msg.user.firstName && msg.user.lastName 
                                      ? `${msg.user.firstName} ${msg.user.lastName}`
                                      : msg.user.email
                                    }
                                  </p>
                                  <p className="text-xs text-muted-foreground" data-testid={`text-message-time-${msg.id}`}>
                                    {format(new Date(msg.createdAt), 'h:mm a')}
                                  </p>
                                </div>
                                <div className={`chat-bubble p-3 rounded-lg ${
                                  msg.userId === user?.id ? 'own ml-auto bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap" data-testid={`text-message-content-${msg.id}`}>
                                    {msg.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-comments text-2xl text-muted-foreground"></i>
                          </div>
                          <h3 className="font-medium text-foreground mb-2">No messages yet</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            Start the conversation about this event! Ask questions, suggest restaurants, or just chat with your group.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                    
                    {/* Message Input */}
                    <div className="border-t border-border p-4">
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message..."
                          disabled={sendMessageMutation.isPending}
                          data-testid="input-message"
                        />
                        <Button 
                          type="submit" 
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          data-testid="button-send-message"
                        >
                          <i className="fas fa-paper-plane"></i>
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-comments text-3xl text-muted-foreground"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Select an event to chat</h3>
                    <p className="text-muted-foreground max-w-md">
                      Choose an event from the sidebar to start chatting with your group about the restaurant night.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
}
