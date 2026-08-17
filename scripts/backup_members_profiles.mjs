import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
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

async function backupMembersAndProfiles() {
  const backupDir = path.join(process.cwd(), "data_backup");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("nexo");

    for (const colName of ["members", "profiles"]) {
      console.log(`Fetching ${colName}...`);
      const cursor = db.collection(colName).find({});
      const docs = [];
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        docs.push(doc);
      }
      const filePath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");
      console.log(`  ✅ Backed up '${colName}': ${docs.length} documents -> ${colName}.json`);
    }

    console.log("Finished members and profiles backup!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    try { await client.close(); } catch {}
  }
}

backupMembersAndProfiles();
