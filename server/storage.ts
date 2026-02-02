import { users, type User, type InsertUser, type ContactMessage, type InsertContactMessage, contactMessages, type Post, type Project } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export interface IStorage {
  // Contact Messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  
  // Blog Posts (File-based)
  getPosts(): Promise<Post[]>;
  getPost(slug: string): Promise<Post | undefined>;
  
  // Projects (File-based)
  getProjects(): Promise<Project[]>;
  getProject(slug: string): Promise<Project | undefined>;
}

export class DatabaseStorage implements IStorage {
  // === Contact Messages ===
  async createContactMessage(insertMessage: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await db
      .insert(contactMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  // === Posts ===
  async getPosts(): Promise<Post[]> {
    const postsDir = path.join(process.cwd(), "content", "posts");
    try {
      const files = await fs.readdir(postsDir);
      const posts = await Promise.all(
        files
          .filter(file => file.endsWith(".md"))
          .map(async (file) => {
            const slug = file.replace(".md", "");
            return this.getPost(slug);
          })
      );
      // Filter out undefined and sort by date descending
      return posts
        .filter((post): post is Post => post !== undefined)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.warn("Error reading posts directory:", error);
      return [];
    }
  }

  async getPost(slug: string): Promise<Post | undefined> {
    const filePath = path.join(process.cwd(), "content", "posts", `${slug}.md`);
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      return {
        slug,
        title: data.title,
        date: data.date,
        description: data.description,
        tags: data.tags,
        content: content,
      } as Post;
    } catch (error) {
      return undefined;
    }
  }

  // === Projects ===
  async getProjects(): Promise<Project[]> {
    const projectsDir = path.join(process.cwd(), "content", "projects");
    try {
      const files = await fs.readdir(projectsDir);
      const projects = await Promise.all(
        files
          .filter(file => file.endsWith(".md"))
          .map(async (file) => {
            const slug = file.replace(".md", "");
            return this.getProject(slug);
          })
      );
      return projects
        .filter((project): project is Project => project !== undefined)
        .sort((a, b) => {
           if (!a.date || !b.date) return 0;
           return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    } catch (error) {
       console.warn("Error reading projects directory:", error);
       return [];
    }
  }

  async getProject(slug: string): Promise<Project | undefined> {
    const filePath = path.join(process.cwd(), "content", "projects", `${slug}.md`);
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      return {
        slug,
        title: data.title,
        date: data.date,
        description: data.description,
        link: data.link,
        tags: data.tags,
        content: content,
      } as Project;
    } catch (error) {
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
