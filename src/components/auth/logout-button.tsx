'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
    </Button>
  );
}
