import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Groups table
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  photoUrl: varchar("photo_url"),
  inviteCode: varchar("invite_code", { length: 50 }),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group memberships
export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 50 }).notNull().default('member'), // 'admin' or 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  restaurantName: varchar("restaurant_name", { length: 255 }),
  restaurantAddress: text("restaurant_address"),
  restaurantImageUrl: varchar("restaurant_image_url"),
  restaurantPlaceId: varchar("restaurant_place_id"),
  restaurantLat: varchar("restaurant_lat"),
  restaurantLng: varchar("restaurant_lng"),
  dateTime: timestamp("date_time").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event RSVPs
export const eventRsvps = pgTable("event_rsvps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'confirmed', 'declined', 'maybe', 'pending'
  respondedAt: timestamp("responded_at").defaultNow(),
}, (table) => ({
  unique: unique().on(table.eventId, table.userId),
}));

// Restaurant suggestions
export const restaurantSuggestions = pgTable("restaurant_suggestions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  restaurantName: varchar("restaurant_name", { length: 255 }).notNull(),
  restaurantAddress: text("restaurant_address"),
  restaurantImageUrl: varchar("restaurant_image_url"),
  notes: text("notes"),
  votes: integer("votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages for event chats with threading support
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentMessageId: uuid("parent_message_id"), // For threading - handled in application layer
  messageType: varchar("message_type", { length: 50 }).notNull().default('text'), // 'text', 'restaurant_suggestion', 'system'
  metadata: jsonb("metadata"), // For storing additional data like restaurant info
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event message read status
export const messageReads = pgTable("message_reads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  unique: unique().on(table.messageId, table.userId),
}));

// Group chat messages with threading support
export const groupMessages = pgTable("group_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentMessageId: uuid("parent_message_id"), // For threading - handled in application layer
  messageType: varchar("message_type", { length: 50 }).notNull().default('text'), // 'text', 'restaurant_suggestion', 'system'
  metadata: jsonb("metadata"), // For storing additional data like restaurant info
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message read status for notification system
export const groupMessageReads = pgTable("group_message_reads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupMessageId: uuid("group_message_id").notNull().references(() => groupMessages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp("read_at").defaultNow(),
}, (table) => ({
  unique: unique().on(table.groupMessageId, table.userId),
}));

// Group invites table
export const groupInvites = pgTable("group_invites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: 'cascade' }),
  invitedBy: varchar("invited_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteCode: varchar("invite_code", { length: 100 }).notNull().unique(),
  invitedEmail: varchar("invited_email"),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'accepted', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  adminGroups: many(groups),
  groupMemberships: many(groupMembers),
  createdEvents: many(events),
  eventRsvps: many(eventRsvps),
  restaurantSuggestions: many(restaurantSuggestions),
  messages: many(messages),
  groupMessages: many(groupMessages),
  messageReads: many(messageReads),
  groupMessageReads: many(groupMessageReads),
  sentInvites: many(groupInvites, { relationName: 'sentInvites' }),
  acceptedInvites: many(groupInvites, { relationName: 'acceptedInvites' }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  admin: one(users, {
    fields: [groups.adminId],
    references: [users.id],
  }),
  members: many(groupMembers),
  events: many(events),
  invites: many(groupInvites),
  groupMessages: many(groupMessages),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  rsvps: many(eventRsvps),
  suggestions: many(restaurantSuggestions),
  messages: many(messages),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

export const restaurantSuggestionsRelations = relations(restaurantSuggestions, ({ one }) => ({
  event: one(events, {
    fields: [restaurantSuggestions.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [restaurantSuggestions.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  event: one(events, {
    fields: [messages.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  reads: many(messageReads),
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  message: one(messages, {
    fields: [messageReads.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReads.userId],
    references: [users.id],
  }),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupMessages.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMessages.userId],
    references: [users.id],
  }),
  reads: many(groupMessageReads),
}));

export const groupMessageReadsRelations = relations(groupMessageReads, ({ one }) => ({
  groupMessage: one(groupMessages, {
    fields: [groupMessageReads.groupMessageId],
    references: [groupMessages.id],
  }),
  user: one(users, {
    fields: [groupMessageReads.userId],
    references: [users.id],
  }),
}));

export const groupInvitesRelations = relations(groupInvites, ({ one }) => ({
  group: one(groups, {
    fields: [groupInvites.groupId],
    references: [groups.id],
  }),
  inviter: one(users, {
    fields: [groupInvites.invitedBy],
    references: [users.id],
    relationName: 'sentInvites',
  }),
  acceptedByUser: one(users, {
    fields: [groupInvites.acceptedBy],
    references: [users.id],
    relationName: 'acceptedInvites',
  }),
}));

// Zod schemas for validation
export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dateTime: z.string().transform((str) => new Date(str)),
});

export const insertRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  respondedAt: true,
});

export const insertSuggestionSchema = createInsertSchema(restaurantSuggestions).omit({
  id: true,
  votes: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageReadSchema = createInsertSchema(messageReads).omit({
  id: true,
  readAt: true,
});

export const insertGroupMessageReadSchema = createInsertSchema(groupMessageReads).omit({
  id: true,
  readAt: true,
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertGroupInviteSchema = createInsertSchema(groupInvites).omit({
  id: true,
  status: true,
  acceptedAt: true,
  acceptedBy: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertRsvp = z.infer<typeof insertRsvpSchema>;
export type RestaurantSuggestion = typeof restaurantSuggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = z.infer<typeof insertMessageReadSchema>;
export type GroupMessageRead = typeof groupMessageReads.$inferSelect;
export type InsertGroupMessageRead = z.infer<typeof insertGroupMessageReadSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupInvite = typeof groupInvites.$inferSelect;
export type InsertGroupInvite = z.infer<typeof insertGroupInviteSchema>;
