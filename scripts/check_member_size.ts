import clientPromise from "../lib/mongodb";

async function checkMemberPayload() {
  const client = await clientPromise;
  const db = client.db("nexo");
  const members = await db.collection("members").find({}).toArray();
  for (const m of members) {
    const avatarLen = m.avatar ? m.avatar.length : 0;
    console.log(`Member: ${m.username || m.name} (id: ${m.id}), avatar length: ${avatarLen}`);
    if (avatarLen > 1000) {
      console.log(`-> Large base64 avatar detected on member ${m.username || m.name}`);
    }
  }
  process.exit(0);
}

checkMemberPayload();
