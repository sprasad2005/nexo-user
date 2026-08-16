const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

async function main() {
  let uri = "";
  try {
    const localEnv = fs.readFileSync(".env.local", "utf8");
    const match = localEnv.match(/MONGODB_URI=(.+)/);
    if (match) {
      uri = match[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (e) {
    console.error("Error reading env:", e.message);
  }

  if (!uri) {
    console.log("No MongoDB URI found.");
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("nexo");
    
    // Find member for bhushan
    const bhushanMember = await db.collection("members").findOne({
      $or: [{ username: "bhushan" }, { name: "bhushan" }]
    });

    const bhushanId = bhushanMember ? bhushanMember.id || String(bhushanMember._id) : "mem_1786884610402";

    const res = await db.collection("applications").updateMany(
      { panNumbers: { $in: ["IKXPP7688P", "IKXPP8789P", "IKXPP8988P"] } },
      {
        $set: {
          applicantName: "@bhushan",
          memberId: bhushanId,
          "contributors.0.memberName": "bhushan",
          "contributors.0.memberId": bhushanId,
          "participants.0.memberName": "bhushan",
          "participants.0.memberId": bhushanId,
        }
      }
    );
    console.log("MongoDB applications updated count:", res.modifiedCount);

    // Also update any embedded applications in ipos collection
    await db.collection("ipos").updateMany(
      {},
      {
        $set: {
          "applications.$[elem].applicantName": "@bhushan",
          "applications.$[elem].memberId": bhushanId,
        }
      },
      {
        arrayFilters: [{ "elem.panNumbers": { $in: ["IKXPP7688P", "IKXPP8789P", "IKXPP8988P"] } }]
      }
    );
    console.log("MongoDB IPOs embedded applications updated.");
  } catch (err) {
    console.error("DB error:", err.message);
  } finally {
    await client.close();
  }
}

main();
