import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string; userId: string } }
) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const { conversationId, userId } = params;

    // Get the conversation to check if it's a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify that the conversation is a group
    if (!conversation.isGroup) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove members from a private conversation' },
        { status: 400 }
      );
    }

    // Verify that the current user is a participant in this conversation
    const isCurrentUserParticipant = conversation.participants.some(
      (p) => p.userId === currentUserId
    );

    if (!isCurrentUserParticipant) {
      return NextResponse.json(
        { success: false, error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Check if the user is a participant
    const participant = conversation.participants.find(
      (p) => p.userId === userId
    );

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this conversation' },
        { status: 400 }
      );
    }

    // Remove the user from the conversation
    await prisma.conversationParticipant.delete({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
    });

    // Notify all participants about the member update via Supabase
    await supabase
      .channel('group_updates')
      .send({
        type: 'broadcast',
        event: 'member_update',
        payload: {
          conversationId,
          action: 'removed',
          userId,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Error removing member from conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove member from conversation' },
      { status: 500 }
    );
  }
}
