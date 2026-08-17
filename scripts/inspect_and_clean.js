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
    console.log("USERS:", users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role })));

    const members = await db.collection("members").find({}).toArray();
    console.log("MEMBERS:", members.map(m => ({ id: m.id, username: m.username, name: m.name, role: m.role })));

    const convs = await db.collection("conversations").find({}).toArray();
    console.log("CONVERSATIONS count:", convs.length, convs.map(c => ({ id: c.id, title: c.title, type: c.type, lastMessage: c.lastMessage })));

    const msgs = await db.collection("messages").find({}).toArray();
    console.log("MESSAGES count:", msgs.length, msgs.map(m => ({ id: m.id, text: m.text, senderId: m.senderId })));
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

main();
