import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS (DB) ===
// Only for contact messages, since content is file-based via PagesCMS
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ 
  id: true, 
  createdAt: true 
});

// === FILE-BASED CONTENT TYPES ===
// These define the shape of the frontmatter we expect from Markdown files
export const postSchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string(), // HTML or Markdown content
});

export const projectSchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  tags: z.array(z.string()).optional(),
  content: z.string(),
});

// === EXPLICIT API CONTRACT TYPES ===
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

export type Post = z.infer<typeof postSchema>;
export type Project = z.infer<typeof projectSchema>;

// Response types
export type PostListResponse = Post[];
export type ProjectListResponse = Project[];
