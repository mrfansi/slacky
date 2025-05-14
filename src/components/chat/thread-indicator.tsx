'use client';

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface ThreadIndicatorProps {
  messageId: string;
  replyCount: number;
  onClick: () => void;
}

export function ThreadIndicator({ messageId, replyCount, onClick }: ThreadIndicatorProps) {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      <MessageSquare className="h-3 w-3" />
      {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Start thread'}
    </Button>
  );
}
