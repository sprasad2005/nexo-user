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

async function testAllotmentIpos() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("nexo");

  const ipos = await db
    .collection("ipos")
    .find(
      { isHidden: { $ne: true }, isArchived: { $ne: true } },
      {
        projection: {
          id: 1,
          name: 1,
          company: 1,
          category: 1,
          status: 1,
          allotmentFinalized: 1,
          allotmentFinalizedAt: 1,
          allotmentFinalizedBy: 1,
          metrics: 1,
          applications: 1,
          createdAt: 1,
          addedAt: 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .toArray();

  console.log("IPOs count in db:", ipos.length);
  console.log("IPOs:", ipos.map(i => ({ id: i.id, name: i.name, company: i.company, status: i.status })));

  await client.close();
  process.exit(0);
}

testAllotmentIpos();
