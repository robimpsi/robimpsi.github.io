import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl, type ContactInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// POSTS (BLOG)
// ============================================

export function usePosts() {
  return useQuery({
    queryKey: [api.posts.list.path],
    queryFn: async () => {
      const res = await fetch(api.posts.list.path);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return api.posts.list.responses[200].parse(await res.json());
    },
  });
}

export function usePost(slug: string) {
  return useQuery({
    queryKey: [api.posts.get.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.posts.get.path, { slug });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Post not found");
      if (!res.ok) throw new Error("Failed to fetch post");
      return api.posts.get.responses[200].parse(await res.json());
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
      const res = await fetch(api.projects.list.path);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return api.projects.list.responses[200].parse(await res.json());
    },
  });
}

export function useProject(slug: string) {
  return useQuery({
    queryKey: [api.projects.get.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.projects.get.path, { slug });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("Project not found");
      if (!res.ok) throw new Error("Failed to fetch project");
      return api.projects.get.responses[200].parse(await res.json());
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
