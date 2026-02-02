import { Layout } from "@/components/layout";
import { usePost } from "@/hooks/use-content";
import { useRoute } from "wouter";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, Clock } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostDetail() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const { data: post, isLoading, error } = usePost(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-12 w-3/4 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold font-display mb-4">Post Not Found</h1>
          <Button asChild>
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Calculate read time (rough estimate)
  const wordCount = post.content.split(/\s+/g).length;
  const readTime = Math.ceil(wordCount / 200);

  return (
    <Layout>
      <article className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Blog
          </Link>
          
          <header className="mb-12 text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {post.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="font-mono">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold font-display mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground font-mono">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {new Date(post.date).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {readTime} min read
              </div>
            </div>
          </header>
          
          <div className="prose prose-lg dark:prose-invert prose-headings:font-display prose-headings:font-bold prose-a:text-primary max-w-none">
            <ReactMarkdown>
              {post.content}
            </ReactMarkdown>
          </div>
          
          <div className="mt-16 pt-8 border-t border-border">
            <h3 className="font-display font-bold text-lg mb-4">Thanks for reading!</h3>
            <p className="text-muted-foreground mb-6">
              If you found this article helpful or have any questions, feel free to reach out.
            </p>
            <Button asChild>
              <Link href="/contact">Contact Me</Link>
            </Button>
          </div>
        </div>
      </article>
    </Layout>
  );
}
