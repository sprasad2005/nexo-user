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

async function testAdminMembersQuery() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const [users, members, appCounts] = await Promise.all([
    db.collection("users").find({}, {
      projection: {
        id: 1,
        memberId: 1,
        username: 1,
        email: 1,
        role: 1,
        status: 1,
        emailVerified: 1,
        mustChangePassword: 1,
        lastLoginAt: 1,
        createdAt: 1,
        phone: 1,
      },
    }).toArray(),
    db.collection("members").find({}, {
      projection: {
        id: 1,
        name: 1,
        displayName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        role: 1,
        status: 1,
        panMasked: 1,
        phone: 1,
        defaultContribution: 1,
        joinedAt: 1,
        createdAt: 1,
        isVerified: 1,
      },
    }).toArray(),
    db.collection("applications").aggregate([
      {
        $project: {
          appOwner: { $ifNull: ["$memberId", "$applicantName"] },
        },
      },
      {
        $match: {
          appOwner: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$appOwner",
          count: { $sum: 1 },
        },
      },
    ]).toArray(),
  ]);

  console.log("users count:", users.length);
  console.log("members count:", members.length);
  console.log("appCounts count:", appCounts.length);

  const usersMap = new Map();
  users.forEach((u) => {
    const uUsername = u.username || u.usernameOrEmail;
    if (u.memberId) usersMap.set(u.memberId, u);
    if (u.id) usersMap.set(u.id, u);
    if (uUsername) usersMap.set(uUsername, u);
  });

  const memberIdsSeen = new Set();

  let merged = members.map((member) => {
    memberIdsSeen.add(member.id);
    if (member.username) memberIdsSeen.add(member.username);

    const user = usersMap.get(member.id) || usersMap.get(member.username);
    return {
      id: member.id,
      name: member.name,
      username: member.username,
      email: member.email,
      role: user?.role || member.role || "MEMBER",
      status: user?.status || "ACTIVE",
    };
  });

  console.log("merged count:", merged.length);
  console.log("First 3 merged:", merged.slice(0, 3));

  await client.close();
  process.exit(0);
}

testAdminMembersQuery();
