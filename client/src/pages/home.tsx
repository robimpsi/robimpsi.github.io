import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, BarChart2, Database, LineChart, Download } from "lucide-react";
import { usePosts, useProjects } from "@/hooks/use-content";
import { ProjectCard } from "@/components/project-card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function Home() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: posts, isLoading: postsLoading } = usePosts();

  const featuredProjects = projects?.slice(0, 2) || [];
  const recentPosts = posts?.slice(0, 3) || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden grid-bg">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-6 font-mono bg-background/50 backdrop-blur">
                Retail Data Analyst
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight mb-6">
                Turning complex data into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">business insights.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                I help retail businesses optimize inventory and understand customer behavior through advanced analytics, Python, and visualization.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild className="h-12 px-8 text-base">
                  <Link href="/projects">View Projects</Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 text-base group">
                  <Download className="mr-2 w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  Download CV
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full hidden lg:block opacity-5 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.3,82.2,22.9,71.1,34.4C60,45.9,49.1,55.3,37.1,62.6C25.1,69.9,12,75.1,-1.8,78.2C-15.6,81.3,-30.1,82.3,-43.3,76.5C-56.5,70.7,-68.4,58.1,-76.3,44.1C-84.2,30.1,-88.1,14.7,-86.3,0.3C-84.5,-14.1,-77,-27.6,-67.2,-39.2C-57.4,-50.8,-45.3,-60.5,-32.4,-68.4C-19.5,-76.3,-5.8,-82.4,4.2,-89.7L14.2,-97" transform="translate(100 100)" />
          </svg>
        </div>
      </section>

      {/* Skills Banner */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold font-display">Data Viz</h3>
                <p className="text-sm text-muted-foreground">Tableau & PowerBI</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg text-green-600 dark:text-green-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold font-display">SQL & NoSQL</h3>
                <p className="text-sm text-muted-foreground">Postgres & Mongo</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg text-orange-600 dark:text-orange-400">
                <LineChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold font-display">Analysis</h3>
                <p className="text-sm text-muted-foreground">Pandas & NumPy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg text-purple-600 dark:text-purple-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold font-display">Python</h3>
                <p className="text-sm text-muted-foreground">Scripting & Auto</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold font-display mb-2">Featured Projects</h2>
              <p className="text-muted-foreground">Recent data analysis and visualization work.</p>
            </div>
            <Button variant="ghost" className="hidden md:flex" asChild>
              <Link href="/projects">View All <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>

          {projectsLoading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2].map(i => (
                <div key={i} className="h-96 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {featuredProjects.map(project => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          )}
          
          <div className="mt-8 md:hidden">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/projects">View All Projects</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold font-display mb-2">Latest Thoughts</h2>
              <p className="text-muted-foreground">Articles on data science and retail analytics.</p>
            </div>
            <Button variant="ghost" className="hidden md:flex" asChild>
              <Link href="/blog">Read All <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {postsLoading ? (
               [1, 2, 3].map(i => (
                 <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
               ))
            ) : (
              recentPosts.map(post => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                  <article className="h-full bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(post.date).toLocaleDateString()}
                      </span>
                      {post.tags?.[0] && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {post.tags[0]}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-xl mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {post.description}
                    </p>
                    <div className="mt-4 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                      Read Article <ArrowRight className="ml-2 w-3 h-3" />
                    </div>
                  </article>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
