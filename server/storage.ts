import {
  users,
  groups,
  groupMembers,
  events,
  eventRsvps,
  restaurantSuggestions,
  messages,
  messageReads,
  groupMessages,
  groupMessageReads,
  groupInvites,
  type User,
  type UpsertUser,
  type Group,
  type InsertGroup,
  type Event,
  type InsertEvent,
  type EventRsvp,
  type InsertRsvp,
  type RestaurantSuggestion,
  type InsertSuggestion,
  type Message,
  type InsertMessage,
  type GroupMessage,
  type InsertGroupMessage,
  type MessageRead,
  type InsertMessageRead,
  type GroupMessageRead,
  type InsertGroupMessageRead,
  type GroupMember,
  type InsertGroupMember,
  type GroupInvite,
  type InsertGroupInvite,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ne, isNull } from "drizzle-orm";

// Helper function to generate invite codes
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: string): Promise<Group | undefined>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<void>;
  duplicateGroup(groupId: string, newName: string, adminId: string): Promise<Group>;
  getUserGroups(userId: string): Promise<Array<Group & { memberCount: number; role: string }>>;
  addGroupMember(membership: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<Array<GroupMember & { user: User }>>;
  getGroupEventsWithMemberRsvps(groupId: string): Promise<Array<Event & { memberRsvps: Array<{ user: User; rsvpStatus?: string; role: string }> }>>;
  
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
  getGroupEvents(groupId: string): Promise<Event[]>;
  getUserEvents(userId: string): Promise<Array<Event & { group: Group; rsvpStatus?: string }>>;
  getUpcomingEvents(userId: string): Promise<Array<Event & { group: Group; rsvpStatus?: string; attendeeCount: number }>>;
  getEventWithRsvps(eventId: string): Promise<{ event: Event; rsvps: Array<EventRsvp & { user: User }> } | undefined>;
  
  // RSVP operations
  upsertRsvp(rsvp: InsertRsvp): Promise<EventRsvp>;
  getEventRsvps(eventId: string): Promise<Array<EventRsvp & { user: User }>>;
  getUserRsvp(eventId: string, userId: string): Promise<EventRsvp | undefined>;
  
  // Restaurant suggestion operations
  createSuggestion(suggestion: InsertSuggestion): Promise<RestaurantSuggestion>;
  getEventSuggestions(eventId: string): Promise<Array<RestaurantSuggestion & { user: User }>>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getEventMessages(eventId: string): Promise<Array<Message & { user: User; replies?: Array<Message & { user: User }> }>>;
  markMessageAsRead(messageId: string, userId: string): Promise<void>;
  
  // Group message operations
  createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMessages(groupId: string): Promise<Array<GroupMessage & { user: User; replies?: Array<GroupMessage & { user: User }> }>>;
  markGroupMessageAsRead(messageId: string, userId: string): Promise<void>;
  getUserUnreadCount(userId: string): Promise<number>;
  
  // Dashboard/stats operations
  getUserStats(userId: string): Promise<{
    groupCount: number;
    eventCount: number;
    attendedCount: number;
    averageRating: number;
  }>;
  
  // Group invite operations
  getGroupByInviteCode(inviteCode: string): Promise<Group | undefined>;
  acceptGroupInvite(inviteCode: string, userId: string): Promise<GroupMember>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Group operations
  async createGroup(groupData: InsertGroup): Promise<Group> {
    // Generate invite code if not provided
    const groupWithInvite = {
      ...groupData,
      inviteCode: groupData.inviteCode || generateInviteCode(),
    };
    
    const [group] = await db.insert(groups).values(groupWithInvite).returning();
    
    // Add creator as admin member
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: groupData.adminId,
      role: 'admin',
    });
    
    return group;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined> {
    const [group] = await db
      .update(groups)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, id))
      .returning();
    return group;
  }

  async deleteGroup(id: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async duplicateGroup(groupId: string, newName: string, adminId: string): Promise<Group> {
    // Get the original group
    const originalGroup = await this.getGroup(groupId);
    if (!originalGroup) {
      throw new Error('Group not found');
    }

    // Create new group with copied data
    const newGroupData = {
      name: newName,
      description: originalGroup.description,
      photoUrl: originalGroup.photoUrl,
      adminId: adminId,
      inviteCode: generateInviteCode(),
    };

    const newGroup = await this.createGroup(newGroupData);

    // Copy all members from original group (except the admin who's already added)
    const originalMembers = await this.getGroupMembers(groupId);
    for (const member of originalMembers) {
      if (member.userId !== adminId) {
        await this.addGroupMember({
          groupId: newGroup.id,
          userId: member.userId,
          role: 'member', // All copied members become regular members
        });
      }
    }

    return newGroup;
  }

  async getUserGroups(userId: string): Promise<Array<Group & { memberCount: number; role: string }>> {
    const result = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        photoUrl: groups.photoUrl,
        inviteCode: groups.inviteCode,
        adminId: groups.adminId,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
        memberCount: sql<number>`count(distinct ${groupMembers.userId})`,
        role: groupMembers.role,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .groupBy(groups.id, groupMembers.role);
    
    return result;
  }

  async addGroupMember(membership: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values(membership).returning();
    return member;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: string): Promise<Array<GroupMember & { user: User }>> {
    const result = await db
      .select()
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));
    
    return result.map(row => ({
      ...row.group_members,
      user: row.users,
    }));
  }

  async getGroupEventsWithMemberRsvps(groupId: string): Promise<Array<Event & { memberRsvps: Array<{ user: User; rsvpStatus?: string; role: string }> }>> {
    // Get all events for the group
    const groupEvents = await this.getGroupEvents(groupId);
    
    // Get all group members
    const members = await this.getGroupMembers(groupId);
    
    // For each event, get all RSVPs and match with members
    const eventsWithRsvps = await Promise.all(
      groupEvents.map(async (event) => {
        const rsvps = await this.getEventRsvps(event.id);
        
        // Create a map of user ID to RSVP status
        const rsvpMap = new Map(rsvps.map(rsvp => [rsvp.userId, rsvp.status]));
        
        // Map all members with their RSVP status
        const memberRsvps = members.map(member => ({
          user: member.user,
          rsvpStatus: rsvpMap.get(member.userId),
          role: member.role,
        }));
        
        return {
          ...event,
          memberRsvps,
        };
      })
    );
    
    return eventsWithRsvps;
  }

  // Event operations
  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData).returning();
    return event;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getEventWithRsvps(eventId: string): Promise<{ event: Event; rsvps: Array<EventRsvp & { user: User }> } | undefined> {
    const event = await this.getEvent(eventId);
    if (!event) return undefined;
    
    const rsvps = await this.getEventRsvps(eventId);
    return { event, rsvps };
  }

  async getGroupEvents(groupId: string): Promise<Event[]> {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.groupId, groupId))
      .orderBy(desc(events.dateTime));
    
    return result;
  }

  async getUserEvents(userId: string): Promise<Array<Event & { group: Group; rsvpStatus?: string }>> {
    const result = await db
      .select({
        event: events,
        group: groups,
        rsvpStatus: eventRsvps.status,
      })
      .from(events)
      .innerJoin(groups, eq(events.groupId, groups.id))
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, userId)))
      .leftJoin(eventRsvps, and(eq(events.id, eventRsvps.eventId), eq(eventRsvps.userId, userId)))
      .orderBy(desc(events.dateTime));
    
    return result.map(row => ({
      ...row.event,
      group: row.group,
      rsvpStatus: row.rsvpStatus || undefined,
    }));
  }

  async getUpcomingEvents(userId: string): Promise<Array<Event & { group: Group; rsvpStatus?: string; attendeeCount: number }>> {
    const result = await db
      .select({
        event: events,
        group: groups,
        rsvpStatus: sql<string>`user_rsvp.status`,
        attendeeCount: sql<number>`count(distinct confirmed_rsvps.user_id)`,
      })
      .from(events)
      .innerJoin(groups, eq(events.groupId, groups.id))
      .innerJoin(groupMembers, and(eq(groups.id, groupMembers.groupId), eq(groupMembers.userId, userId)))
      .leftJoin(sql`${eventRsvps} as user_rsvp`, sql`${events.id} = user_rsvp.event_id AND user_rsvp.user_id = ${userId}`)
      .leftJoin(sql`${eventRsvps} as confirmed_rsvps`, sql`${events.id} = confirmed_rsvps.event_id AND confirmed_rsvps.status = 'confirmed'`)
      .where(sql`${events.dateTime} > now()`)
      .groupBy(events.id, groups.id, sql`user_rsvp.status`)
      .orderBy(events.dateTime)
      .limit(10);
    
    return result.map(row => ({
      ...row.event,
      group: row.group,
      rsvpStatus: row.rsvpStatus || undefined,
      attendeeCount: row.attendeeCount,
    }));
  }

  // RSVP operations
  async upsertRsvp(rsvpData: InsertRsvp): Promise<EventRsvp> {
    const [rsvp] = await db
      .insert(eventRsvps)
      .values(rsvpData)
      .onConflictDoUpdate({
        target: [eventRsvps.eventId, eventRsvps.userId],
        set: {
          status: rsvpData.status,
          respondedAt: new Date(),
        },
      })
      .returning();
    return rsvp;
  }

  async getEventRsvps(eventId: string): Promise<Array<EventRsvp & { user: User }>> {
    const result = await db
      .select()
      .from(eventRsvps)
      .innerJoin(users, eq(eventRsvps.userId, users.id))
      .where(eq(eventRsvps.eventId, eventId));
    
    return result.map(row => ({
      ...row.event_rsvps,
      user: row.users,
    }));
  }

  async getUserRsvp(eventId: string, userId: string): Promise<EventRsvp | undefined> {
    const [rsvp] = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
    return rsvp;
  }

  // Restaurant suggestion operations
  async createSuggestion(suggestionData: InsertSuggestion): Promise<RestaurantSuggestion> {
    const [suggestion] = await db.insert(restaurantSuggestions).values(suggestionData).returning();
    return suggestion;
  }

  async getEventSuggestions(eventId: string): Promise<Array<RestaurantSuggestion & { user: User }>> {
    const result = await db
      .select()
      .from(restaurantSuggestions)
      .innerJoin(users, eq(restaurantSuggestions.userId, users.id))
      .where(eq(restaurantSuggestions.eventId, eventId))
      .orderBy(desc(restaurantSuggestions.votes), desc(restaurantSuggestions.createdAt));
    
    return result.map(row => ({
      ...row.restaurant_suggestions,
      user: row.users,
    }));
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getEventMessages(eventId: string): Promise<Array<Message & { user: User; replies?: Array<Message & { user: User }> }>> {
    // Get all messages for the event
    const result = await db
      .select()
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.eventId, eventId))
      .orderBy(messages.createdAt);
    
    const messagesWithUsers = result.map(row => ({
      ...row.messages,
      user: row.users,
    }));

    // Organize into threads (top-level messages with replies)
    const messagesMap = new Map<string, Message & { user: User; replies: Array<Message & { user: User }> }>();
    const topLevelMessages: Array<Message & { user: User; replies: Array<Message & { user: User }> }> = [];

    // First pass: create map and identify top-level messages
    for (const message of messagesWithUsers) {
      const messageWithReplies = { ...message, replies: [] };
      messagesMap.set(message.id, messageWithReplies);
      
      if (!message.parentMessageId) {
        topLevelMessages.push(messageWithReplies);
      }
    }

    // Second pass: organize replies under parent messages
    for (const message of messagesWithUsers) {
      if (message.parentMessageId) {
        const parent = messagesMap.get(message.parentMessageId);
        if (parent) {
          parent.replies.push(message);
        }
      }
    }

    return topLevelMessages;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    await db
      .insert(messageReads)
      .values({ messageId, userId })
      .onConflictDoNothing();
  }

  // Group message operations
  async createGroupMessage(messageData: InsertGroupMessage): Promise<GroupMessage> {
    const [message] = await db.insert(groupMessages).values(messageData).returning();
    return message;
  }

  async getGroupMessages(groupId: string): Promise<Array<GroupMessage & { user: User; replies?: Array<GroupMessage & { user: User }> }>> {
    // Get all messages for the group
    const result = await db
      .select()
      .from(groupMessages)
      .innerJoin(users, eq(groupMessages.userId, users.id))
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(groupMessages.createdAt);
    
    const messagesWithUsers = result.map(row => ({
      ...row.group_messages,
      user: row.users,
    }));

    // Organize into threads (top-level messages with replies)
    const messagesMap = new Map<string, GroupMessage & { user: User; replies: Array<GroupMessage & { user: User }> }>();
    const topLevelMessages: Array<GroupMessage & { user: User; replies: Array<GroupMessage & { user: User }> }> = [];

    // First pass: create map and identify top-level messages
    for (const message of messagesWithUsers) {
      const messageWithReplies = { ...message, replies: [] };
      messagesMap.set(message.id, messageWithReplies);
      
      if (!message.parentMessageId) {
        topLevelMessages.push(messageWithReplies);
      }
    }

    // Second pass: organize replies under parent messages
    for (const message of messagesWithUsers) {
      if (message.parentMessageId) {
        const parent = messagesMap.get(message.parentMessageId);
        if (parent) {
          parent.replies.push(message);
        }
      }
    }

    return topLevelMessages;
  }

  async markGroupMessageAsRead(messageId: string, userId: string): Promise<void> {
    await db
      .insert(groupMessageReads)
      .values({ groupMessageId: messageId, userId })
      .onConflictDoNothing();
  }

  async getUserUnreadCount(userId: string): Promise<number> {
    // Count unread group messages
    const [groupResult] = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(groupMessages)
      .innerJoin(groupMembers, eq(groupMessages.groupId, groupMembers.groupId))
      .leftJoin(groupMessageReads, and(
        eq(groupMessageReads.groupMessageId, groupMessages.id),
        eq(groupMessageReads.userId, userId)
      ))
      .where(
        and(
          eq(groupMembers.userId, userId),
          ne(groupMessages.userId, userId), // Not sent by current user
          isNull(groupMessageReads.id) // Not marked as read
        )
      );

    // Count unread event messages
    const [eventResult] = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(messages)
      .innerJoin(events, eq(messages.eventId, events.id))
      .innerJoin(groupMembers, eq(events.groupId, groupMembers.groupId))
      .leftJoin(messageReads, and(
        eq(messageReads.messageId, messages.id),
        eq(messageReads.userId, userId)
      ))
      .where(
        and(
          eq(groupMembers.userId, userId),
          ne(messages.userId, userId), // Not sent by current user
          isNull(messageReads.id) // Not marked as read
        )
      );

    const groupCount = groupResult?.count || 0;
    const eventCount = eventResult?.count || 0;
    
    return groupCount + eventCount;
  }

  // Dashboard/stats operations
  async getUserStats(userId: string): Promise<{
    groupCount: number;
    eventCount: number;
    attendedCount: number;
    averageRating: number;
  }> {
    const [stats] = await db
      .select({
        groupCount: sql<number>`count(distinct ${groupMembers.groupId})`,
        eventCount: sql<number>`count(distinct ${events.id})`,
        attendedCount: sql<number>`count(distinct case when ${eventRsvps.status} = 'confirmed' and ${events.dateTime} < now() then ${events.id} end)`,
      })
      .from(groupMembers)
      .leftJoin(events, eq(groupMembers.groupId, events.groupId))
      .leftJoin(eventRsvps, and(eq(events.id, eventRsvps.eventId), eq(eventRsvps.userId, userId)))
      .where(eq(groupMembers.userId, userId));
    
    return {
      groupCount: stats.groupCount,
      eventCount: stats.eventCount,
      attendedCount: stats.attendedCount,
      averageRating: 4.8, // Mock for now
    };
  }

  // Group invite operations
  async getGroupByInviteCode(inviteCode: string): Promise<Group | undefined> {
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, inviteCode));
    return group;
  }

  async acceptGroupInvite(inviteCode: string, userId: string): Promise<GroupMember> {
    const group = await this.getGroupByInviteCode(inviteCode);
    if (!group) {
      throw new Error('Invalid invite code');
    }

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
      .limit(1);

    if (existingMember.length > 0) {
      throw new Error('You are already a member of this group');
    }

    // Add user as group member
    const [member] = await db.insert(groupMembers).values({
      groupId: group.id,
      userId: userId,
      role: 'member',
    }).returning();

    return member;
  }
}

export const storage = new DatabaseStorage();
