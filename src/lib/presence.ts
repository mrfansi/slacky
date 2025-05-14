import { supabase } from "./supabase";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook to track user presence (online status)
 * This hook will update the user's online status when they connect/disconnect
 */
export function usePresence() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const userId = session.user.id;
    const channel = supabase.channel('online-users');
    
    // Setup presence tracking
    const presenceTracker = channel
      .on('presence', { event: 'sync' }, () => {
        // Get the current state of all online users
        const state = channel.presenceState();
        console.log('Online users:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track the current user's presence
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });
    
    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);
}

/**
 * Get the current online users
 * @returns A promise that resolves to an array of online user IDs
 */
export async function getOnlineUsers(): Promise<string[]> {
  const channel = supabase.channel('online-users');
  
  try {
    await channel.subscribe();
    const state = channel.presenceState();
    
    // Extract user IDs from presence state
    const onlineUserIds = Object.values(state)
      .flat()
      .map((presence: any) => presence.user_id);
    
    return [...new Set(onlineUserIds)] as string[];
  } catch (error) {
    console.error('Error getting online users:', error);
    return [];
  } finally {
    supabase.removeChannel(channel);
  }
}

/**
 * Subscribe to presence changes
 * @param callback Function to call when presence changes
 * @returns A function to unsubscribe
 */
export function subscribeToPresence(callback: (onlineUserIds: string[]) => void): () => void {
  const channel = supabase.channel('online-users');
  
  const handlePresenceChange = () => {
    const state = channel.presenceState();
    const onlineUserIds = Object.values(state)
      .flat()
      .map((presence: any) => presence.user_id);
    
    callback([...new Set(onlineUserIds)] as string[]);
  };
  
  channel
    .on('presence', { event: 'sync' }, handlePresenceChange)
    .on('presence', { event: 'join' }, handlePresenceChange)
    .on('presence', { event: 'leave' }, handlePresenceChange)
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}
