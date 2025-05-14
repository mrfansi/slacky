import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

// GET handler to fetch thread messages for a parent message
export async function GET(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { messageId } = params;

    // Fetch the parent message to verify it exists
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    // Get reactions for the parent message
    // Using a more direct approach to avoid TypeScript errors
    const reactions = await prisma.$queryRaw`
      SELECT r.*, u.id as userId, u.name as userName 
      FROM "Reaction" r
      JOIN "User" u ON r."userId" = u.id
      WHERE r."messageId" = ${messageId}
    `;

    if (!parentMessage) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    // Fetch thread messages
    // Using a more direct approach to avoid TypeScript errors
    const threadMessages = await prisma.$queryRaw`
      SELECT m.*, u.id as "senderId", u.name as "senderName", u.email as "senderEmail", u.image as "senderImage"
      FROM "Message" m
      JOIN "User" u ON m."senderId" = u.id
      WHERE m."parentId" = ${messageId} AND m."isThreadReply" = true
      ORDER BY m."createdAt" ASC
    `;
    
    // Transform the raw results to match the expected format
    const formattedThreadMessages = (threadMessages as any[]).map((message) => ({
      ...message,
      sender: {
        id: message.senderId,
        name: message.senderName,
        email: message.senderEmail,
        image: message.senderImage,
      }
    }));
    
    // Get reactions for each thread message
    const messagesWithReactions = await Promise.all(
      formattedThreadMessages.map(async (message) => {
        // Using a more direct approach to avoid TypeScript errors
        const messageReactions = await prisma.$queryRaw`
          SELECT r.*, u.id as userId, u.name as userName 
          FROM "Reaction" r
          JOIN "User" u ON r."userId" = u.id
          WHERE r."messageId" = ${message.id}
        `;
        return {
          ...message,
          reactions: messageReactions,
        };
      })
    );

    return NextResponse.json({
      success: true,
      messages: messagesWithReactions,
      parentMessage: {
        ...parentMessage,
        reactions,
      },
    });
  } catch (error) {
    console.error("Error fetching thread messages:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler to create a new thread message
export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { messageId } = params;
    const { body, conversationId } = await req.json();

    if (!body || !conversationId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the parent message exists
    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!parentMessage) {
      return NextResponse.json(
        { success: false, error: "Parent message not found" },
        { status: 404 }
      );
    }

    // Create the thread message
    // Using a more direct approach to avoid TypeScript errors
    const newThreadMessage = await prisma.$executeRaw`
      INSERT INTO "Message" ("id", "body", "parentId", "isThreadReply", "senderId", "conversationId", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${body}, ${messageId}, true, ${session.user.id}, ${conversationId}, NOW(), NOW())
      RETURNING *
    `;
    
    // Fetch the created message with sender details
    const createdMessage = await prisma.$queryRaw`
      SELECT m.*, u.id as "senderId", u.name as "senderName", u.email as "senderEmail", u.image as "senderImage"
      FROM "Message" m
      JOIN "User" u ON m."senderId" = u.id
      WHERE m."parentId" = ${messageId} AND m."senderId" = ${session.user.id}
      ORDER BY m."createdAt" DESC
      LIMIT 1
    `;
    
    const formattedMessage = Array.isArray(createdMessage) && createdMessage.length > 0 ? {
      ...createdMessage[0],
      sender: {
        id: createdMessage[0].senderId,
        name: createdMessage[0].senderName,
        email: createdMessage[0].senderEmail,
        image: createdMessage[0].senderImage,
      }
    } : null;
    
    // Add empty reactions array for consistency with the frontend expectations
    const messageWithReactions = {
      ...formattedMessage,
      reactions: [],
    };

    // Update the reply count for the parent message
    // Using a more direct approach to avoid TypeScript errors
    const replyCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Message"
      WHERE "parentId" = ${messageId} AND "isThreadReply" = true
    `;
    
    const replyCount = Array.isArray(replyCountResult) && replyCountResult.length > 0 
      ? Number(replyCountResult[0].count) 
      : 0;

    // Broadcast the new thread message to subscribers
    await supabase
      .channel(`thread_${messageId}`)
      .send({
        type: 'broadcast',
        event: 'thread_message',
        payload: {
          message: messageWithReactions,
          parentId: messageId,
        },
      });

    // Broadcast the updated reply count
    await supabase
      .channel('thread_updates')
      .send({
        type: 'broadcast',
        event: 'thread_update',
        payload: {
          messageId,
          replyCount,
        },
      });

    return NextResponse.json({
      success: true,
      message: messageWithReactions,
      replyCount,
    });
  } catch (error) {
    console.error("Error creating thread message:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
