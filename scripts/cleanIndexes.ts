import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("nexo");

    console.log("Connected to MongoDB! Dropping all non-username unique indexes...");

    const membersCol = db.collection("members");
    const usersCol = db.collection("users");

    await membersCol.dropIndex("panNormalized_1").catch(() => {});
    await membersCol.dropIndex("phoneNormalized_1").catch(() => {});
    await membersCol.dropIndex("email_1").catch(() => {});
    await membersCol.dropIndex("emailNormalized_1").catch(() => {});

    await usersCol.dropIndex("panNormalized_1").catch(() => {});
    await usersCol.dropIndex("phoneNormalized_1").catch(() => {});
    await usersCol.dropIndex("email_1").catch(() => {});
    await usersCol.dropIndex("emailNormalized_1").catch(() => {});

    console.log("Remaining members indexes:", await membersCol.indexes());
    console.log("Remaining users indexes:", await usersCol.indexes());
    console.log("Index cleanup done!");
  } catch (err) {
    console.error("Index cleanup error:", err);
  } finally {
    await client.close();
  }
}

main();
