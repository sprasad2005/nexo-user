import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

async function scanDuplicates() {
  console.log("=== SCANNING FOR DUPLICATES ===");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("nexo");

    // 1. Members PAN & Phone Scan
    const members = await db.collection("members").find({}).toArray();
    console.log(`Found ${members.length} member records in MongoDB.`);

    const panMap = new Map();
    const phoneMap = new Map();

    for (const m of members) {
      const pan = (m.panFull || m.panMasked || "").trim().toUpperCase().replace(/\s+/g, "");
      if (pan && pan !== "ABCDE1234F") {
        const list = panMap.get(pan) || [];
        list.push({ id: m.id, name: m.name, username: m.username, pan });
        panMap.set(pan, list);
      }

      const rawPhone = (m.phone || "").replace(/[\s\-\(\)\.]/g, "");
      if (rawPhone) {
        let normPhone = rawPhone;
        if (/^\d{10}$/.test(rawPhone)) normPhone = `+91${rawPhone}`;
        else if (/^91\d{10}$/.test(rawPhone)) normPhone = `+${rawPhone}`;
        else if (/^0\d{10}$/.test(rawPhone)) normPhone = `+91${rawPhone.slice(1)}`;

        const list = phoneMap.get(normPhone) || [];
        list.push({ id: m.id, name: m.name, username: m.username, phone: m.phone, normPhone });
        phoneMap.set(normPhone, list);
      }
    }

    console.log("\n--- PAN DUPLICATES REPORT ---");
    let duplicatePanFound = false;
    for (const [pan, list] of panMap.entries()) {
      if (list.length > 1) {
        duplicatePanFound = true;
        console.log(`Duplicate PAN [${pan}]:`, list);
      }
    }
    if (!duplicatePanFound) console.log("No duplicate custom PANs found in MongoDB members.");

    console.log("\n--- PHONE DUPLICATES REPORT ---");
    let duplicatePhoneFound = false;
    for (const [phone, list] of phoneMap.entries()) {
      if (list.length > 1) {
        duplicatePhoneFound = true;
        console.log(`Duplicate Phone [${phone}]:`, list);
      }
    }
    if (!duplicatePhoneFound) console.log("No duplicate Phones found in MongoDB members.");

    // 2. IPOs Name Scan
    const ipos = await db.collection("ipos").find({}).toArray();
    console.log(`\nFound ${ipos.length} IPO records in MongoDB.`);

    const ipoNameMap = new Map();
    for (const ipo of ipos) {
      if (ipo.isHidden || ipo.isArchived) continue;
      const normName = (ipo.name || "").trim().replace(/\s+/g, " ").toLowerCase();
      if (normName) {
        const list = ipoNameMap.get(normName) || [];
        list.push({ id: ipo.id, name: ipo.name, status: ipo.status });
        ipoNameMap.set(normName, list);
      }
    }

    console.log("\n--- IPO NAME DUPLICATES REPORT ---");
    let duplicateIpoFound = false;
    for (const [normName, list] of ipoNameMap.entries()) {
      if (list.length > 1) {
        duplicateIpoFound = true;
        console.log(`Duplicate IPO Name [${normName}]:`, list);
      }
    }
    if (!duplicateIpoFound) console.log("No duplicate active IPO names found in MongoDB ipos.");

    console.log("\n=== SCAN COMPLETE ===");
  } catch (err) {
    console.error("Scan error:", err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

scanDuplicates();
