import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for adding a reaction
const ReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
});

// GET: Fetch all reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
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

    const { messageId } = params;

    // Get the message to verify it exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get all reactions for the message
    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      reactions,
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// POST: Add a reaction to a message
export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
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

    const userId = session.user.id;
    const { messageId } = params;
    const body = await request.json();

    // Validate input
    const validation = ReactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { emoji } = validation.data;

    // Get the message to verify it exists and get the conversation ID
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify that the user is a participant in the conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId: message.conversationId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Check if the user has already reacted with this emoji
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId,
        userId,
        emoji,
      },
    });

    if (existingReaction) {
      return NextResponse.json(
        { success: false, error: 'You have already reacted with this emoji' },
        { status: 400 }
      );
    }

    // Create the reaction
    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        userId,
        messageId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Notify all participants about the new reaction via Supabase
    await supabase
      .channel('message_reactions')
      .send({
        type: 'broadcast',
        event: 'new_reaction',
        payload: {
          messageId,
          reaction,
        },
      });

    return NextResponse.json({
      success: true,
      reaction,
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a reaction from a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
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

    const userId = session.user.id;
    const { messageId } = params;
    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get('emoji');

    if (!emoji) {
      return NextResponse.json(
        { success: false, error: 'Emoji parameter is required' },
        { status: 400 }
      );
    }

    // Get the message to verify it exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify that the user is a participant in the conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId,
          conversationId: message.conversationId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Find the reaction
    const reaction = await prisma.reaction.findFirst({
      where: {
        messageId,
        userId,
        emoji,
      },
    });

    if (!reaction) {
      return NextResponse.json(
        { success: false, error: 'Reaction not found' },
        { status: 404 }
      );
    }

    // Delete the reaction
    await prisma.reaction.delete({
      where: {
        id: reaction.id,
      },
    });

    // Notify all participants about the removed reaction via Supabase
    await supabase
      .channel('message_reactions')
      .send({
        type: 'broadcast',
        event: 'remove_reaction',
        payload: {
          messageId,
          userId,
          emoji,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Reaction removed successfully',
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
