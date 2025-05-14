"use client";

import { Sidebar } from "@/components/chat/sidebar";
import { MessageView } from "@/components/chat/message-view";
import { MessageInput } from "@/components/chat/message-input";

export default function Home() {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <MessageView />
        <MessageInput />
      </div>
    </div>
  );
}
