"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { EmojiPicker } from "./emoji-picker";

type Reaction = {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
  };
};

type ReactionGroup = {
  emoji: string;
  count: number;
  users: {
    id: string;
    name: string | null;
  }[];
  hasReacted: boolean;
};

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReactionSelect: (messageId: string, emoji: string) => void;
  onReactionRemove: (messageId: string, emoji: string) => void;
  className?: string;
}

export function MessageReactions({
  messageId,
  reactions,
  onReactionSelect,
  onReactionRemove,
  className
}: MessageReactionsProps) {
  const { data: session } = useSession();
  const [showPicker, setShowPicker] = useState(false);
  
  // Group reactions by emoji
  const groupedReactions = reactions.reduce<Record<string, ReactionGroup>>((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasReacted: false
      };
    }
    
    acc[reaction.emoji].count += 1;
    acc[reaction.emoji].users.push({
      id: reaction.userId,
      name: reaction.user.name
    });
    
    if (reaction.userId === session?.user?.id) {
      acc[reaction.emoji].hasReacted = true;
    }
    
    return acc;
  }, {});
  
  const handleEmojiSelect = (emoji: string) => {
    onReactionSelect(messageId, emoji);
  };
  
  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      onReactionRemove(messageId, emoji);
    } else {
      onReactionSelect(messageId, emoji);
    }
  };
  
  return (
    <div className={cn("flex flex-wrap items-center gap-1 mt-1", className)}>
      {Object.values(groupedReactions).map((group) => (
        <Button
          key={group.emoji}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-1 py-1 rounded-full text-xs hover:bg-muted",
            group.hasReacted && "bg-muted"
          )}
          title={group.users.map(u => u.name || "Unknown").join(", ")}
          onClick={() => handleReactionClick(group.emoji, group.hasReacted)}
        >
          <span className="mr-1">{group.emoji}</span>
          <span>{group.count}</span>
        </Button>
      ))}
      
      <EmojiPicker
        onEmojiSelect={handleEmojiSelect}
        triggerClassName="h-6 w-6 p-0 rounded-full hover:bg-muted"
      />
    </div>
  );
}
