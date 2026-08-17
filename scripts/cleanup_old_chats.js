const { MongoClient } = require("mongodb");
const fs = require("fs");

async function main() {
  const envFile = fs.readFileSync(".env.local", "utf8");
  const match = envFile.match(/MONGODB_URI=(.+)/);
  const uri = match[1].trim().replace(/^['"]|['"]$/g, "");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("nexo");

    const activeMembers = await db.collection("members").find({}).toArray();
    const activeMemberIds = new Set(activeMembers.map(m => m.id));
    console.log("Active Member IDs:", Array.from(activeMemberIds));

    // Update user documents with username and name from members
    for (const m of activeMembers) {
      await db.collection("users").updateOne(
        { emailNormalized: m.email.toLowerCase() },
        { $set: { username: m.username, name: m.name } }
      );
      await db.collection("users").updateOne(
        { memberId: m.id },
        { $set: { username: m.username, name: m.name } }
      );
    }

    // Delete conversations where participants are not part of active members
    const allConvs = await db.collection("conversations").find({}).toArray();
    let deletedConvs = 0;
    for (const c of allConvs) {
      // Check if direct conversation between active members or group
      if (c.type === "DIRECT") {
        const parts = (c.directKey || c.id || "").split("_").filter(p => p.startsWith("mem_"));
        const allActive = parts.length > 0 && parts.every(id => activeMemberIds.has(id));
        if (!allActive) {
          await db.collection("conversations").deleteOne({ id: c.id });
          await db.collection("conversationMembers").deleteMany({ conversationId: c.id });
          await db.collection("messages").deleteMany({ conversationId: c.id });
          deletedConvs++;
        }
      } else if (c.type === "GROUP") {
        // Remove memberships of deleted members
        await db.collection("conversationMembers").deleteMany({
          conversationId: c.id,
          memberId: { $nin: Array.from(activeMemberIds) }
        });
      }
    }

    // Also remove orphan messages whose conversationId doesn't exist
    const remainingConvs = await db.collection("conversations").find({}).toArray();
    const remainingConvIds = new Set(remainingConvs.map(c => c.id));
    const orphanMsgsResult = await db.collection("messages").deleteMany({
      conversationId: { $nin: Array.from(remainingConvIds) }
    });

    const orphanMembershipsResult = await db.collection("conversationMembers").deleteMany({
      conversationId: { $nin: Array.from(remainingConvIds) }
    });

    console.log(`Deleted ${deletedConvs} old invalid conversations.`);
    console.log(`Deleted ${orphanMsgsResult.deletedCount} orphan messages.`);
    console.log(`Deleted ${orphanMembershipsResult.deletedCount} orphan conversation memberships.`);

    const finalConvs = await db.collection("conversations").find({}).toArray();
    console.log("Remaining Conversations:", finalConvs.map(c => ({ id: c.id, title: c.title, directKey: c.directKey })));

    const finalUsers = await db.collection("users").find({}).toArray();
    console.log("Updated Users:", finalUsers.map(u => ({ id: u.id, username: u.username, name: u.name, email: u.email })));
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

main();
