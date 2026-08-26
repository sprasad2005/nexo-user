# NEXO — Production-Grade Authentication & Session Architecture

## Overview
NEXO implements a **server-managed, HTTP-only cookie-based authentication and session revocation architecture** built directly into Next.js 16 and MongoDB Atlas.

---

## 1. Identity Pipeline
```
Browser Cookie (nexo_session)
    ↓
Server-side Hash Lookup (SHA-256)
    ↓
nexo.sessions (Revocation & Expiration Check)
    ↓
nexo.users (ACTIVE Status & Role Check)
    ↓
nexo.members (NEXO Syndicate Member Profile)
    ↓
Server Authorization (requireUser / requireAdmin)
```

---

## 2. Security Architecture Principles

### Password Security
- **Algorithm**: NIST-approved PBKDF2 with SHA-512 and random 16-byte salt (`crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')`).
- **Timing-Safe Comparison**: `crypto.timingSafeEqual` prevents side-channel timing attacks.
- **Normalization**: Email addresses are lowercased & trimmed (`emailNormalized`) with unique indexes.
- **Strength Rules**: Minimum 12 characters required with live strength evaluation (`Weak`, `Fair`, `Good`, `Strong`).

### Session Management & Cookie Security
- **Raw Session Tokens**: 32-byte cryptographically random tokens (`crypto.randomBytes(32).toString('hex')`).
- **Storage**: Raw token is sent **ONLY** to the browser in an HTTP-Only secure cookie (`nexo_session`).
- **MongoDB Storage**: Stores ONLY the SHA-256 hash (`sessionTokenHash`) of the session token. Raw tokens are NEVER stored in MongoDB.
- **Cookie Parameters**:
  - `httpOnly: true` (JavaScript cannot read the cookie).
  - `secure: process.env.NODE_ENV === "production"`.
  - `sameSite: "lax"`.
  - `maxAge: 30 days` (Absolute Expiration).
  - `lastActiveAt`: Refreshed on activity (7-day idle window).

### Middleware & Authorization
- **Middleware (`middleware.ts`)**: Enforces authentication on all workspace routes (`/dashboard`, `/ipos`, `/applications`, `/portfolio`, `/members`, `/profile`, `/settings`, `/admin`). Unauthenticated requests redirect to `/login?next=...` (pages) or return `401 Unauthorized` (APIs).
- **Server Authorization Helpers (`src/lib/auth/authorization.ts`)**:
  - `getAuthenticatedUser()`: Reads cookie, validates session, returns identity context.
  - `requireUser()`: Asserts authenticated user session.
  - `requireAdmin()`: Asserts authenticated user session WITH `ADMIN` role.

---

## 3. MongoDB Collections & Indexes

- `nexo.users`: Stores user credentials (`emailNormalized` unique index, `passwordHash`, `memberId`, `role`, `status`).
- `nexo.sessions`: Stores active/revoked sessions (`sessionTokenHash` unique index, `userId`, `expiresAt`, `revokedAt`, `deviceName`).
- `nexo.members`: Stores syndicate member identity (`username`, `displayName`, `avatar`, `role`).
- `nexo.activities`: Immutable audit trail for security events (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_REVOKED`, `PASSWORD_CHANGED`, `ALL_SESSIONS_REVOKED`).

---

## 4. Auth API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | `POST` | Registers user & member, creates session, sets HTTP-only cookie |
| `/api/auth/login` | `POST` | Authenticates email/password, sets HTTP-only cookie |
| `/api/auth/logout` | `POST` | Revokes server session in DB & clears HTTP-only cookie |
| `/api/auth/logout-all` | `POST` | Revokes all active sessions for current user |
| `/api/auth/me` | `GET` | Returns safe current user, member, and session context |
| `/api/auth/sessions` | `GET` / `POST` | Lists active device sessions / Revokes all other sessions |
| `/api/auth/sessions/[id]` | `DELETE` | Revokes specific device session by ID |
| `/api/auth/change-password` | `POST` | Updates password hash & revokes other sessions |

---

## 5. Local Setup & Seeding

### Seeding Seed Admin & Users into MongoDB:
```bash
# Triggers full seeding of users, members, IPOs, applications, transactions into MongoDB nexo database
powershell -Command "Invoke-RestMethod -Uri 'http://localhost:3000/api/seed-db' -Method Post"
```

### Environment Variables (`.env.local`):
```env
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=your_32byte_random_secret_string
NODE_ENV=development
```
