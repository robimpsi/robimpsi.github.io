import { Layout } from "@/components/layout";
import { usePosts } from "@/hooks/use-content";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, User } from "lucide-react";

export default function Blog() {
  const { data: posts, isLoading } = usePosts();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-6">Blog</h1>
          <p className="text-lg text-muted-foreground">
            Thoughts, tutorials, and insights about data analysis, retail trends, and technology.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))
          ) : (
            posts?.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
                <Card className="hover:border-primary/50 transition-colors duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Robi Maulana
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold font-display group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6 line-clamp-2">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {post.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="font-normal text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <span className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                        Read more <ArrowRight className="ml-1 w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
