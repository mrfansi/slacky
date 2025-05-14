"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef } from "react";
import { useChatStore } from "@/stores/use-chat-store";
import { supabase } from "@/lib/supabase";
import { getMessages, MessageWithSender } from "@/actions/chat-actions";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Users, UserIcon, Settings, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupDetailsDialog } from "./group-details-dialog";
import { OnlineIndicator } from "./online-indicator";
import { MessageReactions } from "./message-reactions";
import { EmojiPicker } from "./emoji-picker";
import { ThreadIndicator } from "./thread-indicator";
import { ThreadDialog } from "./thread-dialog";
import { addReaction, removeReaction } from "@/services/reaction-service";

// Type for message with reactions and thread replies
type MessageWithReactions = MessageWithSender & {
    reactions?: any[];
    replies?: MessageWithSender[];
    replyCount?: number;
    isThreadReply?: boolean;
};

export function MessageView() {
    const { data: session } = useSession();
    const { activeConversationId } = useChatStore();
    const [messages, setMessages] = useState<MessageWithReactions[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [showGroupDetails, setShowGroupDetails] = useState(false);
    const [threadDialogOpen, setThreadDialogOpen] = useState(false);
    const [activeThreadMessage, setActiveThreadMessage] = useState<MessageWithReactions | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Load historical messages and conversation details when conversation changes
    useEffect(() => {
        const loadMessagesAndConversation = async () => {
            if (!activeConversationId) return;

            setIsLoading(true);
            try {
                // Load messages
                const messagesResult = await getMessages(activeConversationId);
                if (messagesResult.success && messagesResult.messages) {
                    // The messages already have the correct structure from the server action
                    // Just cast them to the expected type to satisfy TypeScript
                    setMessages(messagesResult.messages as unknown as MessageWithReactions[]);
                } else {
                    console.error("Failed to load messages:", messagesResult.error);
                }
                
                // Load conversation details
                const response = await fetch(`/api/conversations/${activeConversationId}`);
                const data = await response.json();
                if (data.success) {
                    setActiveConversation(data.conversation);
                }
            } catch (error) {
                console.error("Error loading conversation data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessagesAndConversation();
    }, [activeConversationId]);

    // Subscribe to real-time messages and reactions
    useEffect(() => {
        if (!activeConversationId) return;

        // Subscribe to the chat_messages channel for the active conversation
        const messagesChannel = supabase
            .channel('chat_messages')
            .on('broadcast', { event: 'new_message' }, (payload) => {
                // Only process messages for the active conversation
                if (payload.payload.conversationId === activeConversationId) {
                    const newMessage = payload.payload.message;
                    
                    // Don't show thread replies in the main chat view
                    if (newMessage.isThreadReply) return;

                    // Add the new message to the state
                    setMessages((prevMessages) => {
                        // Check if the message already exists to prevent duplicates
                        const messageExists = prevMessages.some(msg => msg.id === newMessage.id);
                        if (messageExists) {
                            return prevMessages;
                        }
                        return [...prevMessages, { ...newMessage, reactions: [], replyCount: 0, isThreadReply: false }];
                    });
                }
            })
            .subscribe();
            
        // Subscribe to the thread_updates channel for thread reply counts
        const threadChannel = supabase
            .channel('thread_updates')
            .on('broadcast', { event: 'thread_update' }, (payload) => {
                const { messageId, replyCount } = payload.payload;
                
                // Update the reply count for the message
                setMessages((prevMessages) => {
                    return prevMessages.map(msg => {
                        if (msg.id === messageId) {
                            return { ...msg, replyCount };
                        }
                        return msg;
                    });
                });
            })
            .subscribe();
            
        // Subscribe to the message_reactions channel for reaction updates
        const reactionsChannel = supabase
            .channel('message_reactions')
            .on('broadcast', { event: 'new_reaction' }, (payload) => {
                const { messageId, reaction } = payload.payload;
                
                // Update the message with the new reaction
                setMessages((prevMessages) => {
                    return prevMessages.map(msg => {
                        if (msg.id === messageId) {
                            // Add the reaction to the message
                            const reactions = msg.reactions || [];
                            return {
                                ...msg,
                                reactions: [...reactions, reaction]
                            };
                        }
                        return msg;
                    });
                });
            })
            .on('broadcast', { event: 'remove_reaction' }, (payload) => {
                const { messageId, userId, emoji } = payload.payload;
                
                // Update the message by removing the reaction
                setMessages((prevMessages) => {
                    return prevMessages.map(msg => {
                        if (msg.id === messageId) {
                            // Remove the reaction from the message
                            const reactions = (msg.reactions || []).filter(
                                (r: any) => !(r.userId === userId && r.emoji === emoji)
                            );
                            return {
                                ...msg,
                                reactions
                            };
                        }
                        return msg;
                    });
                });
            })
            .subscribe();

        // Cleanup subscriptions on unmount or when conversation changes
        return () => {
            messagesChannel.unsubscribe();
            reactionsChannel.unsubscribe();
            threadChannel.unsubscribe();
        };
    }, [activeConversationId]);

    // Format the timestamp for display
    const formatMessageTime = (timestamp: Date) => {
        return format(new Date(timestamp), 'h:mm a');
    };
    
    // Handle adding a reaction to a message
    const handleAddReaction = async (messageId: string, emoji: string) => {
        const result = await addReaction(messageId, emoji);
        if (!result.success) {
            console.error('Failed to add reaction:', result.error);
        }
    };
    
    // Handle removing a reaction from a message
    const handleRemoveReaction = async (messageId: string, emoji: string) => {
        const result = await removeReaction(messageId, emoji);
        if (!result.success) {
            console.error('Failed to remove reaction:', result.error);
        }
    };
    
    // Open thread dialog for a message
    const handleOpenThread = (message: MessageWithReactions) => {
        setActiveThreadMessage(message);
        setThreadDialogOpen(true);
    };

    // Prepare participants data for the group details dialog
    const prepareParticipantsData = () => {
        if (!activeConversation || !session?.user) return [];
        
        // Add the current user to the participants list
        const currentUser = {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
            isCurrentUser: true
        };
        
        // Add other participants
        const otherParticipants = activeConversation.participants.map((p: any) => ({
            id: p.id,
            name: p.name,
            image: p.image,
            isCurrentUser: false
        }));
        
        return [currentUser, ...otherParticipants];
    };
    
    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="bg-background border-b py-2 px-4">
                {activeConversation ? (
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center">
                                {activeConversation.isGroup ? (
                                    <>
                                        <Users className="h-5 w-5 mr-2" />
                                        {activeConversation.name || 'Unnamed Group'}
                                    </>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <UserIcon className="h-5 w-5 mr-2" />
                                            <div className="absolute -bottom-0.5 -right-0.5">
                                                <OnlineIndicator userId={activeConversation.participants[0]?.id} className="h-2 w-2 border border-background" />
                                            </div>
                                        </div>
                                        {activeConversation.name || 'Direct Message'}
                                    </>
                                )}
                            </h2>
                            {activeConversation.isGroup && (
                                <p className="text-sm text-muted-foreground">
                                    {activeConversation.participants?.length + 1 || 1} members {/* +1 for current user */}
                                </p>
                            )}
                        </div>
                        
                        {activeConversation.isGroup && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowGroupDetails(true)}
                                className="h-8 w-8 p-0"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <h2 className="text-lg font-semibold">
                        Select a conversation
                    </h2>
                )}
            </div>
            
            {/* Group Details Dialog */}
            {activeConversation?.isGroup && (
                <GroupDetailsDialog
                    conversationId={activeConversationId || ''}
                    isOpen={showGroupDetails}
                    onOpenChange={setShowGroupDetails}
                    groupName={activeConversation.name || 'Group Chat'}
                    participants={prepareParticipantsData()}
                    isAdmin={true} // For simplicity, we're making all users admins for now
                />
            )}
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
                                    className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                                >
                                    <div
                                        className={`max-w-[70%] px-4 py-2 rounded-lg ${isMine
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                            }`}
                                    >
                                        {!isMine && (
                                            <div className="font-semibold text-sm flex items-center gap-1">
                                                {message.sender.name || "Unknown User"}
                                                <OnlineIndicator userId={message.senderId} className="h-1.5 w-1.5" />
                                            </div>
                                        )}
                                        <div>{message.body}</div>
                                        <div className="text-xs mt-1 opacity-70">
                                            {formatMessageTime(message.createdAt)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col">
                                        {/* Message Reactions */}
                                        <MessageReactions
                                            messageId={message.id}
                                            reactions={message.reactions || []}
                                            onReactionSelect={handleAddReaction}
                                            onReactionRemove={handleRemoveReaction}
                                            className={`${isMine ? 'mr-2' : 'ml-2'}`}
                                        />
                                        
                                        {/* Thread Indicator */}
                                        <div className={`mt-1 ${isMine ? 'self-end mr-2' : 'self-start ml-2'}`}>
                                            <ThreadIndicator
                                                messageId={message.id}
                                                replyCount={message.replyCount || 0}
                                                onClick={() => handleOpenThread(message)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>
            
            {/* Thread Dialog */}
            {activeThreadMessage && (
                <ThreadDialog
                    isOpen={threadDialogOpen}
                    onOpenChange={setThreadDialogOpen}
                    parentMessage={activeThreadMessage}
                />
            )}
        </div>
    );
}