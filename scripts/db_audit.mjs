import { MongoClient } from "mongodb";
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";
const DB_NAME = "nexo";

async function runAudit() {
  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected successfully!");
    const db = client.db(DB_NAME);
    
    // 1. List collections
    const collections = await db.listCollections().toArray();
    console.log("\n=== COLLECTIONS FOUND ===");
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`Collection: ${col.name} - Document Count: ${count}`);
    }

    // 2. Inspect sample documents & fields
    console.log("\n=== SAMPLE DOCUMENTS & FIELD KEYS ===");
    for (const col of collections) {
      const sample = await db.collection(col.name).findOne({});
      const keys = sample ? Object.keys(sample) : [];
      console.log(`\nCollection [${col.name}] fields:`, keys.join(", "));
      if (sample) {
        const safeSample = { ...sample };
        if (safeSample.passwordHash) safeSample.passwordHash = "[MASKED]";
        if (safeSample.sessionTokenHash) safeSample.sessionTokenHash = "[MASKED]";
        console.log(`Sample doc:`, JSON.stringify(safeSample, null, 2));
      }
    }

    // 3. Inspect indexes for all collections
    console.log("\n=== INDEXES PER COLLECTION ===");
    for (const col of collections) {
      const indexes = await db.collection(col.name).indexes();
      console.log(`\n[${col.name}] Indexes:`, JSON.stringify(indexes.map(i => ({ name: i.name, key: i.key, unique: i.unique })), null, 2));
    }

  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    await client.close();
  }
}

runAudit();
