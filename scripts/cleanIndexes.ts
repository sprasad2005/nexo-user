import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("nexo");

    console.log("Connected to MongoDB!");

    // Inspect members indexes
    const membersIndexes = await db.collection("members").indexes();
    console.log("Members indexes:", membersIndexes);

    // Inspect users indexes
    const usersIndexes = await db.collection("users").indexes();
    console.log("Users indexes:", usersIndexes);

    // Drop any unique index on panNormalized or phoneNormalized if problematic
    for (const idx of membersIndexes) {
      if (idx.name && idx.name.includes("panNormalized")) {
        console.log(`Dropping index on members: ${idx.name}`);
        await db.collection("members").dropIndex(idx.name).catch((e) => console.log("Drop err:", e.message));
      }
    }

    for (const idx of usersIndexes) {
      if (idx.name && idx.name.includes("panNormalized")) {
        console.log(`Dropping index on users: ${idx.name}`);
        await db.collection("users").dropIndex(idx.name).catch((e) => console.log("Drop err:", e.message));
      }
    }

    console.log("Index cleanup finished successfully!");
  } catch (err) {
    console.error("Index cleanup error:", err);
  } finally {
    await client.close();
  }
}

main();
