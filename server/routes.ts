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
      
      // Check if user is admin of the group
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== userId) {
        return res.status(403).json({ message: "Only group admins can create invites" });
      }
      
      const inviteCode = nanoid(12);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
      
      const inviteData = insertGroupInviteSchema.parse({
        groupId,
        invitedBy: userId,
        inviteCode,
        invitedEmail: req.body.email || null, // Email is optional
        expiresAt,
      });
      
      const invite = await storage.createGroupInvite(inviteData);
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(400).json({ message: "Failed to create invite" });
    }
  });

  app.get('/api/groups/:id/invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = req.params.id;
      
      // Check if user is admin of the group
      const group = await storage.getGroup(groupId);
      if (!group || group.adminId !== userId) {
        return res.status(403).json({ message: "Only group admins can view invites" });
      }
      
      const invites = await storage.getGroupInvites(groupId);
      res.json(invites);
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
      
      // Get all invites to find the one with this ID (we need a better method)
      // For now, we'll try all groups the user has access to
      const userGroups = await storage.getUserGroups(userId);
      let invite = null;
      
      for (const group of userGroups) {
        const groupInvites = await storage.getGroupInvites(group.id);
        const foundInvite = groupInvites.find(i => i.id === inviteId);
        if (foundInvite) {
          invite = foundInvite;
          break;
        }
      }
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if user is the one who created the invite or group admin
      if (invite.invitedBy !== userId) {
        const group = await storage.getGroup(invite.groupId);
        if (!group || group.adminId !== userId) {
          return res.status(403).json({ message: "Only invite creator or group admin can delete invites" });
        }
      }
      
      await storage.expireInvite(inviteId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  app.get('/api/invites/:code', async (req: any, res) => {
    try {
      const inviteCode = req.params.code;
      const invite = await storage.getGroupInviteByCode(inviteCode);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found or expired" });
      }
      
      const group = await storage.getGroup(invite.groupId);
      res.json({ invite, group });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ message: "Failed to fetch invite" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
