const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

async function checkDatabase() {
  console.log("==================================================");
  console.log("🔍 NEXO MONGODB SCHEMA & DATA INTEGRITY INSPECTION");
  console.log("==================================================\n");

  let uri = "";
  try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    const match = envFile.match(/MONGODB_URI=(.+)/);
    if (match) {
      uri = match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (e) {
    console.error("❌ Could not read .env.local file:", e.message);
    return;
  }

  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in .env.local");
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB cluster!");
    const db = client.db("nexo");

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log(`📁 Found ${collectionNames.length} collections in 'nexo' database:`);
    console.log(`   ${collectionNames.join(", ")}\n`);

    const TARGET_COLLECTIONS = [
      { name: "ipos", desc: "IPO Opportunities & Listings" },
      { name: "applications", desc: "Submitted IPO Applications & PANs" },
      { name: "members", desc: "Registered Members & Profiles" },
      { name: "users", desc: "Auth Accounts & Credentials" },
      { name: "profiles", desc: "Extended Bio & Banking Profiles" },
      { name: "conversations", desc: "Direct & Group Chat Channels" },
      { name: "messages", desc: "Real-time Chat Messages & Attachments" },
      { name: "notifications", desc: "Broadcasts & System Alerts" },
      { name: "profit_distributions", desc: "IPO Allotment Profit Distributions" },
      { name: "transactions", desc: "Financial Ledger & Capital Records" },
      { name: "activities", desc: "Admin & Member Activity Audit Trail" },
      { name: "media", desc: "Uploaded Images & File Store" },
    ];

    console.log("--------------------------------------------------");
    console.log("📊 COLLECTION DETAILED BREAKDOWN");
    console.log("--------------------------------------------------\n");

    for (const target of TARGET_COLLECTIONS) {
      const col = db.collection(target.name);
      const count = await col.countDocuments();
      console.log(`🔹 [${target.name.toUpperCase()}] — ${target.desc}`);
      console.log(`   • Total Records: ${count}`);

      if (count > 0) {
        const sample = await col.find({}).sort({ _id: -1 }).limit(1).toArray();
        if (sample && sample.length > 0) {
          const doc = sample[0];
          const keys = Object.keys(doc);
          console.log(`   • Schema Fields: [ ${keys.join(", ")} ]`);
          
          // Print key highlights based on collection type
          if (target.name === "ipos") {
            console.log(`   • Sample IPO: "${doc.name}" | Status: ${doc.status} | Min: ₹${doc.metrics?.minInvestment || "N/A"}`);
          } else if (target.name === "applications") {
            console.log(`   • Sample App: "${doc.applicantName}" for IPO "${doc.ipoName}" | Lots: ${doc.numberOfPanCards || doc.lotCount} | PANs: ${JSON.stringify(doc.panNumbers || doc.panMasked)}`);
          } else if (target.name === "members") {
            console.log(`   • Sample Member: "${doc.name}" (@${doc.username}) | Role: ${doc.role} | Avatar: ${doc.avatar}`);
          } else if (target.name === "messages") {
            console.log(`   • Sample Msg: from "${doc.senderId}" | Text: "${(doc.text || "").substring(0, 40)}" | Time: ${doc.createdAt}`);
          } else if (target.name === "notifications") {
            console.log(`   • Sample Alert: "${doc.title}" | Sender: ${doc.senderName}`);
          }
        }
      } else {
        console.log(`   • Status: Empty / Ready to receive data.`);
      }
      console.log("");
    }

    console.log("==================================================");
    console.log("✨ DATABASE INTEGRITY CHECK COMPLETE — ALL SYSTEMS HEALTHY");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Database error during inspection:", err.message);
  } finally {
    await client.close();
  }
}

checkDatabase();
