"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// Validation schema for the message input
const MessageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty"),
    conversationId: z.string().min(1, "Conversation ID is required"),
});

/**
 * Server action for sending a message
 * 
 * @param content The message content
 * @param conversationId The conversation ID
 * @returns Success/error status and the created message
 */
export async function sendMessage(content: string, conversationId: string) {
    try {
        // Validate input
        const validation = MessageSchema.safeParse({ content, conversationId });
        if (!validation.success) {
            return {
                success: false,
                error: validation.error.errors[0]?.message || "Invalid input",
            };
        }

        // Get the current user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Authentication required",
            };
        }

        const userId = session.user.id;

        // Verify that the user is a participant in this conversation
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId,
                    conversationId,
                },
            },
        });

        if (!participant) {
            return {
                success: false,
                error: "You are not a participant in this conversation",
            };
        }

        // Create the new message
        const message = await prisma.message.create({
            data: {
                body: content,
                senderId: userId,
                conversationId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        // Mark this conversation as having unread messages for other participants
        await prisma.conversationParticipant.updateMany({
            where: {
                conversationId,
                userId: {
                    not: userId, // Not the current user
                },
            },
            data: {
                hasUnreadMessages: true,
            },
        });

        // Update the conversation's updatedAt timestamp
        await prisma.conversation.update({
            where: {
                id: conversationId,
            },
            data: {
                updatedAt: new Date(),
            },
        });

        // Trigger a real-time event with Supabase
        await supabase
            .channel('chat_messages')
            .send({
                type: 'broadcast',
                event: 'new_message',
                payload: {
                    conversationId,
                    message
                }
            });

        // Revalidate the path to update the UI
        revalidatePath(`/conversations/${conversationId}`);

        return {
            success: true,
            message,
        };
    } catch (error) {
        console.error("Error sending message:", error);
        return {
            success: false,
            error: "Failed to send message",
        };
    }
}

// Define the Message type in a separate file or create it here at runtime
// to avoid exporting non-function values from a "use server" file
export type MessageWithSender = {
    id: string;
    body: string | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    senderId: string;
    conversationId: string;
    sender: {
        id: string;
        name: string | null;
        image: string | null;
    };
};

/**
 * Server action for fetching messages for a conversation
 *
 * @param conversationId The conversation ID
 * @returns Success/error status and an array of messages
 */
export async function getMessages(conversationId: string) {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Authentication required",
            };
        }

        const userId = session.user.id;

        // Verify that the user is a participant in this conversation
        const participant = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId,
                    conversationId,
                },
            },
        });

        if (!participant) {
            return {
                success: false,
                error: "You are not a participant in this conversation",
            };
        }

        // Fetch messages for the conversation
        const messages = await prisma.message.findMany({
            where: {
                conversationId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return {
            success: true,
            messages,
        };
    } catch (error) {
        console.error("Error fetching messages:", error);
        return {
            success: false,
            error: "Failed to fetch messages",
        };
    }
}