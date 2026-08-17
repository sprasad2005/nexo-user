import { MongoClient } from "mongodb";
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

async function inspectMembersData() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const [users, members] = await Promise.all([
    db.collection("users").find({}).toArray(),
    db.collection("members").find({}).toArray(),
  ]);

  console.log(`Users count: ${users.length}`);
  console.log(`Members count: ${members.length}`);

  console.log("\nUsers sample:");
  console.log(users.slice(0, 5).map(u => ({ id: u.id, memberId: u.memberId, email: u.email, role: u.role, status: u.status })));

  console.log("\nMembers sample:");
  console.log(members.slice(0, 5).map(m => ({ id: m.id, name: m.name, username: m.username, role: m.role, status: m.status })));

  await client.close();
}

inspectMembersData();
