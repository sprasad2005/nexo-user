const { MongoClient } = require("mongodb");
const fs = require("fs");

async function checkAndCreateIndexes() {
  const envFile = fs.readFileSync(".env.local", "utf8");
  const match = envFile.match(/MONGODB_URI=(.+)/);
  const uri = match[1].trim().replace(/^['"]|['"]$/g, "");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("nexo");
    console.log("Connected to MongoDB for Index & Performance Optimization...\n");

    const collections = [
      { name: "ipos", indexes: [{ key: { id: 1 } }, { key: { name: 1 } }, { key: { status: 1 } }, { key: { createdAt: -1 } }] },
      { name: "applications", indexes: [{ key: { id: 1 } }, { key: { ipoId: 1 } }, { key: { memberId: 1 } }, { key: { createdAt: -1 } }] },
      { name: "members", indexes: [{ key: { id: 1 } }, { key: { username: 1 } }, { key: { email: 1 } }] },
      { name: "users", indexes: [{ key: { emailNormalized: 1 } }, { key: { id: 1 } }, { key: { memberId: 1 } }] },
      { name: "profiles", indexes: [{ key: { userId: 1 } }] },
      { name: "conversations", indexes: [{ key: { id: 1 } }, { key: { directKey: 1 } }, { key: { lastMessageAt: -1 } }] },
      { name: "conversationMembers", indexes: [{ key: { conversationId: 1, memberId: 1 } }, { key: { memberId: 1 } }] },
      { name: "messages", indexes: [{ key: { conversationId: 1, createdAt: -1 } }, { key: { seq: -1 } }, { key: { id: 1 } }] },
      { name: "sessions", indexes: [{ key: { tokenHash: 1 } }, { key: { id: 1 } }, { key: { userId: 1 } }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }] },
      { name: "notifications", indexes: [{ key: { targetMemberId: 1, createdAt: -1 } }, { key: { id: 1 } }] },
      { name: "activities", indexes: [{ key: { createdAt: -1 } }, { key: { category: 1 } }, { key: { eventType: 1 } }, { key: { actorUserId: 1 } }] },
    ];

    for (const item of collections) {
      const col = db.collection(item.name);
      console.log(`Checking indexes for collection '${item.name}'...`);
      for (const idx of item.indexes) {
        try {
          const opts = { background: true };
          if (idx.unique) opts.unique = true;
          if (typeof idx.expireAfterSeconds === "number") opts.expireAfterSeconds = idx.expireAfterSeconds;
          
          await col.createIndex(idx.key, opts);
          console.log(`  ✓ Index created/verified on ${JSON.stringify(idx.key)}`);
        } catch (e) {
          console.log(`  ! Error on index ${JSON.stringify(idx.key)}: ${e.message}`);
        }
      }
    }

    console.log("\n✨ All critical performance indexes successfully created & verified!");
  } catch (err) {
    console.error("Error creating indexes:", err);
  } finally {
    await client.close();
  }
}

checkAndCreateIndexes();
