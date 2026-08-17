import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("nexo");

    console.log("Fixing users without usernames...");
    const usersWithoutUsername = await db.collection("users").find({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: "" }
      ]
    }).toArray();

    console.log(`Found ${usersWithoutUsername.length} users without username`);

    for (const u of usersWithoutUsername) {
      if (u.memberId) {
        const mem = await db.collection("members").findOne({ id: u.memberId });
        if (mem && mem.username) {
          await db.collection("users").updateOne({ _id: u._id }, { $set: { username: mem.username.toLowerCase().trim() } });
          console.log(`Updated user ${u._id} with username ${mem.username}`);
        } else if (u.email) {
          const fallbackUser = u.email.split("@")[0].toLowerCase().trim();
          await db.collection("users").updateOne({ _id: u._id }, { $set: { username: fallbackUser } });
          console.log(`Updated user ${u._id} with username ${fallbackUser}`);
        }
      }
    }

    // Drop and recreate username index on users as sparse
    await db.collection("users").dropIndex("username_1").catch(() => {});
    await db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true, background: true });

    console.log("Users fixed and index updated!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
