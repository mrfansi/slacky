import { create } from 'zustand';

interface ChatState {
    activeConversationId: string | null;
    isSidebarOpen: boolean;
    setActiveConversationId: (conversationId: string | null) => void;
    toggleSidebar: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    activeConversationId: null,
    isSidebarOpen: true,
    setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));