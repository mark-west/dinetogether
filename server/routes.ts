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
} from "@shared/schema";
import { sendEventUpdateNotifications } from "./emailService";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const events = await storage.getUserEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      
      // Send notifications to RSVP'd users about event changes (non-blocking)
      if (rsvps.length > 0) {
        sendEventUpdateNotifications(updatedEvent!, rsvps, 'updated').catch(error => {
          console.error('Email notification failed but event update succeeded:', error);
        });
      }
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      
      // Send notifications to RSVP'd users about event cancellation (non-blocking)
      if (rsvps.length > 0) {
        sendEventUpdateNotifications(event, rsvps, 'cancelled').catch(error => {
          console.error('Email notification failed but event deletion succeeded:', error);
        });
      }
      
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const groupId = req.params.id;
      
      // Check if user is admin of the group
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== userId) {
        return res.status(403).json({ message: "Only group admins can create invites" });
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
      const userId = req.user.id;
      const groupId = req.params.id;
      
      // Check if user is admin of the group
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== userId) {
        return res.status(403).json({ message: "Only group admins can view invites" });
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  const httpServer = createServer(app);
  return httpServer;
}
