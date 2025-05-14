'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span className="font-bold text-xl">Slacky</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
