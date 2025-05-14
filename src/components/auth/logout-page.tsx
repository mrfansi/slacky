'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

export default function LogoutPage() {
  // Automatically trigger logout when this page is loaded
  useEffect(() => {
    const performLogout = async () => {
      await signOut({ redirect: false });
      // We don't redirect here to show the success message
    };
    
    performLogout();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Logged Out</CardTitle>
          <CardDescription className="text-center">
            You have been successfully logged out
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <LogOut className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-center mb-4">
            Thank you for using Slacky. You have been securely logged out of your account.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/auth/signin">Sign In Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
