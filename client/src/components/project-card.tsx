import { Link } from "wouter";
import { type Project } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Calendar } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.slug}`} className="block group h-full">
      <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-primary/50 bg-card overflow-hidden">
        <div className="h-48 w-full bg-muted relative overflow-hidden">
          {/* Abstract Data Pattern for Thumbnails */}
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24 text-primary">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
          </div>
          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur px-2 py-1 rounded text-xs font-mono border shadow-sm">
            Analysis
          </div>
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-display font-bold text-xl group-hover:text-primary transition-colors">
              {project.title}
            </h3>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          {project.date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
              <Calendar className="w-3 h-3" />
              {new Date(project.date).toLocaleDateString()}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {project.description}
          </p>
        </CardContent>
        
        <CardFooter className="pt-2 flex flex-wrap gap-2">
          {project.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-mono text-xs font-normal">
              {tag}
            </Badge>
          ))}
          {project.tags && project.tags.length > 3 && (
            <span className="text-xs text-muted-foreground font-mono py-1">+{project.tags.length - 3}</span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
