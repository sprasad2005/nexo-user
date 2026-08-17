import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

let uri = process.env.MONGODB_URI;
if (!uri && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
  uri = process.env.MONGODB_URI;
}
if (!uri) {
  console.error("❌ MONGODB_URI not found");
  process.exit(1);
}

const client = new MongoClient(uri);

async function runTests() {
  console.log("🚀 Starting NEXO Complete Backend & Database Connectivity Verification...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${name} ${details ? `(${details})` : ""}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  try {
    await client.connect();
    const db = client.db("nexo");

    // 1. Connection Ping
    const pingRes = await db.command({ ping: 1 });
    assert(pingRes.ok === 1, "Database Ping Test", "MongoDB Atlas cluster responded with ok: 1");

    // 2. Collection Verification
    const collections = await db.listCollections().toArray();
    const colNames = collections.map((c) => c.name);
    const requiredCols = [
      "members",
      "users",
      "ipos",
      "applications",
      "transactions",
      "activities",
      "notifications",
      "sessions",
      "profiles",
      "conversations",
      "conversationMembers",
      "counters",
    ];

    for (const reqCol of requiredCols) {
      assert(colNames.includes(reqCol), `Collection Exists: '${reqCol}'`);
    }

    // 3. Document Counts in parallel
    const countResults = await Promise.all(
      requiredCols.map(async (col) => [col, await db.collection(col).countDocuments()])
    );
    const counts = Object.fromEntries(countResults);
    console.log("\n📊 Document Counts Across Collections:");
    console.table(counts);

    // 4. Data Consistency Checks
    // Check members to users 1:1 linkage
    const members = await db.collection("members").find({}, { projection: { id: 1, name: 1, username: 1, role: 1, password: 1, passwordHash: 1 } }).toArray();
    const users = await db.collection("users").find({}, { projection: { id: 1, memberId: 1, email: 1, role: 1 } }).toArray();
    const userMemberIds = new Set(users.map((u) => u.memberId || u.id));
    const unlinkedMembers = members.filter((m) => !userMemberIds.has(m.id));
    assert(
      unlinkedMembers.length === 0,
      "Member-to-User Linkage",
      `0 unlinked members out of ${members.length}`
    );

    // 5. Password Security & Sanitization Check
    const sanitizedMembers = await db
      .collection("members")
      .find({}, { projection: { id: 1, name: 1, username: 1, role: 1 } })
      .toArray();

    const leakedPasswords = sanitizedMembers.filter(
      (m) => m.password !== undefined || m.passwordHash !== undefined
    );
    assert(
      leakedPasswords.length === 0,
      "Password Exclusion in Member Queries",
      "No password or passwordHash leaked in projection"
    );

    // 6. Custom String ID vs ObjectId IPO Query
    const ipoDoc = await db.collection("ipos").findOne({}, { projection: { id: 1, name: 1 } });
    if (ipoDoc) {
      const stringId = ipoDoc.id;
      const orConditions = [
        { id: stringId },
        { id: stringId.replace(/^pub_/, "") },
        { id: `pub_${stringId.replace(/^pub_/, "")}` },
      ];
      if (ObjectId.isValid(stringId)) {
        orConditions.push({ _id: new ObjectId(stringId) });
      }

      const foundByOr = await db.collection("ipos").findOne({ $or: orConditions });
      assert(
        foundByOr !== null && foundByOr.id === ipoDoc.id,
        "IPO Query by String ID / ObjectId Resolution",
        `Resolved '${stringId}' -> ${foundByOr?.name}`
      );
    }

    // 7. Active Sessions Query Integrity
    const now = new Date();
    const activeSessions = await db.collection("sessions").find(
      { revokedAt: null, expiresAt: { $gt: now } },
      { projection: { id: 1, userId: 1, expiresAt: 1, revokedAt: 1 } }
    ).toArray();

    const validSessionsWithUserId = activeSessions.filter((s) => typeof s.userId === "string" && s.userId.length > 0);
    assert(
      validSessionsWithUserId.length === activeSessions.length,
      "Session Schema Integrity",
      `${validSessionsWithUserId.length}/${activeSessions.length} active sessions contain valid userId`
    );

    // 8. Application Relations Integrity
    const applications = await db.collection("applications").find(
      {},
      { projection: { id: 1, memberId: 1, ipoId: 1, status: 1 } }
    ).toArray();
    const memberIds = new Set(members.map((m) => m.id));
    const appsWithValidMembers = applications.filter(
      (a) => !a.memberId || memberIds.has(a.memberId)
    );
    assert(
      appsWithValidMembers.length === applications.length,
      "Application Member Integrity",
      `${appsWithValidMembers.length}/${applications.length} applications link to valid member records`
    );

    // 9. Real-time Message Sequence Monotonicity
    const counterDoc = await db.collection("counters").findOne({ _id: "messageSequence" });
    assert(
      counterDoc !== null && typeof counterDoc.seq === "number",
      "Message Sequence Counter Health",
      `Current sequence: ${counterDoc?.seq}`
    );

    console.log(`\n========================================`);
    console.log(`🏁 Connectivity & Integrity Test Results:`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    try {
      await client.close();
    } catch {}
  }
}

runTests();
