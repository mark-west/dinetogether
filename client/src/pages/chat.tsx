import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChatType = 'group' | 'event';

interface ThreadedMessage {
  id: string;
  content: string;
  userId: string;
  user: any;
  createdAt: string;
  parentMessageId?: string;
  replies?: ThreadedMessage[];
}

export default function Chat() {
  const params = useParams();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedChatType, setSelectedChatType] = useState<ChatType>('group');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Parse URL params for chat type and ID
  useEffect(() => {
    if (params.chatType && params.chatId) {
      setSelectedChatType(params.chatType as ChatType);
      setSelectedChatId(params.chatId);
    }
  }, [params]);

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

  // Fetch user's groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/groups"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch user's events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch messages based on selected chat
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: selectedChatType === 'group' 
      ? ["/api/groups", selectedChatId, "messages"]
      : ["/api/events", selectedChatId, "messages"],
    retry: false,
    enabled: isAuthenticated && !!selectedChatId,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  // Fetch current chat details
  const { data: currentChat } = useQuery({
    queryKey: selectedChatType === 'group'
      ? ["/api/groups", selectedChatId]
      : ["/api/events", selectedChatId],
    retry: false,
    enabled: isAuthenticated && !!selectedChatId,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    retry: false,
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds for better performance
    staleTime: 20000, // Consider data fresh for 20 seconds
  });

  // Fetch all unread counts in a single query
  const { data: allUnreadCounts } = useQuery({
    queryKey: ["/api/chats/all-unread-counts"],
    retry: false,
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds for better performance
    staleTime: 20000, // Consider data fresh for 20 seconds
  });

  // Helper function to get unread count from the single query
  const getUnreadCount = (chatType: ChatType, chatId: string) => {
    const key = `${chatType}:${chatId}`;
    return (allUnreadCounts as any)?.[key] || 0;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedChatId) throw new Error("No chat selected");
      
      const endpoint = selectedChatType === 'group' 
        ? `/api/groups/${selectedChatId}/messages`
        : `/api/events/${selectedChatId}/messages`;
      
      const payload = replyTo 
        ? { content, parentMessageId: replyTo }
        : { content };
      
      await apiRequest("POST", endpoint, payload);
    },
    onSuccess: () => {
      setMessage("");
      setReplyTo(null);
      const queryKey = selectedChatType === 'group'
        ? ["/api/groups", selectedChatId, "messages"]
        : ["/api/events", selectedChatId, "messages"];
      queryClient.invalidateQueries({ queryKey });
      
      // Also update unread counts since new messages affect other users' unread counts
      queryClient.invalidateQueries({ queryKey: ["/api/chats/all-unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
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

  const markAsReadMutation = useMutation({
    mutationFn: async (payload: { chatType: ChatType; chatId: string }) => {
      const endpoint = payload.chatType === 'group' 
        ? `/api/groups/${payload.chatId}/messages/mark-read`
        : `/api/events/${payload.chatId}/messages/mark-read`;
      await apiRequest("POST", endpoint, {});
    },
    onSuccess: () => {
      // Invalidate all unread count queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/chats/all-unread-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const handleChatSelect = (type: ChatType, id: string) => {
    setSelectedChatType(type);
    setSelectedChatId(id);
    setReplyTo(null);
    navigate(`/chat/${type}/${id}`);
    
    // Mark messages as read when entering a chat
    markAsReadMutation.mutate({ chatType: type, chatId: id });
  };

  const handleBackToChats = () => {
    setSelectedChatId(null);
    setReplyTo(null);
    navigate('/chat');
  };

  const handleReply = (messageId: string) => {
    setReplyTo(messageId);
    document.getElementById('message-input')?.focus();
  };

  const renderMessage = (msg: ThreadedMessage, isReply = false) => (
    <div key={msg.id} className={`flex gap-3 ${isReply ? 'ml-8 mt-2' : ''}`} data-testid={`message-${msg.id}`}>
      {msg.user.profileImageUrl ? (
        <img 
          src={msg.user.profileImageUrl} 
          alt={`${msg.user.firstName} ${msg.user.lastName}`}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          data-testid={`img-message-avatar-${msg.id}`}
        />
      ) : (
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
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
        {!isReply && (
          <div className="mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => handleReply(msg.id)}
              data-testid={`button-reply-${msg.id}`}
            >
              <i className="fas fa-reply mr-1"></i>
              Reply
            </Button>
          </div>
        )}
        
        {/* Render replies */}
        {msg.replies && msg.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {msg.replies.map(reply => renderMessage(reply, true))}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <>
        <div className="md:hidden bg-card border-b border-border p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {selectedChatId && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToChats}
              data-testid="button-mobile-back"
            >
              <i className="fas fa-arrow-left"></i>
            </Button>
          )}
          <h1 className="font-bold text-lg text-foreground">
            {selectedChatId ? (currentChat?.name || 'Chat') : 'Messages'}
          </h1>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="h-full flex gap-4">
            {/* Chat List Sidebar - Show on mobile when no chat selected */}
            <div className={`w-full lg:w-80 flex-shrink-0 ${selectedChatId ? 'hidden lg:block' : 'block'}`}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Messages
                    {unreadData?.count > 0 && (
                      <Badge variant="destructive" data-testid="badge-unread-count">
                        {unreadData.count}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden">
                  <Tabs value={selectedChatType} onValueChange={(value) => setSelectedChatType(value as ChatType)}>
                    <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                      <TabsTrigger value="group" data-testid="tab-group-chats">Group Chats</TabsTrigger>
                      <TabsTrigger value="event" data-testid="tab-event-chats">Event Chats</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="group" className="m-0">
                      <ScrollArea className="h-[500px]">
                        {groupsLoading ? (
                          <div className="p-4 space-y-3">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-16" />
                            ))}
                          </div>
                        ) : groups && groups.length > 0 ? (
                          <div className="space-y-1 px-2 pb-2">
                            {groups.map((group: any) => {
                              const unreadCount = getUnreadCount('group', group.id);
                              return (
                                <Button
                                  key={group.id}
                                  variant={selectedChatType === 'group' && selectedChatId === group.id ? "secondary" : "ghost"}
                                  className="w-full justify-between p-4 h-auto text-left overflow-hidden"
                                  onClick={() => handleChatSelect('group', group.id)}
                                  data-testid={`button-group-chat-${group.id}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`truncate ${unreadCount > 0 ? 'font-bold' : 'font-medium'}`} data-testid={`text-group-name-${group.id}`}>
                                      {group.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-group-members-${group.id}`}>
                                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {unreadCount > 0 && (
                                      <Badge variant="destructive" className="text-xs" data-testid={`badge-group-unread-${group.id}`}>
                                        {unreadCount}
                                      </Badge>
                                    )}
                                    <i className="fas fa-users text-muted-foreground"></i>
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <p>No groups found</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="event" className="m-0">
                      <ScrollArea className="h-[500px]">
                        {eventsLoading ? (
                          <div className="p-4 space-y-3">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-16" />
                            ))}
                          </div>
                        ) : events && events.length > 0 ? (
                          <div className="space-y-1 px-2 pb-2">
                            {events.map((evt: any) => {
                              const unreadCount = getUnreadCount('event', evt.id);
                              return (
                                <Button
                                  key={evt.id}
                                  variant={selectedChatType === 'event' && selectedChatId === evt.id ? "secondary" : "ghost"}
                                  className="w-full justify-between p-4 h-auto text-left overflow-hidden"
                                  onClick={() => handleChatSelect('event', evt.id)}
                                  data-testid={`button-event-chat-${evt.id}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`truncate ${unreadCount > 0 ? 'font-bold' : 'font-medium'}`} data-testid={`text-event-name-${evt.id}`}>
                                      {evt.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-event-group-${evt.id}`}>
                                      {evt.group?.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground" data-testid={`text-event-date-${evt.id}`}>
                                      {format(new Date(evt.dateTime), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {unreadCount > 0 && (
                                      <Badge variant="destructive" className="text-xs" data-testid={`badge-event-unread-${evt.id}`}>
                                        {unreadCount}
                                      </Badge>
                                    )}
                                    <i className="fas fa-calendar text-muted-foreground"></i>
                                  </div>
                                </Button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            <p>No events found</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Chat Area - Show on mobile when chat selected */}
            <div className={`flex-1 ${selectedChatId ? 'block' : 'hidden lg:block'}`}>
              {selectedChatId ? (
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Back button for mobile */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="lg:hidden flex-shrink-0"
                          onClick={handleBackToChats}
                          data-testid="button-back-to-chats"
                        >
                          <i className="fas fa-arrow-left"></i>
                        </Button>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate" data-testid="text-chat-title">
                            {currentChat?.name || 'Chat'}
                          </CardTitle>
                          {currentChat && (
                            <p className="text-sm text-muted-foreground truncate" data-testid="text-chat-details">
                              {selectedChatType === 'group' 
                                ? `Group Chat`
                                : `${currentChat.group?.name} • ${format(new Date(currentChat.dateTime), 'MMM d, h:mm a')}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-shrink-0"
                        onClick={() => {
                          const detailsPath = selectedChatType === 'group' 
                            ? `/groups/${selectedChatId}`
                            : `/events/${selectedChatId}`;
                          window.location.href = detailsPath;
                        }}
                        data-testid="button-chat-details"
                      >
                        <i className="fas fa-info-circle mr-2 hidden sm:inline"></i>
                        <span className="hidden sm:inline">Details</span>
                        <i className="fas fa-info-circle sm:hidden"></i>
                      </Button>
                    </div>
                    {replyTo && (
                      <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                        <span className="text-sm text-muted-foreground">
                          <i className="fas fa-reply mr-1"></i>
                          Replying to message
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setReplyTo(null)}
                          data-testid="button-cancel-reply"
                        >
                          <i className="fas fa-times"></i>
                        </Button>
                      </div>
                    )}
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
                          {messages.map((msg: ThreadedMessage) => renderMessage(msg))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-comments text-2xl text-muted-foreground"></i>
                          </div>
                          <h3 className="font-medium text-foreground mb-2">No messages yet</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            {selectedChatType === 'group' 
                              ? "Start chatting with your group! Share updates, plan events, or just stay connected."
                              : "Start the conversation about this event! Ask questions, suggest restaurants, or coordinate with your group."
                            }
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                    
                    {/* Message Input */}
                    <div className="border-t border-border p-4">
                      <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            id="message-input"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={replyTo ? "Type your reply..." : "Type your message..."}
                            disabled={sendMessageMutation.isPending}
                            data-testid="input-message"
                            className="w-full"
                          />
                        </div>
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          data-testid="button-send-message"
                          className="flex-shrink-0"
                        >
                          {sendMessageMutation.isPending ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-paper-plane"></i>
                          )}
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
                    <h3 className="text-xl font-semibold text-foreground mb-2">Select a chat</h3>
                    <p className="text-muted-foreground max-w-md">
                      Choose a group or event chat from the sidebar to start conversations, coordinate plans, and stay connected with your dining groups.
                    </p>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
    </>
  );
}