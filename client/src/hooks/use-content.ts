import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type ContactInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getCollection, getEntry } from "@/lib/content";

// ============================================
// POSTS (BLOG)
// ============================================

export function usePosts() {
  return useQuery({
    queryKey: [api.posts.list.path],
    queryFn: async () => {
      const posts = await getCollection("posts");
      return posts.map(p => p.data);
    },
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: [api.posts.get.path, slug],
    queryFn: async () => {
      const post = await getEntry("posts", slug);
      if (!post) throw new Error("Post not found");
      return post.data;
    },
    enabled: !!slug,
  });
}

// ============================================
// PROJECTS (PORTFOLIO)
// ============================================

export function useProjects() {
  return useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async () => {
      const projects = await getCollection("projects");
      return projects.map(p => p.data);
    },
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: [api.projects.get.path, slug],
    queryFn: async () => {
      const project = await getEntry("projects", slug);
      if (!project) throw new Error("Project not found");
      return project.data;
    },
    enabled: !!slug,
  });
}

// ============================================
// CONTACT FORM
// ============================================

export function useContactMutation() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: ContactInput) => {
      // In a static site, we don't have a backend to handle form submissions.
      // We'll simulate a delay and return success.
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 1, ...data, createdAt: new Date().toISOString() };
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "Thanks for reaching out. I'll get back to you soon.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
