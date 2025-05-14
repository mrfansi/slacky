"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePresence, subscribeToPresence } from "@/lib/presence";

// Create context for presence
type PresenceContextType = {
  onlineUserIds: string[];
  isUserOnline: (userId: string) => boolean;
};

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: [],
  isUserOnline: () => false,
});

// Hook to use presence context
export const usePresenceContext = () => useContext(PresenceContext);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  
  // Use the presence hook to track current user's presence
  usePresence();
  
  // Subscribe to presence changes
  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Subscribe to presence changes
    const unsubscribe = subscribeToPresence((userIds) => {
      setOnlineUserIds(userIds);
    });
    
    return () => {
      unsubscribe();
    };
  }, [session]);
  
  // Helper function to check if a user is online
  const isUserOnline = (userId: string) => {
    return onlineUserIds.includes(userId);
  };
  
  return (
    <PresenceContext.Provider value={{ onlineUserIds, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}
