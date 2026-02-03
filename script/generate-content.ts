import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

async function ensureDir(dir: string) {
  console.log(`Ensuring directory exists: ${dir}`);
  await fs.mkdir(dir, { recursive: true });
}

async function getPost(slug: string) {
  const filePath = path.join(process.cwd(), "content", "posts", `${slug}.md`);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    // Validation
    if (!data.title) {
      console.warn(`Warning: Post ${slug} is missing title frontmatter`);
    }
    if (!data.date) {
      console.warn(`Warning: Post ${slug} is missing date frontmatter`);
    }

    return {
      slug,
      title: data.title || "Untitled",
      date: data.date || new Date().toISOString(),
      description: data.description || "",
      tags: data.tags || [],
      content: content,
    };
  } catch (error) {
    console.error(`Error processing post ${slug}:`, error);
    return undefined;
  }
}

async function getProject(slug: string) {
  const filePath = path.join(process.cwd(), "content", "projects", `${slug}.md`);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    // Validation
    if (!data.title) {
      console.warn(`Warning: Project ${slug} is missing title frontmatter`);
    }

    return {
      slug,
      title: data.title || "Untitled Project",
      date: data.date || new Date().toISOString(),
      description: data.description || "",
      tags: data.tags || [],
      link: data.link || "",
      content: content,
    };
  } catch (error) {
    console.error(`Error processing project ${slug}:`, error);
    return undefined;
  }
}

async function generate() {
  console.log("Starting static content generation...");
  const publicApiDir = path.join(process.cwd(), "client", "public", "api");
  
  // Posts
  console.log("Processing posts...");
  const postsDir = path.join(process.cwd(), "content", "posts");
  const postsApiDir = path.join(publicApiDir, "posts");
  await ensureDir(postsApiDir);
  
  const postFiles = await fs.readdir(postsDir);
  const posts = [];
  for (const file of postFiles) {
    if (file.endsWith(".md")) {
      const slug = file.replace(".md", "");
      console.log(`- Processing post: ${slug}`);
      const post = await getPost(slug);
      if (post) {
        posts.push(post);
        await fs.writeFile(path.join(postsApiDir, `${slug}.json`), JSON.stringify(post, null, 2));
      }
    }
  }
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await fs.writeFile(path.join(postsApiDir, "index.json"), JSON.stringify(posts, null, 2));
  console.log(`Generated ${posts.length} posts`);

  // Projects
  console.log("Processing projects...");
  const projectsDir = path.join(process.cwd(), "content", "projects");
  const projectsApiDir = path.join(publicApiDir, "projects");
  await ensureDir(projectsApiDir);
  
  const projectFiles = await fs.readdir(projectsDir);
  const projects = [];
  for (const file of projectFiles) {
    if (file.endsWith(".md")) {
      const slug = file.replace(".md", "");
      console.log(`- Processing project: ${slug}`);
      const project = await getProject(slug);
      if (project) {
        projects.push(project);
        await fs.writeFile(path.join(projectsApiDir, `${slug}.json`), JSON.stringify(project, null, 2));
      }
    }
  }
  projects.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  await fs.writeFile(path.join(projectsApiDir, "index.json"), JSON.stringify(projects, null, 2));
  console.log(`Generated ${projects.length} projects`);
  console.log("Static content generation complete!");
}

generate().catch((err) => {
  console.error("FATAL ERROR during content generation:", err);
  process.exit(1);
});
