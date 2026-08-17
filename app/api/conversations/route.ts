import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ConversationDocument } from "@/src/models/Conversation";
import { ConversationMemberDocument } from "@/src/models/ConversationMember";
import { MessageDocument } from "@/src/models/Message";
import { MemberDocument } from "@/src/models/Member";
import { broadcastRealtimeEvent } from "@/app/api/realtime/route";
import { getAuthenticatedUser } from "@/src/lib/auth/authorization";

const DB = "nexo";
const COL_CONV = "conversations";
const COL_MEMBERS = "conversationMembers";
const COL_MSG = "messages";
const COL_USERS = "members";

/* ────────────────────────────────────────────────────────────────
   GET /api/conversations
   Fetches all conversations for a member sorted by lastMessageAt DESC.
──────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currentMemberId = searchParams.get("memberId") || "mem_1";

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const msgCol = db.collection<MessageDocument>(COL_MSG);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    let myMemberships = await memberCol.find({ memberId: currentMemberId }).toArray();

    /* Automatically sync group memberships only if user has no memberships */
    if (myMemberships.length === 0) {
      await ensureGroupMemberships(db, currentMemberId);
      myMemberships = await memberCol.find({ memberId: currentMemberId }).toArray();
    }

    const convIds = myMemberships.map((m) => m.conversationId);
    if (convIds.length === 0) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    // 1. First fetch conversations and memberships
    const [conversations, allMemberships] = await Promise.all([
      convCol
        .find(
          { id: { $in: convIds } },
          {
            projection: {
              id: 1,
              type: 1,
              title: 1,
              avatar: 1,
              createdBy: 1,
              directKey: 1,
              lastMessage: 1,
              lastMessageAt: 1,
              lastMessageSenderId: 1,
              ipoId: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          }
        )
        .sort({ lastMessageAt: -1 })
        .toArray(),
      memberCol
        .find(
          { conversationId: { $in: convIds } },
          { projection: { conversationId: 1, memberId: 1, role: 1 } }
        )
        .toArray(),
    ]);

    const relevantMemberIds = Array.from(
      new Set(allMemberships.map((m) => m.memberId).concat([currentMemberId]))
    );

    // 2. Fetch users, latest message summaries, and unread timestamps in parallel
    const [allUsers, latestMsgsAgg, unreadMsgsAgg] = await Promise.all([
      userCol
        .find(
          { id: { $in: relevantMemberIds } },
          { projection: { id: 1, name: 1, username: 1, avatar: 1, role: 1 } }
        )
        .toArray(),
      msgCol
        .aggregate([
          { $match: { conversationId: { $in: convIds }, isDeletedByAdmin: { $ne: true } } },
          { $sort: { seq: -1, createdAt: -1 } },
          {
            $group: {
              _id: "$conversationId",
              latestMsg: {
                $first: {
                  id: "$id",
                  senderId: "$senderId",
                  text: "$text",
                  type: "$type",
                  attachment: "$attachment",
                  createdAt: "$createdAt",
                  isDeleted: "$isDeleted",
                  isDeletedByAdmin: "$isDeletedByAdmin",
                },
              },
            },
          },
        ])
        .toArray(),
      msgCol
        .aggregate([
          {
            $match: {
              conversationId: { $in: convIds },
              senderId: { $ne: currentMemberId },
              isDeletedByAdmin: { $ne: true },
            },
          },
          {
            $group: {
              _id: "$conversationId",
              messages: { $push: { createdAt: "$createdAt" } },
            },
          },
        ])
        .toArray(),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const latestMsgMap = new Map(latestMsgsAgg.map((item: any) => [item._id, item.latestMsg]));

    const myLastReadMap = new Map<string, Date>();
    myMemberships.forEach((m) => {
      myLastReadMap.set(m.conversationId, m.lastReadAt ? new Date(m.lastReadAt) : new Date(0));
    });

    const unreadCountMap = new Map<string, number>();
    unreadMsgsAgg.forEach((item: any) => {
      const lastRead = myLastReadMap.get(item._id) || new Date(0);
      const count = item.messages.filter((m: any) => new Date(m.createdAt) > lastRead).length;
      unreadCountMap.set(item._id, count);
    });

    const membershipsByConv = new Map<string, any[]>();
    allMemberships.forEach((m) => {
      if (!membershipsByConv.has(m.conversationId)) {
        membershipsByConv.set(m.conversationId, []);
      }
      membershipsByConv.get(m.conversationId)!.push(m);
    });

    /* Enrich conversations in-memory */
    const enriched = conversations.map((c) => {
      const latestMsg = latestMsgMap.get(c.id);
      const unreadCount = unreadCountMap.get(c.id) || 0;
      const cMemberships = membershipsByConv.get(c.id) || [];

      const seenPartIds = new Set<string>();
      const participantMembers = cMemberships
        .map((m) => userMap.get(m.memberId))
        .filter((u): u is any => {
          if (!u || !u.id || seenPartIds.has(u.id)) return false;
          seenPartIds.add(u.id);
          return true;
        });

      let title = c.title;
      let avatar = c.avatar;
      let otherMember = undefined;

      if (c.type === "DIRECT") {
        const other = participantMembers.find((m) => m?.id !== currentMemberId);
        if (other) {
          title = other.name;
          avatar = other.avatar;
          otherMember = other;
        }
      }

      // Format last message text snippet like WhatsApp
      let lastMessageText = c.lastMessage || "Start a conversation";
      let lastMessageAt = c.lastMessageAt || c.createdAt;

      if (latestMsg) {
        lastMessageAt = latestMsg.createdAt;
        const senderObj = userMap.get(latestMsg.senderId);
        const senderPrefix =
          c.type === "GROUP" && senderObj
            ? `${senderObj.id === currentMemberId ? "You" : senderObj.name.split(" ")[0]}: `
            : "";

        if (latestMsg.isDeleted && latestMsg.isDeletedByAdmin) {
          lastMessageText = `${senderPrefix}Message deleted`;
        } else if (latestMsg.attachment) {
          if (latestMsg.attachment.type === "IMAGE") {
            lastMessageText = `${senderPrefix}📷 Photo`;
          } else if (latestMsg.attachment.type === "DOCUMENT") {
            lastMessageText = `${senderPrefix}📄 Document`;
          } else if (latestMsg.attachment.type === "AUDIO") {
            lastMessageText = `${senderPrefix}🎙️ Voice note`;
          } else {
            lastMessageText = `${senderPrefix}📎 Attachment`;
          }
        } else if (latestMsg.text) {
          lastMessageText = `${senderPrefix}${latestMsg.text}`;
        }
      }

      return {
        ...c,
        title,
        avatar,
        lastMessage: lastMessageText,
        lastMessageAt: lastMessageAt,
        unreadCount,
        otherMember,
        participants: participantMembers,
      };
    });

    // Deduplicate conversations by conversation ID
    const uniqueMap = new Map<string, (typeof enriched)[0]>();
    for (const c of enriched) {
      if (c && c.id && !uniqueMap.has(c.id)) {
        uniqueMap.set(c.id, c);
      }
    }
    const uniqueConversations = Array.from(uniqueMap.values());
    const totalUnreadCount = uniqueConversations.reduce(
      (sum, c) => sum + (typeof c.unreadCount === "number" ? c.unreadCount : 0),
      0
    );

    return NextResponse.json({
      success: true,
      conversations: uniqueConversations,
      totalUnreadCount,
    });
  } catch (err: any) {
    console.error("GET /api/conversations error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

/* ────────────────────────────────────────────────────────────────
   POST /api/conversations
   Creates a new DIRECT, GROUP, or IPO conversation.
   Prevents duplicate DIRECT conversations using a deterministic directKey.
──────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentMemberId = body.currentMemberId || body.createdBy || "mem_1";
    const targetMemberId = body.targetMemberId;
    const type = body.type || (targetMemberId ? "DIRECT" : "GROUP");
    const ipoId = body.ipoId;
    const title = body.title || "Group Chat";

    const client = await clientPromise;
    const db = client.db(DB);
    const convCol = db.collection<ConversationDocument>(COL_CONV);
    const memberCol = db.collection<ConversationMemberDocument>(COL_MEMBERS);
    const userCol = db.collection<MemberDocument>(COL_USERS);

    /* 1. Check existing DIRECT conversation */
    if (type === "DIRECT" && targetMemberId) {
      const pair = [currentMemberId, targetMemberId].sort();
      const directKey = `${pair[0]}_${pair[1]}`;

      const existingDirect = await convCol.findOne({ directKey });
      if (existingDirect) {
        return NextResponse.json({
          success: true,
          isExisting: true,
          conversation: existingDirect,
        });
      }

      const convId = `conv_dir_${Date.now()}`;
      const now = new Date();

      const newConv: ConversationDocument = {
        id: convId,
        type: "DIRECT",
        title: "",
        createdBy: currentMemberId,
        directKey,
        lastMessage: "Start a conversation",
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await convCol.insertOne(newConv as any);

      await memberCol.insertMany([
        {
          id: `cm_${convId}_${currentMemberId}`,
          conversationId: convId,
          memberId: currentMemberId,
          role: "OWNER",
          joinedAt: now,
          lastReadAt: now,
        },
        {
          id: `cm_${convId}_${targetMemberId}`,
          conversationId: convId,
          memberId: targetMemberId,
          role: "MEMBER",
          joinedAt: now,
          lastReadAt: new Date(0),
        },
      ] as any);

      broadcastRealtimeEvent("conversation:update", newConv);

      return NextResponse.json({
        success: true,
        isExisting: false,
        conversation: newConv,
      });
    }

    /* 2. Check existing IPO / Group request: return main IPO Investor group */
    if (type === "IPO") {
      let mainGroup = await convCol.findOne({ id: "conv_grp_main" });
      if (!mainGroup) {
        const now = new Date();
        mainGroup = {
          id: "conv_grp_main",
          type: "GROUP",
          title: "IPO Investor",
          avatar: "/oggy.png",
          createdBy: "mem_admin",
          lastMessage: "Welcome to the IPO Investor Group Chat!",
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        } as any;
        await convCol.insertOne(mainGroup as any);
      }

      return NextResponse.json({
        success: true,
        isExisting: true,
        conversation: mainGroup,
      });
    }

    /* 3. Create Custom GROUP Conversation (Restricted to ADMIN & SUPER_ADMIN) */
    const authUser = await getAuthenticatedUser();
    let isCallerAdmin = authUser?.role === "ADMIN" || authUser?.role === "SUPER_ADMIN";

    if (!isCallerAdmin) {
      const memberDoc = await db.collection(COL_MEMBERS).findOne({
        $or: [{ id: currentMemberId }, { username: String(currentMemberId).toLowerCase() }]
      });
      if (memberDoc?.role === "ADMIN" || memberDoc?.role === "SUPER_ADMIN") {
        isCallerAdmin = true;
      } else {
        const userDoc = await db.collection(COL_USERS).findOne({
          $or: [{ id: currentMemberId }, { memberId: currentMemberId }]
        });
        if (userDoc?.role === "ADMIN" || userDoc?.role === "SUPER_ADMIN") {
          isCallerAdmin = true;
        }
      }
    }

    if (!isCallerAdmin) {
      return NextResponse.json(
        { success: false, error: "Only Admins and Super Admins can create new group chats." },
        { status: 403 }
      );
    }

    const convId = `conv_grp_${Date.now()}`;
    const now = new Date();
    const participantIds: string[] = Array.isArray(body.participantIds)
      ? Array.from(new Set([currentMemberId, ...body.participantIds]))
      : [currentMemberId];

    const newConv: ConversationDocument = {
      id: convId,
      type: "GROUP",
      title: title || "New Group",
      avatar: body.avatar || "/oggy.png",
      createdBy: currentMemberId,
      lastMessage: "Group created",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await convCol.insertOne(newConv as any);

    const memberships: ConversationMemberDocument[] = participantIds.map((mId) => ({
      id: `cm_${convId}_${mId}`,
      conversationId: convId,
      memberId: mId,
      role: mId === currentMemberId ? "OWNER" : "MEMBER",
      joinedAt: now,
      lastReadAt: mId === currentMemberId ? now : new Date(0),
    }));

    await memberCol.insertMany(memberships as any);

    broadcastRealtimeEvent("conversation:update", newConv);

    return NextResponse.json({
      success: true,
      isExisting: false,
      conversation: newConv,
    });
  } catch (err: any) {
    console.error("POST /api/conversations error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

/* Helper to automatically join all members to the primary IPO Investor group chat and pair direct chats */
async function ensureGroupMemberships(db: any, memberId: string) {
  const convCol = db.collection(COL_CONV);
  const memberCol = db.collection(COL_MEMBERS);
  const userCol = db.collection(COL_USERS);

  const now = new Date();

  // Purge any old IPO-specific group chats from MongoDB
  await convCol.deleteMany({ $or: [{ type: "IPO" }, { id: { $regex: "^conv_ipo_" } }] });

  // 1. Ensure primary IPO Investor Group Chat exists
  let ipoGroup = await convCol.findOne({ id: "conv_grp_main" });
  if (!ipoGroup) {
    ipoGroup = {
      id: "conv_grp_main",
      type: "GROUP",
      title: "IPO Investor",
      avatar: "/oggy.png",
      createdBy: "mem_admin",
      lastMessage: "Welcome to the IPO Investor Group Chat!",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await convCol.insertOne(ipoGroup);
  } else if (ipoGroup.title !== "IPO Investor") {
    await convCol.updateOne({ id: "conv_grp_main" }, { $set: { title: "IPO Investor" } });
  }

  // 2. Ensure ALL registered users/members belong to the primary IPO Investor group chat
  const allRegisteredUsers = await userCol.find({}).toArray();
  for (const u of allRegisteredUsers) {
    const targetId = u.memberId || u.id;
    const inGroup = await memberCol.findOne({ conversationId: "conv_grp_main", memberId: targetId });
    if (!inGroup) {
      await memberCol.insertOne({
        id: `cm_conv_grp_main_${targetId}`,
        conversationId: "conv_grp_main",
        memberId: targetId,
        role: "MEMBER",
        joinedAt: now,
        lastReadAt: now,
      });
    }
  }

  // 3. Ensure direct 1-on-1 chats exist between memberId and all registered members
  const allUsers = await userCol.find({}).toArray();
  for (const otherUser of allUsers) {
    if (otherUser.id === memberId) continue;
    const pair = [memberId, otherUser.id].sort();
    const directKey = `${pair[0]}_${pair[1]}`;
    const existingDirect = await convCol.findOne({ directKey });
    if (!existingDirect) {
      const convId = `conv_dir_${directKey}`;
      const otherName = (otherUser.username || otherUser.name).toLowerCase();
      await convCol.insertOne({
        id: convId,
        type: "DIRECT",
        title: `@${otherName}`,
        createdBy: memberId,
        directKey,
        lastMessage: `Start chatting with @${otherName}`,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await memberCol.insertMany([
        { id: `cm_${convId}_${memberId}`, conversationId: convId, memberId, role: "MEMBER", joinedAt: now, lastReadAt: now },
        { id: `cm_${convId}_${otherUser.id}`, conversationId: convId, memberId: otherUser.id, role: "MEMBER", joinedAt: now, lastReadAt: now },
      ]);
    }
  }
}
