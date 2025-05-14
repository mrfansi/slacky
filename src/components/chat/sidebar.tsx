"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/use-chat-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getOrCreatePrivateConversation, getUsers, getUserConversations } from "@/actions/chat-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon, PlusIcon, Users, LogOut, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { LoaderCircle } from "lucide-react";
import { CreateGroupDialog } from "@/components/chat/create-group-dialog";
import { OnlineIndicator } from "@/components/chat/online-indicator";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Types for our components
interface ConversationProps {
    id: string;
    name: string | null;
    image?: string | null;
    isActive?: boolean;
    isGroup?: boolean;
    onClick: (id: string) => void;
}

interface UserItemProps {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    onClick: (id: string) => void;
}

// Conversation item component
const Conversation = ({ id, name, image, isActive = false, isGroup = false, onClick }: ConversationProps) => {
    return (
        <Button
            variant={isActive ? "default" : "ghost"}
            className="w-full justify-start mb-1 px-2"
            onClick={() => onClick(id)}
        >
            <div className="flex items-center w-full">
                <div className="relative">
                    <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={image || undefined} />
                        <AvatarFallback>
                            {isGroup ?
                                <Users className="h-4 w-4" /> :
                                (name?.charAt(0) || <UserIcon className="h-4 w-4" />)
                            }
                        </AvatarFallback>
                    </Avatar>
                    {!isGroup && (
                        <div className="absolute -bottom-0.5 -right-0.5">
                            <OnlineIndicator userId={id} className="h-2 w-2 border border-background" />
                        </div>
                    )}
                </div>
                <span className="truncate">
                    {isGroup ? `# ${name || 'Group'}` : (name || 'Unknown User')}
                </span>
            </div>
        </Button>
    );
};

// User selection item component
const UserItem = ({ id, name, email, image, onClick }: UserItemProps) => {
    return (
        <Button
            variant="ghost"
            className="w-full justify-start mb-1"
            onClick={() => onClick(id)}
        >
            <div className="flex items-center w-full">
                <div className="relative">
                    <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={image || undefined} />
                        <AvatarFallback>
                            {name?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                        <OnlineIndicator userId={id} className="h-2 w-2 border border-background" />
                    </div>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{name || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground truncate">{email}</span>
                </div>
            </div>
        </Button>
    );
};

export function Sidebar() {
    const { isSidebarOpen, toggleSidebar, activeConversationId, setActiveConversationId } = useChatStore();

    // State for conversations and users
    const [conversations, setConversations] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [selectingUser, setSelectingUser] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Load conversations and users
    useEffect(() => {
        const loadConversations = async () => {
            setLoading(true);
            try {
                const result = await getUserConversations();
                if (result.success) {
                    setConversations(result.conversations || []);
                }
            } catch (error) {
                console.error("Error loading conversations:", error);
            } finally {
                setLoading(false);
            }
        };

        loadConversations();
        
        // Subscribe to real-time updates for new group conversations
        const channel = supabase
            .channel('group_updates')
            .on('broadcast', { event: 'new_group' }, (payload: any) => {
                // When a new group is created, refresh the conversations list
                setRefreshTrigger(prev => prev + 1);
            })
            .subscribe();
            
        return () => {
            supabase.channel('group_updates').unsubscribe();
        };
    }, [refreshTrigger]);

    // Load users when the dialog is opened
    const handleOpenUsersDialog = async () => {
        setUserDialogOpen(true);
        setSelectingUser(false);

        try {
            const result = await getUsers();
            if (result.success) {
                setUsers(result.users || []);
            }
        } catch (error) {
            console.error("Error loading users:", error);
        }
    };

    // Handle selecting a user to start a private conversation
    const handleSelectUser = async (userId: string) => {
        setSelectingUser(true);
        try {
            const result = await getOrCreatePrivateConversation(userId);
            if (result.success && result.conversationId) {
                setUserDialogOpen(false);
                setActiveConversationId(result.conversationId);
                // Refresh conversations list
                setRefreshTrigger(prev => prev + 1);
            } else {
                console.error("Failed to create conversation:", result.error);
            }
        } catch (error) {
            console.error("Error creating conversation:", error);
        } finally {
            setSelectingUser(false);
        }
    };

    // Handle group creation success
    const handleGroupCreated = (conversationId: string) => {
        setActiveConversationId(conversationId);
        setRefreshTrigger(prev => prev + 1);
    };

    // Split conversations into channels (group) and direct messages
    const directMessages = conversations.filter(conv => !conv.isGroup);
    const groupChats = conversations.filter(conv => conv.isGroup);

    if (!isSidebarOpen) {
        return (
            <div className="h-full w-12 border-r bg-background flex flex-col items-center py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="mb-4"
                    aria-label="Open sidebar"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                    >
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </Button>

                {/* Compact conversations list */}
                <div className="flex flex-col space-y-2">
                    {/* Group conversations */}
                    {groupChats.map((conversation) => (
                        <Button
                            key={conversation.id}
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveConversationId(conversation.id)}
                            className={`${activeConversationId === conversation.id ? "bg-accent" : ""}`}
                        >
                            <Avatar className="h-7 w-7">
                                <AvatarFallback>
                                    <Users className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    ))}

                    {/* New direct message button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleOpenUsersDialog}
                        className="mt-1"
                    >
                        <PlusIcon className="h-4 w-4" />
                    </Button>

                    {/* Direct messages */}
                    {directMessages.map((conversation) => (
                        <Button
                            key={conversation.id}
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveConversationId(conversation.id)}
                            className={`${activeConversationId === conversation.id ? "bg-accent" : ""}`}
                        >
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={conversation.participants[0]?.image || undefined} />
                                <AvatarFallback>
                                    {conversation.name?.charAt(0)?.toUpperCase() || (
                                        <UserIcon className="h-4 w-4" />
                                    )}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    ))}
                </div>

                {/* User selection dialog */}
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Conversation</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            {selectingUser ? (
                                <div className="flex items-center justify-center py-4">
                                    <LoaderCircle className="h-5 w-5 animate-spin" />
                                    <span className="ml-2">Creating conversation...</span>
                                </div>
                            ) : (
                                <div className="max-h-[300px] overflow-y-auto">
                                    {users.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-muted-foreground">No users found</p>
                                        </div>
                                    ) : (
                                        users.map((user) => (
                                            <UserItem
                                                key={user.id}
                                                id={user.id}
                                                name={user.name}
                                                email={user.email}
                                                image={user.image}
                                                onClick={handleSelectUser}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div
            className={`border-r h-full transition-all duration-300 ${
                isSidebarOpen ? "w-64" : "w-0"
            }`}
        >
            <CardHeader className="p-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-xl">Chats</CardTitle>
                    <div className="flex space-x-1">
                        {/* Direct Message Dialog */}
                        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={handleOpenUsersDialog}
                                    title="New Direct Message"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>New Conversation</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    {selectingUser ? (
                                        <div className="flex items-center justify-center py-4">
                                            <LoaderCircle className="h-5 w-5 animate-spin" />
                                            <span className="ml-2">Creating conversation...</span>
                                        </div>
                                    ) : (
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {users.length === 0 ? (
                                                <div className="text-center py-4">
                                                    <p className="text-sm text-muted-foreground">No users found</p>
                                                </div>
                                            ) : (
                                                users.map((user) => (
                                                    <UserItem
                                                        key={user.id}
                                                        id={user.id}
                                                        name={user.name}
                                                        email={user.email}
                                                        image={user.image}
                                                        onClick={handleSelectUser}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                        
                        {/* Group Chat Dialog */}
                        <CreateGroupDialog onGroupCreated={handleGroupCreated} />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-2 py-0 flex-grow overflow-auto">
                <ScrollArea className="h-full">
                    {/* Channels section */}
                    <div className="px-2 py-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Channels</h3>
                        </div>
                    </div>
                    <div className="space-y-1 px-2 pb-4">
                        {groupChats.map((conversation) => (
                            <Conversation
                                key={conversation.id}
                                id={conversation.id}
                                name={conversation.name}
                                isActive={activeConversationId === conversation.id}
                                isGroup={true}
                                onClick={setActiveConversationId}
                            />
                        ))}
                    </div>

                    <Separator className="my-2" />

                    {/* Direct Messages section */}
                    <div className="px-2 py-1 mt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Direct Messages</h3>
                        </div>
                    </div>
                    <div className="space-y-1 px-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-4">
                                <LoaderCircle className="h-5 w-5 animate-spin" />
                            </div>
                        ) : directMessages.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground">No conversations yet</p>
                                <p className="text-xs text-muted-foreground">Click + to start a new conversation</p>
                            </div>
                        ) : (
                            directMessages.map((conversation) => (
                                <Conversation
                                    key={conversation.id}
                                    id={conversation.id}
                                    name={conversation.name}
                                    image={conversation.participants[0]?.image}
                                    isActive={activeConversationId === conversation.id}
                                    onClick={setActiveConversationId}
                                />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
            
            {/* Settings and Logout */}
            <div className="mt-auto p-4 border-t space-y-2">
                <div className="flex items-center justify-between mb-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => window.location.href = '/settings'}
                    >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                    </Button>
                    <ThemeToggle />
                </div>
                <Button 
                    variant="destructive" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => window.location.href = '/logout'}
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </Button>
            </div>
        </div>
    );
};