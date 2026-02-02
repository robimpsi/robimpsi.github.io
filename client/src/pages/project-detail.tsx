import { Layout } from "@/components/layout";
import { useProject } from "@/hooks/use-content";
import { useRoute } from "wouter";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Github, Globe, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:slug");
  const slug = params?.slug || "";
  const { data: project, isLoading, error } = useProject(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-16 w-3/4 mb-6" />
          <Skeleton className="h-6 w-1/2 mb-12" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold font-display mb-4">Project Not Found</h1>
          <Button asChild>
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Projects
          </Link>
          
          <div className="mb-12 border-b border-border pb-12">
            <div className="flex flex-wrap gap-2 mb-6">
              {project.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="font-mono">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 leading-tight">
              {project.title}
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              {project.description}
            </p>
            
            <div className="flex flex-wrap items-center justify-between gap-6">
              {project.date && (
                <div className="flex items-center text-sm font-mono text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(project.date).toLocaleDateString()}
                </div>
              )}
              
              <div className="flex gap-4">
                {project.link && (
                  <Button asChild>
                    <a href={project.link} target="_blank" rel="noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Live Demo
                    </a>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href="#" target="_blank" rel="noreferrer">
                    <Github className="w-4 h-4 mr-2" />
                    View Source
                  </a>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="prose prose-lg dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-a:text-primary max-w-none">
            <ReactMarkdown>
              {project.content}
            </ReactMarkdown>
          </div>
        </div>
      </article>
    </Layout>
  );
}
