import { MongoClient, MongoClientOptions, Db } from "mongodb";

/* =======================================================================
   NEXO — Centralized MongoDB Client & Connection Management
   Optimized for MongoDB Atlas M0 Free Tier (500 max connection limit)
   Serverless (Vercel) & Next.js Hot-Reload Safe
======================================================================= */

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

const DB_NAME = "nexo";

/**
 * Conservative pool configuration tailored for MongoDB Atlas M0 (Free Tier):
 * - maxPoolSize: 10 (avoids connection spikes across serverless instances)
 * - minPoolSize: 0 (allows idle connections to close, freeing Atlas slots)
 * - maxIdleTimeMS: 20000 (reclaims unused sockets after 20s)
 * - serverSelectionTimeoutMS: 5000 (fails fast if Atlas is unreachable)
 * - connectTimeoutMS: 10000 (sufficient time for initial TLS handshake)
 */
const mongoOptions: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 20000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  retryWrites: true,
};

// Global cache interface across Next.js module reloads
interface GlobalMongoState {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoClient?: MongoClient;
}

const globalState = globalThis as typeof globalThis & GlobalMongoState;

/**
 * Creates or retrieves the singleton MongoClient promise.
 * Automatically clears cache on connection failure to allow clean retries.
 */
function createMongoClientPromise(): Promise<MongoClient> {
  if (globalState._mongoClientPromise) {
    return globalState._mongoClientPromise;
  }

  const client = new MongoClient(MONGODB_URI, mongoOptions);
  globalState._mongoClient = client;

  const promise = client
    .connect()
    .then(async (connectedClient) => {
      // Lazy non-blocking indexing initialization
      try {
        const { ensureDatabaseIndexes } = await import("./dbIndexes");
        ensureDatabaseIndexes(connectedClient.db(DB_NAME)).catch(() => {});
      } catch {
        // Non-fatal
      }
      return connectedClient;
    })
    .catch((err) => {
      // Clear cached promise on connection error so subsequent requests can retry
      globalState._mongoClientPromise = undefined;
      globalState._mongoClient = undefined;
      console.error("[MongoDB] Connection error (credentials masked):", err?.message || err);
      throw err;
    });

  globalState._mongoClientPromise = promise;
  return promise;
}

// Initialize the shared singleton connection promise
const clientPromise: Promise<MongoClient> = createMongoClientPromise();

/**
 * Helper to get the shared MongoClient instance.
 */
export async function getMongoClient(): Promise<MongoClient> {
  return createMongoClientPromise();
}

/**
 * Helper to get the default or named database instance directly.
 */
export async function getDatabase(dbName: string = DB_NAME): Promise<Db> {
  const client = await createMongoClientPromise();
  return client.db(dbName);
}

export default clientPromise;
