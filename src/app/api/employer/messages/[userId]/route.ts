import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.employerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile?.companyId) {
      return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const companyId = profile.companyId;
    const { userId } = await params;

    // Fetch all messages in this conversation
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderCompanyId: companyId,
            senderId: session.user.id,
            recipientId: userId,
          },
          {
            recipientCompanyId: companyId,
            senderId: userId,
          },
        ],
      },
      include: {
        senderUser: { select: { id: true, name: true, avatarUrl: true } },
        recipientUser: { select: { id: true, name: true, avatarUrl: true } },
        senderCompany: { select: { id: true, name: true, logo: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark unread messages as read (messages sent to this company by this user)
    await prisma.message.updateMany({
      where: {
        recipientCompanyId: companyId,
        senderId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        body: msg.body,
        senderType: msg.senderType,
        senderId: msg.senderId,
        senderName:
          msg.senderType === "COMPANY"
            ? msg.senderCompany?.name || "Company"
            : msg.senderUser?.name || "User",
        senderAvatar:
          msg.senderType === "COMPANY"
            ? msg.senderCompany?.logo || null
            : msg.senderUser?.avatarUrl || null,
        recipientType: msg.recipientType,
        isRead: msg.isRead,
        listingId: msg.listingId,
        listingTitle: msg.listing?.title || null,
        createdAt: msg.createdAt.toISOString(),
        updatedAt: msg.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.employerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile?.companyId) {
      return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const companyId = profile.companyId;
    const { userId } = await params;
    const body = await request.json();
    const { body: messageBody, listingId } = body;

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        recipientId: userId,
        senderCompanyId: companyId,
        recipientType: "USER",
        senderType: "COMPANY",
        body: messageBody.trim(),
        listingId: listingId || null,
      },
      include: {
        senderUser: { select: { id: true, name: true, avatarUrl: true } },
        senderCompany: { select: { id: true, name: true, logo: true } },
        listing: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(
      {
        id: message.id,
        body: message.body,
        senderType: message.senderType,
        senderId: message.senderId,
        senderName: message.senderCompany?.name || "Company",
        senderAvatar: message.senderCompany?.logo || null,
        recipientType: message.recipientType,
        isRead: message.isRead,
        listingId: message.listingId,
        listingTitle: message.listing?.title || null,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
