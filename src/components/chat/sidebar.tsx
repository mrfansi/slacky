"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/use-chat-store";

interface ConversationProps {
    id: string;
    name: string;
    isActive?: boolean;
    onClick: (id: string) => void;
}

const Conversation = ({ id, name, isActive = false, onClick }: ConversationProps) => {
    return (
        <Button
            variant={isActive ? "default" : "ghost"}
            className="w-full justify-start mb-1"
            onClick={() => onClick(id)}
        >
            # {name}
        </Button>
    );
};

export function Sidebar() {
    const { isSidebarOpen, toggleSidebar, activeConversationId, setActiveConversationId } = useChatStore();

    // Placeholder conversations
    const [conversations] = useState([
        { id: "1", name: "general" },
        { id: "2", name: "random" },
        { id: "3", name: "introductions" },
        { id: "4", name: "help" },
        { id: "5", name: "announcements" },
    ]);

    if (!isSidebarOpen) {
        return (
            <div className="h-full w-12 border-r bg-background flex flex-col items-center py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="mb-4"
                    aria-label="Open sidebar"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                    >
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </Button>
                <div className="flex flex-col space-y-2">
                    {conversations.map((conversation) => (
                        <Button
                            key={conversation.id}
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveConversationId(conversation.id)}
                            className={`${activeConversationId === conversation.id ? "bg-accent" : ""
                                }`}
                        >
                            <span className="font-semibold">{conversation.name.charAt(0).toUpperCase()}</span>
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-64 border-r bg-background flex flex-col">
            <CardHeader className="px-4 py-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xl font-bold">Channels</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    aria-label="Close sidebar"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </Button>
            </CardHeader>
            <CardContent className="px-2 py-0 flex-grow overflow-auto">
                <ScrollArea className="h-full">
                    <div className="space-y-1 p-2">
                        {conversations.map((conversation) => (
                            <Conversation
                                key={conversation.id}
                                id={conversation.id}
                                name={conversation.name}
                                isActive={activeConversationId === conversation.id}
                                onClick={setActiveConversationId}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </div>
    );
}