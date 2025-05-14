'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { MessageSquare, Users, Zap, Shield } from 'lucide-react';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to the chat page
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/chat');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Connect and collaborate with your team in real-time
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Slacky is a modern chat application that helps teams stay connected and productive. Share messages, reactions, and more in a seamless experience.
                </p>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                </div>
              </div>
              <div className="mx-auto lg:order-last">
                <div className="rounded-lg border bg-background shadow-lg p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 border-b pb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium">Team Chat</h3>
                        <p className="text-sm text-muted-foreground">Connect with your team in real-time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-b pb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium">Group & Private Chats</h3>
                        <p className="text-sm text-muted-foreground">Create groups or chat one-on-one</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-b pb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium">Real-time Updates</h3>
                        <p className="text-sm text-muted-foreground">See when users are online and typing</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium">Secure Messaging</h3>
                        <p className="text-sm text-muted-foreground">Your conversations are protected</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-12 md:py-24 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Features</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to stay connected with your team
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <MessageSquare className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Group Chats</h3>
                <p className="text-center text-muted-foreground">
                  Create group conversations with multiple team members for project discussions.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <Users className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">User Presence</h3>
                <p className="text-center text-muted-foreground">
                  See when team members are online and available for conversation.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <Zap className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Message Reactions</h3>
                <p className="text-center text-muted-foreground">
                  React to messages with emojis to express your thoughts quickly.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-12 md:py-24 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to get started?</h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join thousands of teams already using Slacky to improve their communication.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" asChild>
                  <Link href="/auth/signup">Sign Up Now</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            u00a9 {new Date().getFullYear()} Slacky. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:underline">Terms</Link>
            <Link href="#" className="hover:underline">Privacy</Link>
            <Link href="#" className="hover:underline">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
