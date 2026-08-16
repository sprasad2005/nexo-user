import clientPromise from "../lib/mongodb";

async function migrateAvatars() {
  const client = await clientPromise;
  const db = client.db("nexo");
  const members = await db.collection("members").find({}).toArray();

  console.log(`Found ${members.length} members. Checking for base64 avatars...`);

  for (const m of members) {
    if (m.avatar && m.avatar.startsWith("data:image")) {
      const fileId = `avatar_${m.id}_${Date.now()}`;
      const mediaDoc = {
        id: fileId,
        filename: `${m.username || m.id}_avatar.png`,
        contentType: "image/png",
        size: m.avatar.length,
        data: m.avatar,
        uploadedAt: new Date(),
      };

      // Save to media collection
      await db.collection("media").updateOne({ id: fileId }, { $set: mediaDoc }, { upsert: true });

      // Update member avatar with clean lightweight URL
      const cleanUrl = `/api/upload?id=${fileId}`;
      await db.collection("members").updateOne({ id: m.id }, { $set: { avatar: cleanUrl } });

      console.log(`✓ Migrated base64 avatar for ${m.username || m.name} -> ${cleanUrl}`);
    }
  }

  console.log("Avatar optimization migration completed!");
  process.exit(0);
}

migrateAvatars().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
