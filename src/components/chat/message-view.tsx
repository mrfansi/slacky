"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef } from "react";
import { useChatStore } from "@/stores/use-chat-store";
import { supabase } from "@/lib/supabase";
import { getMessages, MessageWithSender } from "@/actions/chat-actions";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Users, UserIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupDetailsDialog } from "./group-details-dialog";
import { OnlineIndicator } from "./online-indicator";

export function MessageView() {
    const { data: session } = useSession();
    const { activeConversationId } = useChatStore();
    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [showGroupDetails, setShowGroupDetails] = useState(false);
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
                    setMessages(messagesResult.messages);
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
                                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
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