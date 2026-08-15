import { MongoClient } from "mongodb";
import { hashPassword } from "../src/lib/auth/password";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("nexo");

    const passHash = await hashPassword("admin123");

    const superAdminMember = {
      id: "mem_admin",
      name: "Ankit",
      username: "ankitgod",
      password: "admin123",
      email: "ankitgod@nexo.private",
      avatar: "/oggy.png",
      role: "SUPER_ADMIN",
      panMasked: "ABCDE1234F",
      panFull: "ABCDE1234F",
      defaultContribution: 100000,
      joinedAt: "Jan 2025",
      phone: "+91 98200 12345",
      updatedAt: new Date(),
    };

    const superAdminUser = {
      id: "usr_mem_admin",
      memberId: "mem_admin",
      email: "ankitgod@nexo.private",
      emailNormalized: "ankitgod@nexo.private",
      passwordHash: passHash,
      emailVerified: true,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      updatedAt: new Date(),
    };

    await db.collection("members").updateOne(
      { id: "mem_admin" },
      { $set: superAdminMember },
      { upsert: true }
    );

    await db.collection("users").updateOne(
      { memberId: "mem_admin" },
      { $set: superAdminUser },
      { upsert: true }
    );

    console.log("Super Admin account (ankitgod) successfully configured in MongoDB Atlas!");
  } catch (err) {
    console.error("Failed to seed Super Admin:", err);
  } finally {
    await client.close();
  }
}

main();
