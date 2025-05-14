import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for adding a member
const AddMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
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
    const { conversationId } = params;
    const body = await request.json();

    // Validate input
    const validation = AddMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

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
        { success: false, error: 'Cannot add members to a private conversation' },
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

    // Check if the user is already a participant
    const isAlreadyParticipant = conversation.participants.some(
      (p) => p.userId === userId
    );

    if (isAlreadyParticipant) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this conversation' },
        { status: 400 }
      );
    }

    // Add the user as a participant
    await prisma.conversationParticipant.create({
      data: {
        userId,
        conversationId,
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
          action: 'added',
          userId,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Member added successfully',
    });
  } catch (error) {
    console.error('Error adding member to conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add member to conversation' },
      { status: 500 }
    );
  }
}
