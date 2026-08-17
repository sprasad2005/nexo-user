import { ObjectId } from "mongodb";
import { MemberRole } from "@/types/nexo";

/* ─────────────────────────────────────────────────────────────
   USER ACCOUNT SCHEMA (native MongoDB driver)
   Collection: "users"
   Stores primary authentication identities and links to NEXO Member profiles.
───────────────────────────────────────────────────────────── */

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export interface UserDocument {
  _id?: ObjectId;
  id: string;                     // Unique User ID (e.g. "usr_1001")
  email: string;                  // User Email (e.g. "Ashay@example.com")
  emailNormalized: string;        // Normalized lowercase email (unique index)
  passwordHash: string;           // Cryptographically hashed password (PBKDF2/Salt)
  memberId: string;               // Linked NEXO Member ID (e.g. "mem_1")
  role: MemberRole;               // "ADMIN" | "MEMBER"
  status: UserStatus;             // "ACTIVE" | "SUSPENDED" | "DISABLED"
  emailVerified: boolean;         // Email verification flag
  mustChangePassword?: boolean;   // Force user to change password on login
  panNormalized?: string;         // Canonical normalized PAN for unique index
  phoneNormalized?: string;       // Canonical E.164 normalized phone for unique index
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
