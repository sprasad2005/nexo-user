import fs from "fs";
import path from "path";

const backupMembers = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data_backup", "members.json"), "utf8")
);

const cleanMembers = backupMembers.map((m) => ({
  id: m.id,
  name: m.name,
  username: m.username || m.name.toLowerCase().replace(/\s+/g, "_"),
  password: m.password || "user123",
  email: m.email || `${(m.username || "user")}@nexo.private`,
  avatar: m.avatar || "/oggy.png",
  role: m.role || "MEMBER",
  panMasked: m.panMasked || "ABCDE1234F",
  panFull: m.panFull || m.panMasked || "ABCDE1234F",
  defaultContribution: Number(m.defaultContribution) || 15000,
  joinedAt: m.joinedAt || "Aug 2026",
  phone: m.phone || "+91 98200 12345",
}));

console.log(`Generated ${cleanMembers.length} mock members.`);

const mockDataPath = path.join(process.cwd(), "lib", "mockData.ts");
let content = fs.readFileSync(mockDataPath, "utf8");

const exportStart = "export const MOCK_MEMBERS: Member[] = [";
const startIdx = content.indexOf(exportStart);
if (startIdx !== -1) {
  const endIdx = content.indexOf("];", startIdx);
  if (endIdx !== -1) {
    const newMembersStr = `export const MOCK_MEMBERS: Member[] = ${JSON.stringify(cleanMembers, null, 2)};`;
    content = content.slice(0, startIdx) + newMembersStr + content.slice(endIdx + 2);
    fs.writeFileSync(mockDataPath, content, "utf8");
    console.log("✅ Successfully updated lib/mockData.ts with all 24 members!");
  }
}
