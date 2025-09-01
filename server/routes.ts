import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import type { Event, EventRsvp, User } from "@shared/schema";
import {
  insertGroupSchema,
  insertEventSchema,
  insertRsvpSchema,
  insertSuggestionSchema,
  insertMessageSchema,
  insertGroupMessageSchema,
  insertGroupMemberSchema,
  insertGroupInviteSchema,
  insertEventPhotoSchema,
  insertEventDiarySchema,
  insertEventRatingSchema,
} from "@shared/schema";
import { nanoid } from "nanoid";
import { 
  generateRestaurantRecommendations, 
  analyzeUserDiningPatterns, 
  enrichWithExternalReviews,
  generateCustomRecommendations,
  generateGroupRecommendations,
  type UserPreferences,
  type CustomPreferences
} from "./aiRecommendations";

// Helper function to fetch nearby restaurants from Google Places API
async function fetchNearbyRestaurants(latitude: number, longitude: number, radius: number) {
  console.log('=== FETCH NEARBY RESTAURANTS CALLED ===');
  console.log('Parameters:', { latitude, longitude, radius });
  const API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
  console.log('Using Google Maps API key:', API_KEY ? `Key exists: ${API_KEY?.substring(0, 10)}...` : 'No key found');
  if (!API_KEY) {
    console.error('Google Maps API key not configured');
    return [];
  }

  // Major chain restaurants to filter out
  const chainKeywords = [
    'mcdonald', 'burger king', 'subway', 'kfc', 'taco bell', 'pizza hut',
    'domino', 'papa john', 'wendy', 'arby', 'dairy queen', 'sonic',
    'chick-fil-a', 'popeyes', 'chipotle', 'panda express', 'starbucks',
    'dunkin', 'tim horton', 'ihop', 'denny', 'applebee', 'olive garden',
    'red lobster', 'outback', 'texas roadhouse', 'chili', 'friday',
    'buffalo wild wings', 'hooters', 'cracker barrel'
  ];

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&key=${API_KEY}`;
  console.log('Making Google Places API call to:', url.replace(API_KEY, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('Google Places API response status:', data.status);
    console.log('Number of results:', data.results?.length || 0);

    if (data.status !== 'OK' || !data.results) {
      console.error('Google Places API error:', data.status, data.error_message);
      return [];
    }

    console.log('Raw results from Google:', data.results.length);
    
    // Filter out chains and process restaurants
    const filteredRestaurants = data.results
      .filter((place: any) => {
        const name = place.name.toLowerCase();
        // Skip if it's a major chain (unless it's a finer dining franchise)
        const isChain = chainKeywords.some(keyword => name.includes(keyword));
        const isFineDining = place.price_level >= 3; // Allow higher-end chains
        
        console.log(`Restaurant: ${place.name}, isChain: ${isChain}, isFineDining: ${isFineDining}, price_level: ${place.price_level}`);
        
        // Temporarily allow all restaurants for testing
        return true; // !isChain || isFineDining;
      })
      .slice(0, 5) // Get 5 restaurants for training
      .map((place: any) => ({
        id: place.place_id,
        name: place.name,
        type: place.types?.find((type: string) => 
          ['restaurant', 'meal_takeaway', 'food'].includes(type)
        ) || 'Restaurant',
        priceRange: getPriceRange(place.price_level),
        description: `${place.vicinity} • Rating: ${place.rating || 'N/A'}`,
        rating: place.rating || 0,
        address: place.vicinity,
        photoReference: place.photos?.[0]?.photo_reference
      }));

    console.log('Filtered restaurants for training:', filteredRestaurants.length);
    if (filteredRestaurants.length > 0) {
      console.log('Sample restaurant:', filteredRestaurants[0]);
    }
    return filteredRestaurants;
  } catch (error) {
    console.error('Error fetching restaurants from Google Places:', error);
    return [];
  }
}

// Helper function to convert Google's price level to our format
function getPriceRange(priceLevel: number | undefined): string {
  switch (priceLevel) {
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '$$';
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        updatedAt: new Date(),
      };
      
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put('/api/profile/photo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { photoUrl } = req.body;
      
      const updateData = {
        profileImageUrl: photoUrl || null,
        updatedAt: new Date(),
      };
      
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile photo:", error);
      res.status(500).json({ message: "Failed to update profile photo" });
    }
  });


  // Group routes
  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupData = insertGroupSchema.parse({
        ...req.body,
        adminId: userId,
      });
      
      const group = await storage.createGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(400).json({ message: "Failed to create group" });
    }
  });

  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.get('/api/groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.get('/api/groups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  app.post('/api/groups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const memberData = insertGroupMemberSchema.parse({
        groupId: req.params.id,
        userId: req.body.userId,
        role: req.body.role || 'member',
      });
      
      const member = await storage.addGroupMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(400).json({ message: "Failed to add group member" });
    }
  });

  app.delete('/api/groups/:id/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeGroupMember(req.params.id, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  app.put('/api/groups/:id/photo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { photoUrl } = req.body;
      
      // Check if user is admin of the group
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      if (group.adminId !== userId) {
        return res.status(403).json({ message: "Only group admin can update group photo" });
      }
      
      const updateData = {
        photoUrl: photoUrl || null,
        updatedAt: new Date(),
      };
      
      const updatedGroup = await storage.updateGroup(req.params.id, updateData);
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating group photo:", error);
      res.status(500).json({ message: "Failed to update group photo" });
    }
  });

  // Remove group member (admin only)
  app.delete('/api/groups/:id/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const { id: groupId, userId: memberUserId } = req.params;

      // Check if current user is admin
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== currentUserId) {
        return res.status(403).json({ message: "Only group admin can remove members" });
      }

      // Prevent admin from removing themselves
      if (memberUserId === currentUserId) {
        return res.status(400).json({ message: "Admin cannot remove themselves from the group" });
      }

      await storage.removeGroupMember(groupId, memberUserId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  // Duplicate group (admin only)
  app.post('/api/groups/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const groupId = req.params.id;
      const { name: newName } = req.body;

      if (!newName || typeof newName !== 'string') {
        return res.status(400).json({ message: "Group name is required" });
      }

      // Check if current user is admin
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== currentUserId) {
        return res.status(403).json({ message: "Only group admin can duplicate groups" });
      }

      const newGroup = await storage.duplicateGroup(groupId, newName, currentUserId);
      res.status(201).json(newGroup);
    } catch (error) {
      console.error("Error duplicating group:", error);
      res.status(500).json({ message: "Failed to duplicate group" });
    }
  });

  // Delete group (admin only)
  app.delete('/api/groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const groupId = req.params.id;

      // Check if current user is admin
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== currentUserId) {
        return res.status(403).json({ message: "Only group admin can delete groups" });
      }

      await storage.deleteGroup(groupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Event routes
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getUpcomingEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.put('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.createdBy !== userId) {
        return res.status(403).json({ message: "Only event creator can edit events" });
      }
      
      // Get RSVPs before updating to send notifications
      const { rsvps } = await storage.getEventWithRsvps(req.params.id) || { rsvps: [] };
      
      const updateData = insertEventSchema.partial().parse(req.body);
      const updatedEvent = await storage.updateEvent(req.params.id, updateData);
      
      // TODO: Add email notifications for event updates
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.createdBy !== userId) {
        return res.status(403).json({ message: "Only event creator can cancel events" });
      }
      
      // Get RSVPs before deleting to send notifications
      const { rsvps } = await storage.getEventWithRsvps(req.params.id) || { rsvps: [] };
      
      await storage.deleteEvent(req.params.id);
      
      // TODO: Add email notifications for event cancellation
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.get('/api/groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.get('/api/groups/:id/events', isAuthenticated, async (req: any, res) => {
    try {
      const events = await storage.getGroupEvents(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching group events:", error);
      res.status(500).json({ message: "Failed to fetch group events" });
    }
  });

  app.get('/api/groups/:id/events/with-rsvps', isAuthenticated, async (req: any, res) => {
    try {
      const events = await storage.getGroupEventsWithMemberRsvps(req.params.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching group events with RSVPs:", error);
      res.status(500).json({ message: "Failed to fetch group events with RSVPs" });
    }
  });

  // RSVP routes
  app.post('/api/events/:id/rsvp', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rsvpData = insertRsvpSchema.parse({
        eventId: req.params.id,
        userId: userId,
        status: req.body.status,
      });
      
      const rsvp = await storage.upsertRsvp(rsvpData);
      res.json(rsvp);
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(400).json({ message: "Failed to update RSVP" });
    }
  });

  app.get('/api/events/:id/rsvps', isAuthenticated, async (req: any, res) => {
    try {
      const rsvps = await storage.getEventRsvps(req.params.id);
      res.json(rsvps);
    } catch (error) {
      console.error("Error fetching event RSVPs:", error);
      res.status(500).json({ message: "Failed to fetch event RSVPs" });
    }
  });

  // Restaurant suggestion routes
  app.post('/api/events/:id/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const suggestionData = insertSuggestionSchema.parse({
        eventId: req.params.id,
        userId: userId,
        ...req.body,
      });
      
      const suggestion = await storage.createSuggestion(suggestionData);
      res.status(201).json(suggestion);
    } catch (error) {
      console.error("Error creating suggestion:", error);
      res.status(400).json({ message: "Failed to create suggestion" });
    }
  });

  app.get('/api/events/:id/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const suggestions = await storage.getEventSuggestions(req.params.id);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Message routes
  app.post('/api/events/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        eventId: req.params.id,
        userId: userId,
        content: req.body.content,
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/events/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getEventMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/events/:id/messages/:messageId/reply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        eventId: req.params.id,
        userId: userId,
        content: req.body.content,
        parentMessageId: req.params.messageId,
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(400).json({ message: "Failed to create reply" });
    }
  });

  app.post('/api/events/:id/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markMessageAsRead(req.params.messageId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Group message routes
  app.post('/api/groups/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertGroupMessageSchema.parse({
        groupId: req.params.id,
        userId: userId,
        content: req.body.content,
        parentMessageId: req.body.parentMessageId || null,
        messageType: req.body.messageType || 'text',
        metadata: req.body.metadata || null,
      });
      
      const message = await storage.createGroupMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating group message:", error);
      res.status(400).json({ message: "Failed to create group message" });
    }
  });

  app.get('/api/groups/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getGroupMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching group messages:", error);
      res.status(500).json({ message: "Failed to fetch group messages" });
    }
  });

  app.post('/api/groups/:id/messages/:messageId/reply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertGroupMessageSchema.parse({
        groupId: req.params.id,
        userId: userId,
        content: req.body.content,
        parentMessageId: req.params.messageId,
      });
      
      const message = await storage.createGroupMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating group reply:", error);
      res.status(400).json({ message: "Failed to create group reply" });
    }
  });

  app.post('/api/groups/:id/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markGroupMessageAsRead(req.params.messageId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking group message as read:", error);
      res.status(500).json({ message: "Failed to mark group message as read" });
    }
  });

  // Get unread message count for user
  app.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUserUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Get all unread counts for user's chats
  app.get('/api/chats/all-unread-counts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all groups user is a member of
      const userGroups = await storage.getUserGroups(userId);
      const groupCounts: Record<string, number> = {};
      
      for (const group of userGroups) {
        const count = await storage.getGroupUnreadCount(group.id, userId);
        groupCounts[`group:${group.id}`] = count;
      }
      
      // Get all events user has RSVP'd to
      const userEvents = await storage.getUserEvents(userId);
      const eventCounts: Record<string, number> = {};
      
      for (const event of userEvents) {
        const count = await storage.getEventUnreadCount(event.id, userId);
        eventCounts[`event:${event.id}`] = count;
      }
      
      res.json({ ...groupCounts, ...eventCounts });
    } catch (error) {
      console.error("Error fetching all unread counts:", error);
      res.status(500).json({ message: "Failed to fetch unread counts" });
    }
  });

  // Mark all messages in a group as read
  app.post('/api/groups/:id/messages/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.id;
      await storage.markAllGroupMessagesAsRead(groupId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking group messages as read:", error);
      res.status(500).json({ message: "Failed to mark group messages as read" });
    }
  });

  // Mark all messages in an event as read
  app.post('/api/events/:id/messages/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      await storage.markAllEventMessagesAsRead(eventId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking event messages as read:", error);
      res.status(500).json({ message: "Failed to mark event messages as read" });
    }
  });

  // Get unread count for specific group
  app.get('/api/groups/:id/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.id;
      const count = await storage.getGroupUnreadCount(groupId, userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching group unread count:", error);
      res.status(500).json({ message: "Failed to fetch group unread count" });
    }
  });

  // Get unread count for specific event
  app.get('/api/events/:id/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventId = req.params.id;
      const count = await storage.getEventUnreadCount(eventId, userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching event unread count:", error);
      res.status(500).json({ message: "Failed to fetch event unread count" });
    }
  });

  // Get all unread counts for user's chats
  app.get('/api/chats/all-unread-counts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all groups user is a member of
      const userGroups = await storage.getUserGroups(userId);
      const groupCounts: Record<string, number> = {};
      
      for (const group of userGroups) {
        const count = await storage.getGroupUnreadCount(group.id, userId);
        groupCounts[`group:${group.id}`] = count;
      }
      
      // Get all events user has RSVP'd to
      const userEvents = await storage.getUserEvents(userId);
      const eventCounts: Record<string, number> = {};
      
      for (const event of userEvents) {
        const count = await storage.getEventUnreadCount(event.id, userId);
        eventCounts[`event:${event.id}`] = count;
      }
      
      res.json({ ...groupCounts, ...eventCounts });
    } catch (error) {
      console.error("Error fetching all unread counts:", error);
      res.status(500).json({ message: "Failed to fetch unread counts" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Group invite routes
  app.post('/api/groups/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.id;
      
      // Check if user is a member of the group (not just admin)
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const isMember = await storage.isGroupMember(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Only group members can create invites" });
      }
      
      // Return the group's permanent invite information
      res.status(201).json({
        inviteCode: group.inviteCode,
        groupId: group.id,
        groupName: group.name,
        inviteUrl: `${req.protocol}://${req.hostname}/invite/${group.inviteCode}`,
      });
    } catch (error) {
      console.error("Error getting invite:", error);
      res.status(400).json({ message: "Failed to get invite" });
    }
  });

  app.get('/api/groups/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.id;
      
      // Check if user is a member of the group (not just admin)
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const isMember = await storage.isGroupMember(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "Only group members can view invites" });
      }
      
      // Return the group's permanent invite information
      res.json([{
        inviteCode: group.inviteCode,
        groupId: group.id,
        groupName: group.name,
        inviteUrl: `${req.protocol}://${req.hostname}/invite/${group.inviteCode}`,
        status: 'active',
        createdAt: group.createdAt,
      }]);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.post('/api/invites/:code/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteCode = req.params.code;
      
      const member = await storage.acceptGroupInvite(inviteCode, userId);
      res.json(member);
    } catch (error) {
      console.error("Error accepting invite:", error);
      const message = error instanceof Error ? error.message : "Failed to accept invite";
      res.status(400).json({ message });
    }
  });

  // Delete/expire an invite
  app.delete('/api/invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteId = req.params.id;
      
      // Permanent invites cannot be deleted - they persist with the group
      return res.status(400).json({ message: "Permanent invites cannot be deleted" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  app.get('/api/invites/:code', async (req: any, res) => {
    try {
      const inviteCode = req.params.code;
      const group = await storage.getGroupByInviteCode(inviteCode);
      
      if (!group) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      res.json({ 
        invite: {
          inviteCode: group.inviteCode,
          groupId: group.id,
          status: 'active'
        },
        group 
      });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  // Event photo routes
  app.get('/api/events/:eventId/photos', isAuthenticated, async (req: any, res) => {
    try {
      const photos = await storage.getEventPhotos(req.params.eventId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching event photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post('/api/events/:eventId/photos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoData = insertEventPhotoSchema.parse({
        ...req.body,
        eventId: req.params.eventId,
        uploadedBy: userId,
      });
      const photo = await storage.addEventPhoto(photoData);
      res.json(photo);
    } catch (error) {
      console.error("Error adding event photo:", error);
      res.status(500).json({ message: "Failed to add photo" });
    }
  });

  app.delete('/api/photos/:photoId', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteEventPhoto(req.params.photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Event diary routes
  app.get('/api/events/:eventId/diary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const diary = await storage.getEventDiary(req.params.eventId, userId);
      res.json(diary);
    } catch (error) {
      console.error("Error fetching diary:", error);
      res.status(500).json({ message: "Failed to fetch diary" });
    }
  });

  app.get('/api/events/:eventId/diaries', isAuthenticated, async (req: any, res) => {
    try {
      const diaries = await storage.getEventDiaries(req.params.eventId);
      res.json(diaries);
    } catch (error) {
      console.error("Error fetching diaries:", error);
      res.status(500).json({ message: "Failed to fetch diaries" });
    }
  });

  app.put('/api/events/:eventId/diary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const diaryData = insertEventDiarySchema.parse({
        ...req.body,
        eventId: req.params.eventId,
        userId: userId,
      });
      const diary = await storage.upsertEventDiary(diaryData);
      res.json(diary);
    } catch (error) {
      console.error("Error saving diary:", error);
      res.status(500).json({ message: "Failed to save diary" });
    }
  });

  app.delete('/api/events/:eventId/diary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteEventDiary(req.params.eventId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting diary:", error);
      res.status(500).json({ message: "Failed to delete diary" });
    }
  });

  // Event rating routes
  app.get('/api/events/:eventId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rating = await storage.getEventRating(req.params.eventId, userId);
      res.json(rating);
    } catch (error) {
      console.error("Error fetching rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  app.get('/api/events/:eventId/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const ratings = await storage.getEventRatings(req.params.eventId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  app.get('/api/events/:eventId/average-rating', isAuthenticated, async (req: any, res) => {
    try {
      const averageRating = await storage.getEventAverageRating(req.params.eventId);
      res.json(averageRating);
    } catch (error) {
      console.error("Error fetching average rating:", error);
      res.status(500).json({ message: "Failed to fetch average rating" });
    }
  });

  app.put('/api/events/:eventId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ratingData = insertEventRatingSchema.parse({
        ...req.body,
        eventId: req.params.eventId,
        userId: userId,
      });
      const rating = await storage.upsertEventRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error saving rating:", error);
      res.status(500).json({ message: "Failed to save rating" });
    }
  });

  app.delete('/api/events/:eventId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteEventRating(req.params.eventId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting rating:", error);
      res.status(500).json({ message: "Failed to delete rating" });
    }
  });

  // AI Recommendation routes
  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const location = req.query.location || "current area";
      
      // Get user's dining history from events and ratings
      const userEvents = await storage.getUserEvents(userId);
      const userRatings = await storage.getUserRatings(userId);
      
      // Build user preferences object
      const userPreferences: UserPreferences = {
        userId,
        ratedRestaurants: userRatings.map((rating: any) => ({
          restaurantName: rating.event?.restaurantName || rating.event?.name || 'Unknown',
          rating: rating.rating,
          cuisine: 'Various', // Could be enhanced with restaurant data
          location: rating.event?.restaurantAddress
        })),
        visitHistory: userEvents.reduce((acc: any[], event: any) => {
          const existing = acc.find(item => item.restaurantName === (event.restaurantName || event.name));
          if (existing) {
            existing.visitCount++;
            existing.lastVisit = new Date(event.dateTime);
          } else {
            acc.push({
              restaurantName: event.restaurantName || event.name,
              visitCount: 1,
              lastVisit: new Date(event.dateTime),
              cuisine: 'Various'
            });
          }
          return acc;
        }, []),
        preferredCuisines: [], // Could be enhanced with cuisine analysis
        pricePreference: "moderate" as const,
        locationPreference: location as string
      };
      
      // Generate AI recommendations
      // Default location (Atlanta, GA) - in production this could be user's location
      const latitude = 33.7490;
      const longitude = -84.3880;
      const recommendations = await generateRestaurantRecommendations(userPreferences, location as string, latitude, longitude);
      
      // Enrich with external reviews
      const enrichedRecommendations = await enrichWithExternalReviews(recommendations);
      
      res.json(enrichedRecommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Custom recommendation endpoint for users
  app.post('/api/recommendations/custom', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences: CustomPreferences = req.body;
      
      // Get user's historical data for personalization
      const userEvents = await storage.getUserEvents(userId);
      const userRatings = await storage.getUserRatings(userId);
      
      const userHistory: UserPreferences = {
        userId,
        ratedRestaurants: userRatings.map((rating: any) => ({
          restaurantName: rating.event?.restaurantName || rating.event?.name || 'Unknown',
          rating: rating.rating,
          cuisine: 'Various',
          location: rating.event?.restaurantAddress
        })),
        visitHistory: userEvents.reduce((acc: any[], event: any) => {
          const existing = acc.find(item => item.restaurantName === (event.restaurantName || event.name));
          if (existing) {
            existing.visitCount++;
            existing.lastVisit = new Date(event.dateTime);
          } else {
            acc.push({
              restaurantName: event.restaurantName || event.name,
              visitCount: 1,
              lastVisit: new Date(event.dateTime),
              cuisine: 'Various'
            });
          }
          return acc;
        }, []),
        preferredCuisines: [],
        pricePreference: "moderate" as const
      };
      
      // Default location (Atlanta, GA) - in production this could be user's location
      const latitude = 33.7490;
      const longitude = -84.3880;
      const recommendations = await generateCustomRecommendations(preferences, userHistory, latitude, longitude);
      
      res.json({ recommendations });
    } catch (error) {
      console.error("Error generating custom recommendations:", error);
      res.status(500).json({ message: "Failed to generate custom recommendations" });
    }
  });

  // Restaurant training routes
  app.get('/api/training/restaurants/:variant/:groupId?', isAuthenticated, async (req: any, res) => {
    try {
      console.log('=== TRAINING RESTAURANTS ENDPOINT CALLED ===');
      const { variant, groupId } = req.params;
      const userId = req.user?.claims?.sub;
      console.log('URL params:', { variant, groupId, userId });
      
      // Default location (Atlanta, GA) - in production this could be user's location
      const latitude = 33.7490;
      const longitude = -84.3880;
      const radius = 48280; // 30 miles radius
      
      console.log('About to call fetchNearbyRestaurants...');
      const restaurants = await fetchNearbyRestaurants(latitude, longitude, radius);
      
      console.log('Training restaurants fetched:', restaurants?.length || 0, 'restaurants');
      if (restaurants && restaurants.length > 0) {
        console.log('First restaurant:', restaurants[0]);
      }
      
      if (!restaurants || restaurants.length === 0) {
        console.log('No restaurants found from Google Places API, using fallback');
        // Fallback to sample Atlanta restaurants if Google Places fails
        const fallbackRestaurants = [
          {
            id: 'fallback-1',
            name: 'The Optimist',
            type: 'Seafood',
            priceRange: '$$$',
            description: 'West End • Rating: 4.4',
            rating: 4.4,
            address: 'West End'
          },
          {
            id: 'fallback-2',
            name: 'Gunshow',
            type: 'American',
            priceRange: '$$$$',
            description: 'Glenwood Park • Rating: 4.3',
            rating: 4.3,
            address: 'Glenwood Park'
          },
          {
            id: 'fallback-3',
            name: 'Staplehouse',
            type: 'New American',
            priceRange: '$$$$',
            description: 'Old Fourth Ward • Rating: 4.5',
            rating: 4.5,
            address: 'Old Fourth Ward'
          },
          {
            id: 'fallback-4',
            name: 'Lazy Betty',
            type: 'Contemporary',
            priceRange: '$$$$',
            description: 'Candler Park • Rating: 4.6',
            rating: 4.6,
            address: 'Candler Park'
          },
          {
            id: 'fallback-5',
            name: 'Bacchanalia',
            type: 'Contemporary American',
            priceRange: '$$$$',
            description: 'Westside • Rating: 4.2',
            rating: 4.2,
            address: 'Westside'
          }
        ];
        res.json(fallbackRestaurants);
        return;
      }

      res.json(restaurants);
    } catch (error) {
      console.error('Error getting training restaurants:', error);
      res.status(500).json({ message: 'Failed to get training restaurants' });
    }
  });

  app.post('/api/training/rate', isAuthenticated, async (req: any, res) => {
    try {
      const { restaurantId, rating, interest } = req.body;
      const userId = req.user?.claims?.sub;

      const trainingData = await storage.saveRestaurantTraining({
        userId,
        restaurantId,
        rating,
        interest
      });

      res.json(trainingData);
    } catch (error) {
      console.error('Error saving restaurant rating:', error);
      res.status(500).json({ message: 'Failed to save rating' });
    }
  });

  app.post('/api/training/group/:groupId/rate', isAuthenticated, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const { restaurantId, rating, interest } = req.body;
      const userId = req.user?.claims?.sub;

      const trainingData = await storage.saveRestaurantTraining({
        userId,
        groupId,
        restaurantId,
        rating,
        interest
      });

      res.json(trainingData);
    } catch (error) {
      console.error('Error saving group restaurant rating:', error);
      res.status(500).json({ message: 'Failed to save rating' });
    }
  });

  // Group-based custom recommendation endpoint
  app.post('/api/recommendations/group/:groupId/custom', isAuthenticated, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const preferences: CustomPreferences = req.body;
      
      // Get group's historical data
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const groupEvents = await storage.getGroupEvents(groupId);
      const groupMembers = await storage.getGroupMembers(groupId);
      
      // Build group history for AI analysis
      const groupHistory = {
        groupEvents: groupEvents.map((event: any) => ({
          restaurantName: event.restaurantName || event.name,
          rating: 4.0, // Would need to calculate average ratings per event
          cuisine: 'Various'
        })),
        memberPreferences: groupMembers.map((member: any) => ({
          preferredCuisines: ['Various'], // Would need user preference data
          pricePreference: 'moderate'
        }))
      };
      
      const recommendations = await generateGroupRecommendations(preferences, groupHistory);
      
      res.json({ recommendations });
    } catch (error) {
      console.error("Error generating group recommendations:", error);
      res.status(500).json({ message: "Failed to generate group recommendations" });
    }
  });

  app.get('/api/dining-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's dining data
      const userEvents = await storage.getUserEvents(userId);
      const userRatings = await storage.getUserRatings(userId);
      
      const userPreferences: UserPreferences = {
        userId,
        ratedRestaurants: userRatings.map((rating: any) => ({
          restaurantName: rating.event?.restaurantName || rating.event?.name || 'Unknown',
          rating: rating.rating,
          cuisine: 'Various',
          location: rating.event?.restaurantAddress
        })),
        visitHistory: userEvents.reduce((acc: any[], event: any) => {
          const existing = acc.find(item => item.restaurantName === (event.restaurantName || event.name));
          if (existing) {
            existing.visitCount++;
            existing.lastVisit = new Date(event.dateTime);
          } else {
            acc.push({
              restaurantName: event.restaurantName || event.name,
              visitCount: 1,
              lastVisit: new Date(event.dateTime),
              cuisine: 'Various'
            });
          }
          return acc;
        }, []),
        preferredCuisines: [],
        pricePreference: "moderate" as const
      };
      
      // Analyze dining patterns
      const analysis = await analyzeUserDiningPatterns(userPreferences);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing dining patterns:", error);
      res.status(500).json({ message: "Failed to analyze dining patterns" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
