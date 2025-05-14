"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoaderCircle, Settings, UserIcon, UserPlus, X } from "lucide-react";
import { getUsers } from "@/actions/chat-actions";

interface GroupMemberProps {
  id: string;
  name: string | null;
  image: string | null;
  isCurrentUser?: boolean;
  onRemove?: (id: string) => void;
}

interface AddMemberProps {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  onAdd: (id: string) => void;
}

interface GroupDetailsDialogProps {
  conversationId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  participants: GroupMemberProps[];
  isAdmin?: boolean;
}

// Group member component
const GroupMember = ({ id, name, image, isCurrentUser, onRemove }: GroupMemberProps) => {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
      <div className="flex items-center">
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={image || undefined} />
          <AvatarFallback>
            {name?.charAt(0) || <UserIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{name || 'Unknown User'}</p>
          {isCurrentUser && <p className="text-xs text-muted-foreground">You</p>}
        </div>
      </div>
      {onRemove && !isCurrentUser && (
        <Button variant="ghost" size="icon" onClick={() => onRemove(id)} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

// Add member component
const AddMember = ({ id, name, email, image, onAdd }: AddMemberProps) => {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
      <div className="flex items-center">
        <Avatar className="h-8 w-8 mr-2">
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
      <Button variant="ghost" size="sm" onClick={() => onAdd(id)}>
        Add
      </Button>
    </div>
  );
};

export function GroupDetailsDialog({ 
  conversationId, 
  isOpen, 
  onOpenChange, 
  groupName, 
  participants,
  isAdmin = false 
}: GroupDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  // Load available users to add to the group
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen || !showAddMembers) return;
      
      setLoading(true);
      try {
        const result = await getUsers();
        if (result.success && result.users) {
          // Filter out users who are already participants
          const participantIds = participants.map(p => p.id);
          const filteredUsers = result.users.filter(
            (user: any) => !participantIds.includes(user.id)
          );
          setAvailableUsers(filteredUsers);
        } else {
          setAvailableUsers([]);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, showAddMembers, participants]);

  // Handle adding a member to the group
  const handleAddMember = async (userId: string) => {
    setAddingMember(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh the page to show the updated members list
        window.location.reload();
      } else {
        console.error("Failed to add member:", data.error);
      }
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setAddingMember(false);
    }
  };

  // Handle removing a member from the group
  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/members/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh the page to show the updated members list
        window.location.reload();
      } else {
        console.error("Failed to remove member:", data.error);
      }
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{groupName || 'Group Details'}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {showAddMembers ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Add Members</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAddMembers(false)}
                >
                  Back
                </Button>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No users available to add</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {availableUsers.map((user) => (
                        <AddMember
                          key={user.id}
                          id={user.id}
                          name={user.name}
                          email={user.email}
                          image={user.image}
                          onAdd={handleAddMember}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Members ({participants.length})</h3>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAddMembers(true)}
                    disabled={addingMember}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Members
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {participants.map((participant) => (
                    <GroupMember
                      key={participant.id}
                      id={participant.id}
                      name={participant.name}
                      image={participant.image}
                      isCurrentUser={participant.isCurrentUser}
                      onRemove={isAdmin ? handleRemoveMember : undefined}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
