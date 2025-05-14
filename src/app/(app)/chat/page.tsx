'use client';

import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/chat/sidebar';
import { MessageView } from '@/components/chat/message-view';
import { UserMenu } from '@/components/auth/user-menu';
import { LogoutButton } from '@/components/auth/logout-button';

export default function ChatPage() {
  const { data: session } = useSession();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/40 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="font-bold text-xl">Slacky</h1>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <UserMenu />
          </div>
        </div>
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <MessageView />
      </div>
    </div>
  );
}
