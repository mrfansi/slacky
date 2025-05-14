import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for creating a group conversation
const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  isGroup: z.boolean().default(true),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
});

export async function POST(request: NextRequest) {
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
    const body = await request.json();

    // Validate input
    const validation = CreateGroupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, isGroup, participantIds } = validation.data;

    // Make sure the current user is not in the participants list (we'll add them separately)
    const uniqueParticipantIds = [...new Set(participantIds)].filter(id => id !== userId);

    // Create the conversation
    const conversation = await prisma.conversation.create({
      data: {
        name,
        isGroup: true, // Force isGroup to be true for this endpoint
        participants: {
          create: [
            // Add the current user as a participant
            { userId },
            // Add all other participants
            ...uniqueParticipantIds.map(participantId => ({
              userId: participantId,
            })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to a more convenient format
    const formattedConversation = {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map(p => ({
        id: p.user.id,
        name: p.user.name,
        image: p.user.image,
      })),
    };

    // Notify all participants about the new group via Supabase
    await supabase
      .channel('group_updates')
      .send({
        type: 'broadcast',
        event: 'new_group',
        payload: {
          conversation: formattedConversation,
        },
      });

    return NextResponse.json({
      success: true,
      conversation: formattedConversation,
    });
  } catch (error) {
    console.error('Error creating group conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create group conversation' },
      { status: 500 }
    );
  }
}
