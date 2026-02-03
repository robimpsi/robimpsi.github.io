import { postSchema, projectSchema } from "@shared/schema";
import { z } from "zod";

const schemas = {
  posts: postSchema,
  projects: projectSchema,
};

type CollectionMap = typeof schemas;

// Use import.meta.glob to load all markdown files in the content directory
const contentFiles = import.meta.glob("../content/**/*.md", { eager: true });

export async function getCollection<T extends keyof CollectionMap>(
  collection: T
): Promise<Array<{ slug: string; data: z.infer<CollectionMap[T]>; body: string }>> {
  const schema = schemas[collection];
  const items = Object.entries(contentFiles)
    .filter(([path]) => path.includes(`content/${collection}/`))
    .map(([path, module]: [string, any]) => {
      try {
        const slug = path.split("/").pop()?.replace(".md", "") || "";
        const { data, body } = module;

        // Validate and transform data to match the schema
        const validatedData = schema.parse({
          ...data,
          // Ensure date is a string if it's a Date object
          date: data.date instanceof Date ? data.date.toISOString() : data.date,
          // Ensure tags is an array if it's a single string
          tags: typeof data.tags === 'string' ? [data.tags] : data.tags,
          slug,
          content: body,
        });

        return {
          slug,
          data: validatedData,
          body,
        };
      } catch (err) {
        console.error(`Error parsing ${path}:`, err);
        return null;
      }
    })
    .filter(Boolean);

  // Sort by date if available
  return (items as any).sort((a: any, b: any) => {
    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
    return dateB - dateA;
  });
}

export async function getEntry<T extends keyof CollectionMap>(
  collection: T,
  slug: string
): Promise<{ slug: string; data: z.infer<CollectionMap[T]>; body: string } | undefined> {
  const items = await getCollection(collection);
  return items.find((item) => item.slug === slug) as any;
}
