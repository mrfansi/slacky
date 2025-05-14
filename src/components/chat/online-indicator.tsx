"use client";

import { usePresenceContext } from "@/components/providers/presence-provider";
import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  userId: string;
  className?: string;
  showLabel?: boolean;
}

/**
 * Component to display a user's online status
 */
export function OnlineIndicator({ userId, className, showLabel = false }: OnlineIndicatorProps) {
  const { isUserOnline } = usePresenceContext();
  const isOnline = isUserOnline(userId);
  
  return (
    <div className="flex items-center">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-green-500" : "bg-gray-400",
          className
        )}
      />
      {showLabel && (
        <span className="ml-1 text-xs text-muted-foreground">
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
}
