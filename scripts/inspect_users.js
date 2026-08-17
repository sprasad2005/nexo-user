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

    const users = await db.collection("users").find({}).toArray();
    console.log("=== USERS IN DB ===");
    users.forEach(u => console.log(`User: ${u.username} (${u.name}) | email: ${u.email} | role: ${u.role} | id: ${u.id}`));

    const members = await db.collection("members").find({}).toArray();
    console.log("=== MEMBERS IN DB ===");
    members.forEach(m => console.log(`Member: ${m.username} (${m.name}) | email: ${m.email} | role: ${m.role} | id: ${m.id}`));

    const convCount = await db.collection("conversations").countDocuments();
    const msgCount = await db.collection("messages").countDocuments();
    const memberConvCount = await db.collection("conversationMembers").countDocuments();
    console.log(`\nTotals: ${convCount} conversations, ${msgCount} messages, ${memberConvCount} conversationMembers`);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

main();
