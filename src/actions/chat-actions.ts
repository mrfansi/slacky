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

// Types for User and Conversation responses
export type UserBasic = {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
};

export type ConversationWithParticipants = {
    id: string;
    name: string | null;
    isGroup: boolean;
    createdAt: Date;
    updatedAt: Date;
    participants: {
        id: string;
        name: string | null;
        image: string | null;
    }[];
};

/**
 * Server action to get or create a private conversation with another user
 *
 * @param targetUserId The ID of the user to start/continue a conversation with
 * @returns The conversation ID or an error
 */
export async function getOrCreatePrivateConversation(targetUserId: string) {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Authentication required",
            };
        }

        const currentUserId = session.user.id;

        // Check if users are the same
        if (currentUserId === targetUserId) {
            return {
                success: false,
                error: "Cannot create a conversation with yourself",
            };
        }

        // Check if a private conversation already exists between these users
        // We need to find a conversation where:
        // 1. isGroup is false
        // 2. Both users are participants
        // 3. No one else is a participant (should be exactly 2 participants)

        // First, find all conversations where both users are participants
        const conversationsWithBothUsers = await prisma.conversation.findMany({
            where: {
                isGroup: false,
                participants: {
                    every: {
                        userId: {
                            in: [currentUserId, targetUserId],
                        },
                    },
                },
            },
            include: {
                participants: true,
            },
        });

        // Then filter to those with exactly 2 participants (just the two users)
        const privateConversation = conversationsWithBothUsers.find(
            (conv: { id: string; participants: any[] }) => conv.participants.length === 2
        );

        // If we found an existing conversation, return its ID
        if (privateConversation) {
            return {
                success: true,
                conversationId: privateConversation.id,
            };
        }

        // If no conversation exists, create a new one
        const newConversation = await prisma.conversation.create({
            data: {
                isGroup: false,
                participants: {
                    create: [
                        { userId: currentUserId },
                        { userId: targetUserId },
                    ],
                },
            },
        });

        revalidatePath('/'); // Revalidate the main path to update conversations list

        return {
            success: true,
            conversationId: newConversation.id,
        };
    } catch (error) {
        console.error("Error creating private conversation:", error);
        return {
            success: false,
            error: "Failed to create conversation",
        };
    }
}

/**
 * Server action to get a list of all users (excluding the current user)
 *
 * @returns List of users or an error
 */
export async function getUsers() {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Authentication required",
            };
        }

        const currentUserId = session.user.id;

        // Get all users except the current user
        const users = await prisma.user.findMany({
            where: {
                id: {
                    not: currentUserId, // Exclude the current user
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return {
            success: true,
            users,
        };
    } catch (error) {
        console.error("Error fetching users:", error);
        return {
            success: false,
            error: "Failed to fetch users",
        };
    }
}

/**
 * Server action to get a list of conversations the current user is participating in
 *
 * @returns List of conversations with participants or an error
 */
export async function getUserConversations() {
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

        // Get all conversations where the user is a participant
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                },
                // Include the most recent message for each conversation
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                    select: {
                        body: true,
                        createdAt: true,
                        sender: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc', // Most recent conversations first
            },
        });

        // Transform the data to a more convenient format
        const formattedConversations = conversations.map((conversation: any) => {
            // For private chats, get the other participant's details
            const otherParticipants = conversation.participants
                .filter((p: { user: { id: string } }) => p.user.id !== userId)
                .map((p: { user: { id: string; name: string | null; image: string | null } }) => ({
                    id: p.user.id,
                    name: p.user.name,
                    image: p.user.image,
                }));

            // For private chats, use the other user's name as the conversation name
            const displayName = !conversation.isGroup && otherParticipants.length > 0
                ? otherParticipants[0].name
                : conversation.name;

            // Get the most recent message if any
            const latestMessage = conversation.messages[0] || null;

            return {
                id: conversation.id,
                name: displayName,
                isGroup: conversation.isGroup,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
                participants: otherParticipants,
                latestMessage: latestMessage ? {
                    body: latestMessage.body,
                    createdAt: latestMessage.createdAt,
                    senderName: latestMessage.sender.name,
                } : null,
            };
        });

        return {
            success: true,
            conversations: formattedConversations,
        };
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return {
            success: false,
            error: "Failed to fetch conversations",
        };
    }
}