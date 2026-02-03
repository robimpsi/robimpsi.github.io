import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function getPost(slug: string) {
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
    };
  } catch (error) {
    return undefined;
  }
}

async function getProject(slug: string) {
  const filePath = path.join(process.cwd(), "content", "projects", `${slug}.md`);
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    return {
      slug,
      title: data.title,
      date: data.date,
      description: data.description,
      tags: data.tags,
      link: data.link,
      content: content,
    };
  } catch (error) {
    return undefined;
  }
}

async function generate() {
  const publicApiDir = path.join(process.cwd(), "client", "public", "api");
  
  // Posts
  const postsDir = path.join(process.cwd(), "content", "posts");
  const postsApiDir = path.join(publicApiDir, "posts");
  await ensureDir(postsApiDir);
  
  const postFiles = await fs.readdir(postsDir);
  const posts = [];
  for (const file of postFiles) {
    if (file.endsWith(".md")) {
      const slug = file.replace(".md", "");
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
  const projectsDir = path.join(process.cwd(), "content", "projects");
  const projectsApiDir = path.join(publicApiDir, "projects");
  await ensureDir(projectsApiDir);
  
  const projectFiles = await fs.readdir(projectsDir);
  const projects = [];
  for (const file of projectFiles) {
    if (file.endsWith(".md")) {
      const slug = file.replace(".md", "");
      const project = await getProject(slug);
      if (project) {
        projects.push(project);
        await fs.writeFile(path.join(projectsApiDir, `${slug}.json`), JSON.stringify(project, null, 2));
      }
    }
  }
  projects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await fs.writeFile(path.join(projectsApiDir, "index.json"), JSON.stringify(projects, null, 2));
  console.log(`Generated ${projects.length} projects`);
}

generate().catch(console.error);
