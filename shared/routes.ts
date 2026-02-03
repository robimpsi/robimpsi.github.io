import { z } from 'zod';
import { insertContactMessageSchema, contactMessages, postSchema, projectSchema } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts/index.json',
      responses: {
        200: z.array(postSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/posts/:slug.json',
      responses: {
        200: postSchema,
        404: errorSchemas.notFound,
      },
    },
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/index.json',
      responses: {
        200: z.array(projectSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:slug.json',
      responses: {
        200: projectSchema,
        404: errorSchemas.notFound,
      },
    },
  },
  contact: {
    create: {
      method: 'POST' as const,
      path: '/api/contact',
      input: insertContactMessageSchema,
      responses: {
        201: z.custom<typeof contactMessages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type PostResponse = z.infer<typeof api.posts.get.responses[200]>;
export type ProjectResponse = z.infer<typeof api.projects.get.responses[200]>;
export type ContactInput = z.infer<typeof api.contact.create.input>;
