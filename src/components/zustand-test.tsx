'use client';

import { useChatStore } from '@/stores/use-chat-store';
import { Button } from '@/components/ui/button';

export default function ZustandTestComponent() {
    const { isSidebarOpen, toggleSidebar, activeConversationId, setActiveConversationId } = useChatStore();

    return (
        <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Zustand Test</h2>

            <div className="space-y-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <p className="mb-2">Sidebar is: <span className="font-medium">{isSidebarOpen ? 'Open' : 'Closed'}</span></p>
                    <Button onClick={toggleSidebar}>
                        {isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
                    </Button>
                </div>

                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <p className="mb-2">Active Conversation ID: <span className="font-medium">{activeConversationId || 'None'}</span></p>
                    <Button
                        variant="secondary"
                        onClick={() => setActiveConversationId(activeConversationId ? null : 'conv123')}
                    >
                        {activeConversationId ? 'Clear Conversation' : 'Set Test Conversation'}
                    </Button>
                </div>
            </div>
        </div>
    );
}