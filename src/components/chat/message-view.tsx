"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef } from "react";
import { useChatStore } from "@/stores/use-chat-store";
import { supabase } from "@/lib/supabase";
import { getMessages, MessageWithSender } from "@/actions/chat-actions";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

export function MessageView() {
    const { data: session } = useSession();
    const { activeConversationId } = useChatStore();
    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Load historical messages when conversation changes
    useEffect(() => {
        const loadMessages = async () => {
            if (!activeConversationId) return;

            setIsLoading(true);
            try {
                const result = await getMessages(activeConversationId);
                if (result.success && result.messages) {
                    setMessages(result.messages);
                } else {
                    console.error("Failed to load messages:", result.error);
                }
            } catch (error) {
                console.error("Error loading messages:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [activeConversationId]);

    // Subscribe to real-time messages
    useEffect(() => {
        if (!activeConversationId) return;

        // Subscribe to the chat_messages channel for the active conversation
        const channel = supabase
            .channel('chat_messages')
            .on('broadcast', { event: 'new_message' }, (payload) => {
                // Only process messages for the active conversation
                if (payload.payload.conversationId === activeConversationId) {
                    const newMessage = payload.payload.message;

                    // Add the new message to the state
                    setMessages((prevMessages) => {
                        // Check if the message already exists to prevent duplicates
                        const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                        if (messageExists) {
                            return prevMessages;
                        }
                        return [...prevMessages, newMessage];
                    });
                }
            })
            .subscribe();

        // Cleanup subscription on unmount or when conversation changes
        return () => {
            supabase.channel('chat_messages').unsubscribe();
        };
    }, [activeConversationId]);

    // Format the timestamp for display
    const formatMessageTime = (timestamp: Date) => {
        return format(new Date(timestamp), 'h:mm a');
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="bg-background border-b py-2 px-4">
                <h2 className="text-lg font-semibold">
                    {activeConversationId ? `# ${activeConversationId}` : "Select a conversation"}
                </h2>
            </div>
            <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <p>Loading messages...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => {
                            const isMine = message.senderId === session?.user?.id;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[70%] px-4 py-2 rounded-lg ${isMine
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                            }`}
                                    >
                                        {!isMine && (
                                            <div className="font-semibold text-sm">
                                                {message.sender.name || "Unknown User"}
                                            </div>
                                        )}
                                        <div>{message.body}</div>
                                        <div className="text-xs mt-1 opacity-70">
                                            {formatMessageTime(message.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}