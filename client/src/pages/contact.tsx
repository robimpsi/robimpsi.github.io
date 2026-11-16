import { Layout } from "@/components/layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactMessageSchema, type InsertContactMessage } from "@shared/schema";
import { useContactMutation } from "@/hooks/use-content";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MapPin, Linkedin, Github } from "lucide-react";

export default function Contact() {
  const mutation = useContactMutation();

  const form = useForm<InsertContactMessage>({
    resolver: zodResolver(insertContactMessageSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(data: InsertContactMessage) {
    const subject = encodeURIComponent(`Contact from ${data.name}`);
    const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`);
    window.location.href = `mailto:robi@example.com?subject=${subject}&body=${body}`;
    
    mutation.mutate(data, {
      onSuccess: () => form.reset(),
    });
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-6">Get In Touch</h1>
          <p className="text-lg text-muted-foreground">
            Have a question about my analysis, or interested in collaborating on a project? 
            Send me a message below.
          </p>
        </div>

        <div className="max-w-5xl mx-auto mb-16 text-left">
          <h2 className="text-3xl font-bold font-display mb-4">About Me</h2>
          <p className="text-muted-foreground leading-relaxed">
            My name is Robi Maulana. I am based in Bengkulu, Indonesia. I work as an Operations Analyst and I am looking for remote work as a Data Operations Specialist or Admin Data Entry.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            I clean and process large data using Google Sheets and Excel. I am not a coder. I do not know Python. My strength is being careful, reliable with fixed hours, and cleaning data with more than 99.5 percent accuracy.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            I am ready to work for US or Asia Pacific teams with clear schedules and simple written communication.
          </p>
          <h3 className="font-bold font-display mb-2 mt-6">What I Can Do</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Clean messy data in Google Sheets and Excel (remove extra spaces, fix capitalization, split names and addresses)</li>
            <li>Combine data from multiple files using XLOOKUP, INDEX/MATCH, and SUMIFS</li>
            <li>Make pivot tables and simple summaries for daily or weekly reports</li>
            <li>Clean and standardize customer, order, and inventory data for CRM</li>
            <li>Check and verify data entry accuracy before submission</li>
          </ul>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold font-display mb-1">Email</h3>
                  <a href="mailto:robi@example.com" className="text-muted-foreground hover:text-primary transition-colors">
                    [email protected]
                  </a>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold font-display mb-1">Location</h3>
                  <p className="text-muted-foreground">
                    Jakarta, Indonesia
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-4">
              <Button variant="outline" className="w-full" asChild>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Github className="w-4 h-4 mr-2" /> GitHub
                </a>
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell me about your project..." 
                              className="min-h-[150px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
