const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

async function migrateIpoTimestamps() {
  console.log("Updating IPO records with createdAt and addedAt timestamps in MongoDB...");

  let uri = "";
  try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    const match = envFile.match(/MONGODB_URI=(.+)/);
    if (match) {
      uri = match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (e) {
    console.error("Could not read .env.local:", e.message);
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("nexo");

    const ipos = await db.collection("ipos").find({}).toArray();
    console.log(`Found ${ipos.length} IPOs in MongoDB 'ipos' collection.`);

    let updatedCount = 0;
    for (const ipo of ipos) {
      let createdDate = ipo.createdAt;
      if (!createdDate && ipo.id && ipo.id.startsWith("ipo_")) {
        const ts = parseInt(ipo.id.replace("ipo_", ""), 10);
        if (!isNaN(ts) && ts > 1000000000000) {
          createdDate = new Date(ts).toISOString();
        }
      }
      if (!createdDate && ipo._id && ipo._id.getTimestamp) {
        createdDate = ipo._id.getTimestamp().toISOString();
      }
      if (!createdDate) {
        createdDate = new Date().toISOString();
      }

      await db.collection("ipos").updateOne(
        { _id: ipo._id },
        {
          $set: {
            createdAt: createdDate,
            addedAt: ipo.addedAt || createdDate,
          }
        }
      );
      updatedCount++;
    }

    console.log(`✅ Successfully updated ${updatedCount} IPO records in MongoDB with verified timestamps.`);
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.close();
  }
}

migrateIpoTimestamps();
