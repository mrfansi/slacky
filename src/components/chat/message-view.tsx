"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface Message {
    id: string;
    content: string;
    sender: string;
    timestamp: string;
    isMine: boolean;
}

export function MessageView() {
    // Placeholder messages
    const [messages] = useState<Message[]>([
        {
            id: "1",
            content: "Hello everyone! Welcome to the chat.",
            sender: "Admin",
            timestamp: "10:00 AM",
            isMine: false,
        },
        {
            id: "2",
            content: "Thanks for having me!",
            sender: "User1",
            timestamp: "10:05 AM",
            isMine: false,
        },
        {
            id: "3",
            content: "I'm excited to be here.",
            sender: "You",
            timestamp: "10:10 AM",
            isMine: true,
        },
        {
            id: "4",
            content: "Let's discuss the new project.",
            sender: "Admin",
            timestamp: "10:15 AM",
            isMine: false,
        },
        {
            id: "5",
            content: "Sounds good! I've been working on some ideas.",
            sender: "You",
            timestamp: "10:20 AM",
            isMine: true,
        },
    ]);

    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="bg-background border-b py-2 px-4">
                <h2 className="text-lg font-semibold"># general</h2>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[70%] px-4 py-2 rounded-lg ${message.isMine
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                    }`}
                            >
                                {!message.isMine && (
                                    <div className="font-semibold text-sm">{message.sender}</div>
                                )}
                                <div>{message.content}</div>
                                <div className="text-xs mt-1 opacity-70">{message.timestamp}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}