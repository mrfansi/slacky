'use client';

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { OnlineIndicator } from "./online-indicator";
import { MessageReactions } from "./message-reactions";
import { addReaction, removeReaction } from "@/services/reaction-service";
import { getThreadMessages, sendThreadMessage } from "@/services/thread-service";
import { supabase } from "@/lib/supabase";
import { MessageWithSender } from "@/actions/chat-actions";

// Define the Message type for thread messages
interface Message extends MessageWithSender {
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    messageId: string;
    user: {
      id: string;
      name: string | null;
    };
  }>;
}

// Type for message with reactions and thread replies (imported from message-view.tsx)
type MessageWithReactions = MessageWithSender & {
  reactions?: any[];
  replies?: MessageWithSender[];
  replyCount?: number;
  isThreadReply?: boolean;
};

interface ThreadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parentMessage: MessageWithReactions;
}

export function ThreadDialog({ isOpen, onOpenChange, parentMessage }: ThreadDialogProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  

  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  useEffect(() => {
    if (isOpen && parentMessage) {
      loadThreadMessages();
      subscribeToThreadMessages();
    }
    
    return () => {
      if (isOpen) {
        unsubscribeFromThreadMessages();
      }
    };
  }, [isOpen, parentMessage]);
  
  const loadThreadMessages = async () => {
    if (!parentMessage?.id) return;
    
    setIsLoading(true);
    try {
      const result = await getThreadMessages(parentMessage.id);
      
      if (result.success) {
        setMessages(result.messages || []);
        // Update parent message with reactions if available
        if (result.parentMessage && result.parentMessage.reactions) {
          // This is just for UI purposes, we don't need to update the actual parent message
          console.log('Parent message reactions:', result.parentMessage.reactions);
        }
      } else {
        console.error("Error loading thread messages:", result.error);
      }
    } catch (error) {
      console.error("Error loading thread messages:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const subscribeToThreadMessages = () => {
    if (!parentMessage?.id) return;
    
    supabase
      .channel(`thread_${parentMessage.id}`)
      .on('broadcast', { event: 'thread_message' }, (payload) => {
        if (payload.payload.parentId === parentMessage.id) {
          const newMessage = payload.payload.message;
          
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
  };
  
  const unsubscribeFromThreadMessages = () => {
    if (!parentMessage?.id) return;
    supabase.channel(`thread_${parentMessage.id}`).unsubscribe();
  };
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !session?.user?.id || !parentMessage?.id) return;
    
    setIsSending(true);
    try {
      const result = await sendThreadMessage(
        parentMessage.id,
        messageInput,
        parentMessage.conversationId
      );
      
      if (result.success) {
        setMessageInput("");
      } else {
        console.error("Error sending thread message:", result.error);
      }
    } catch (error) {
      console.error("Error sending thread message:", error);
    } finally {
      setIsSending(false);
    }
  };
  
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
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Thread</DialogTitle>
        </DialogHeader>
        
        {/* Parent message */}
        {parentMessage && (
          <div className="p-4 border-b">
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={parentMessage.sender?.image || undefined} />
                <AvatarFallback>{parentMessage.sender?.name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm">
                    {parentMessage.sender?.name || "Unknown User"}
                  </span>
                  <OnlineIndicator userId={parentMessage.senderId} className="h-1.5 w-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {formatMessageTime(parentMessage.createdAt)}
                  </span>
                </div>
                <div className="mt-1">{parentMessage.body}</div>
                
                {/* Parent message reactions */}
                {parentMessage.reactions && parentMessage.reactions.length > 0 && (
                  <MessageReactions
                    messageId={parentMessage.id}
                    reactions={parentMessage.reactions}
                    onReactionSelect={handleAddReaction}
                    onReactionRemove={handleRemoveReaction}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Thread messages */}
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
                    <div className="flex items-start gap-2 max-w-[80%]">
                      {!isMine && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender?.image || undefined} />
                          <AvatarFallback>{message.sender?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`px-3 py-2 rounded-lg ${isMine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                          }`}
                        >
                          {!isMine && (
                            <div className="font-semibold text-sm flex items-center gap-1">
                              {message.sender?.name || "Unknown User"}
                              <OnlineIndicator userId={message.senderId} className="h-1.5 w-1.5" />
                            </div>
                          )}
                          <div>{message.body}</div>
                          <div className="text-xs mt-1 opacity-70">
                            {formatMessageTime(message.createdAt)}
                          </div>
                        </div>
                        
                        {/* Message reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <MessageReactions
                            messageId={message.id}
                            reactions={message.reactions}
                            onReactionSelect={handleAddReaction}
                            onReactionRemove={handleRemoveReaction}
                            className={`${isMine ? 'mr-2' : 'ml-2'} mt-1`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
        
        {/* Message input */}
        <div className="p-4 border-t">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Reply in thread..."
              className="min-h-[60px] flex-1"
              value={messageInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isSending || !messageInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
