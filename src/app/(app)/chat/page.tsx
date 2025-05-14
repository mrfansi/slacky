'use client';

import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/chat/sidebar';
import { MessageView } from '@/components/chat/message-view';
import { Header } from '@/components/layout/header';

export default function ChatPage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/40 flex flex-col">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <MessageView />
        </div>
      </div>
    </div>
  );
}
