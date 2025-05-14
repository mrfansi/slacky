/**
 * Service for managing message reactions
 */

/**
 * Add a reaction to a message
 * @param messageId The ID of the message to react to
 * @param emoji The emoji to react with
 * @returns The created reaction or an error
 */
export async function addReaction(messageId: string, emoji: string) {
  try {
    const response = await fetch(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding reaction:', error);
    return { success: false, error: 'Failed to add reaction' };
  }
}

/**
 * Remove a reaction from a message
 * @param messageId The ID of the message to remove the reaction from
 * @param emoji The emoji to remove
 * @returns Success status or an error
 */
export async function removeReaction(messageId: string, emoji: string) {
  try {
    const response = await fetch(`/api/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error removing reaction:', error);
    return { success: false, error: 'Failed to remove reaction' };
  }
}

/**
 * Get all reactions for a message
 * @param messageId The ID of the message to get reactions for
 * @returns The reactions or an error
 */
export async function getReactions(messageId: string) {
  try {
    const response = await fetch(`/api/messages/${messageId}/reactions`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting reactions:', error);
    return { success: false, error: 'Failed to get reactions' };
  }
}
