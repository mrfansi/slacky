"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { LoaderCircle, Users, UserIcon } from "lucide-react";
import { getUsers } from "@/actions/chat-actions";
import { useChatStore } from "@/stores/use-chat-store";

interface UserItemProps {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

// User selection item component with checkbox
const UserItem = ({ id, name, email, image, isSelected, onToggle }: UserItemProps) => {
  return (
    <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
      <Checkbox 
        id={`user-${id}`} 
        checked={isSelected} 
        onCheckedChange={() => onToggle(id)} 
      />
      <div className="flex items-center w-full">
        <Avatar className="h-6 w-6 mr-2">
          <AvatarImage src={image || undefined} />
          <AvatarFallback>
            {name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{name || 'Anonymous'}</span>
          <span className="text-xs text-muted-foreground truncate">{email}</span>
        </div>
      </div>
    </div>
  );
};

interface CreateGroupDialogProps {
  onGroupCreated?: (conversationId: string) => void;
}

export function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { setActiveConversationId } = useChatStore();

  // Load users when the dialog is opened
  useEffect(() => {
    const loadUsers = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        const result = await getUsers();
        if (result.success) {
          setUsers(result.users || []);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [open]);

  // Toggle user selection
  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Handle group creation
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      return;
    }

    setCreating(true);
    try {
      // We'll implement this server action next
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName,
          isGroup: true,
          participantIds: selectedUsers,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Close dialog and reset form
        setOpen(false);
        setGroupName('');
        setSelectedUsers([]);
        
        // Set the active conversation to the newly created group
        if (data.conversation?.id) {
          setActiveConversationId(data.conversation.id);
          if (onGroupCreated) {
            onGroupCreated(data.conversation.id);
          }
        }
      } else {
        console.error("Failed to create group:", data.error);
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Select Members</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <LoaderCircle className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {users.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {users.map((user) => (
                      <UserItem
                        key={user.id}
                        id={user.id}
                        name={user.name}
                        email={user.email}
                        image={user.image}
                        isSelected={selectedUsers.includes(user.id)}
                        onToggle={handleToggleUser}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGroup} 
              disabled={!groupName.trim() || selectedUsers.length === 0 || creating}
            >
              {creating ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
