import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const listingId = searchParams.get("listingId");
    const unreadOnly = searchParams.get("unread") === "true";
    const search = searchParams.get("search") || "";

    // Build base where clause
    const baseWhere: Record<string, unknown> = {
      OR: [
        { senderCompanyId: companyId, recipientId: { not: null } },
        { recipientCompanyId: companyId, senderId: { not: null } },
      ],
    };

    if (listingId) {
      baseWhere.listingId = listingId;
    }

    if (unreadOnly) {
      baseWhere.recipientCompanyId = companyId;
      baseWhere.isRead = false;
    }

    // Fetch all messages for this company with user and listing info
    const messages = await prisma.message.findMany({
      where: baseWhere,
      include: {
        senderUser: { select: { id: true, name: true, avatarUrl: true } },
        recipientUser: { select: { id: true, name: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by conversation partner (the other user in the conversation)
    const conversationMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        userAvatar: string | null;
        listingId: string | null;
        listingTitle: string | null;
        lastMessage: string;
        lastMessageAt: Date;
        unreadCount: number;
        messages: typeof messages;
      }
    >();

    for (const msg of messages) {
      // Determine the other user in this conversation
      let partnerId: string | null = null;
      let partnerName = "";
      let partnerAvatar: string | null = null;

      if (msg.senderCompanyId === companyId) {
        // Company sent this message; partner is recipient
        partnerId = msg.recipientId;
        partnerName = msg.recipientUser?.name || "Unknown User";
        partnerAvatar = msg.recipientUser?.avatarUrl || null;
      } else {
        // Company received this message; partner is sender
        partnerId = msg.senderId;
        partnerName = msg.senderUser?.name || "Unknown User";
        partnerAvatar = msg.senderUser?.avatarUrl || null;
      }

      if (!partnerId) continue;

      const existing = conversationMap.get(partnerId);
      if (existing) {
        // Count unread for this conversation
        if (msg.recipientCompanyId === companyId && !msg.isRead) {
          existing.unreadCount++;
        }
        // Keep the existing one since messages are already ordered desc,
        // the first one for each partner is the latest
      } else {
        // First message for this partner (will be latest due to desc ordering)
        const unreadCount =
          msg.recipientCompanyId === companyId && !msg.isRead ? 1 : 0;

        conversationMap.set(partnerId, {
          userId: partnerId,
          userName: partnerName,
          userAvatar: partnerAvatar,
          listingId: msg.listing?.id || null,
          listingTitle: msg.listing?.title || null,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          unreadCount,
          messages: [msg],
        });
      }
    }

    // Convert to array and sort by lastMessageAt desc
    let conversations = Array.from(conversationMap.values()).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    // Apply search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      conversations = conversations.filter(
        (c) =>
          c.userName.toLowerCase().includes(lowerSearch) ||
          c.listingTitle?.toLowerCase().includes(lowerSearch) ||
          c.lastMessage.toLowerCase().includes(lowerSearch)
      );
    }

    // If unreadOnly filter, only keep conversations with unread > 0
    if (unreadOnly) {
      conversations = conversations.filter((c) => c.unreadCount > 0);
    }

    const total = conversations.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedConversations = conversations.slice(
      (page - 1) * limit,
      page * limit
    );

    return NextResponse.json({
      conversations: paginatedConversations.map((c) => ({
        userId: c.userId,
        userName: c.userName,
        userAvatar: c.userAvatar,
        listingId: c.listingId,
        listingTitle: c.listingTitle,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt.toISOString(),
        unreadCount: c.unreadCount,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
