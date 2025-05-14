"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/stores/use-chat-store";
import { sendMessage } from "@/actions/chat-actions";

export function MessageInput() {
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const { activeConversationId } = useChatStore();

    const handleSendMessage = async () => {
        if (!message.trim() || !activeConversationId) return;

        try {
            setIsSending(true);
            const result = await sendMessage(message.trim(), activeConversationId);

            if (result.success) {
                setMessage("");
                // Success handling - would be handled by real-time updates in the future
            } else {
                console.error("Failed to send message:", result.error);
                console.error(result.error || "Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            console.error("An unexpected error occurred");
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="border-t p-4 bg-background">
            <div className="flex gap-2">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1"
                />
                <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !activeConversationId || isSending}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                    >
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                    </svg>
                    Send
                </Button>
            </div>
        </div>
    );
}