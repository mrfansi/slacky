/**
 * Service for handling thread-related operations
 */

/**
 * Get thread messages for a parent message
 * @param messageId The parent message ID
 * @returns The thread messages and parent message
 */
export async function getThreadMessages(messageId: string) {
  try {
    const response = await fetch(`/api/messages/${messageId}/thread`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch thread messages');
    }
    
    return {
      success: true,
      messages: data.messages || [],
      parentMessage: data.parentMessage,
    };
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      messages: [],
      parentMessage: null,
    };
  }
}

/**
 * Send a thread message
 * @param parentId The parent message ID
 * @param body The message content
 * @param conversationId The conversation ID
 * @returns The created message and updated reply count
 */
export async function sendThreadMessage(parentId: string, body: string, conversationId: string) {
  try {
    const response = await fetch(`/api/messages/${parentId}/thread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body, conversationId }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to send thread message');
    }
    
    return {
      success: true,
      message: data.message,
      replyCount: data.replyCount,
    };
  } catch (error) {
    console.error('Error sending thread message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: null,
      replyCount: 0,
    };
  }
}
