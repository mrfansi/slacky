"use client";

import { Sidebar } from "./sidebar";
import { MessageView } from "./message-view";
import { MessageInput } from "./message-input";

export default function ChatLayout() {
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