import { MongoClient } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";
const DB_NAME = "nexo";

async function runDataAudit() {
  const client = new MongoClient(MONGODB_URI, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("=========================================");
    console.log("NEXO DATA INTEGRITY & RELATIONSHIP AUDIT");
    console.log("=========================================\n");

    // 1. Members vs Users Check
    const members = await db.collection("members").find({}, { projection: { id: 1, name: 1, username: 1, role: 1, email: 1 } }).toArray();
    const users = await db.collection("users").find({}, { projection: { id: 1, memberId: 1, username: 1, role: 1, email: 1, status: 1 } }).toArray();

    console.log(`Members count: ${members.length}`);
    console.log(`Users count: ${users.length}`);

    const memberIds = new Set(members.map(m => m.id));
    const userIds = new Set(users.map(u => u.id));
    const userMemberIds = new Set(users.map(u => u.memberId).filter(Boolean));

    console.log("Sample Members (first 3):", members.slice(0, 3));
    console.log("Sample Users (first 3):", users.slice(0, 3));

    const membersWithoutUser = members.filter(m => !userMemberIds.has(m.id) && !userIds.has(m.id));
    console.log(`Members without corresponding User: ${membersWithoutUser.length}`);

    // 2. IPOs Check
    const ipos = await db.collection("ipos").find({}).toArray();
    console.log(`\nIPOs count: ${ipos.length}`);
    ipos.forEach(ipo => {
      console.log(`IPO: id="${ipo.id}", name="${ipo.name}", status="${ipo.status}", isHidden=${ipo.isHidden}, isArchived=${ipo.isArchived}`);
    });
    const ipoIds = new Set(ipos.map(i => i.id));

    // 3. Applications Check
    const appsCount = await db.collection("applications").countDocuments({});
    const sampleApps = await db.collection("applications").find({}).limit(5).toArray();
    console.log(`\nApplications count: ${appsCount}`);
    console.log("Sample Applications:", sampleApps.map(a => ({ id: a.id, ipoId: a.ipoId, memberId: a.memberId, applicantName: a.applicantName, status: a.status, allotmentStatus: a.allotmentStatus, sharesApplied: a.sharesApplied, sharesAllotted: a.sharesAllotted })));

    // 4. Transactions Check
    const txnsCount = await db.collection("transactions").countDocuments({});
    const sampleTxns = await db.collection("transactions").find({}).limit(5).toArray();
    console.log(`\nTransactions count: ${txnsCount}`);
    console.log("Sample Transactions:", sampleTxns.map(t => ({ id: t.id, memberId: t.memberId, ipoId: t.ipoId, type: t.type, amount: t.amount, status: t.status })));

    // 5. Profit Distributions Check
    const profitDistCount = await db.collection("profit_distributions").countDocuments({});
    console.log(`\nProfit Distributions count: ${profitDistCount}`);

    // 6. Notifications Check
    const notifsCount = await db.collection("notifications").countDocuments({});
    const sampleNotifs = await db.collection("notifications").find({}).limit(3).toArray();
    console.log(`\nNotifications count: ${notifsCount}`);
    console.log("Sample Notifications:", sampleNotifs.map(n => ({ id: n.id, memberId: n.memberId, recipientId: n.recipientId, title: n.title, isRead: n.isRead })));

    console.log("\nDATA AUDIT COMPLETE.");
  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    await client.close();
  }
}

runDataAudit();
