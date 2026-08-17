import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { MemberDocument } from "@/src/models/Member";
import { MOCK_MEMBERS } from "@/lib/mockData";

const DB = "nexo";
const COL = "members";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();

    const client = await clientPromise;
    const col = client.db(DB).collection<MemberDocument>(COL);

    let members = await col.find({}, {
      projection: { id: 1, name: 1, username: 1, avatar: 1, role: 1 }
    }).toArray();

    const filtered = members.filter((m) => {
      const uName = (m.username || m.name.toLowerCase()).toLowerCase();
      const dName = m.name.toLowerCase();
      if (!query) return true;
      return uName.includes(query) || dName.includes(query);
    });

    /* Return sanitized member data for search results */
    const sanitized = filtered.map((m) => ({
      id: m.id,
      name: m.name,
      username: m.username || m.name.toLowerCase(),
      avatar: m.avatar || "/oggy.png",
      role: m.role || "MEMBER",
      verified: true,
    }));

    return NextResponse.json({ success: true, members: sanitized });
  } catch (err: any) {
    console.error("GET /api/members/search error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to search members" },
      { status: 500 }
    );
  }
}
