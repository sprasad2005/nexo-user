import { MongoClient, MongoClientOptions, Db, ClientSession } from "mongodb";
import dns from "dns";

// Fix Windows / Node.js DNS SRV resolution failures
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

export const DB_NAME = "nexo";

const mongoOptions: MongoClientOptions = {
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 15000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

interface GlobalMongoState {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoClient?: MongoClient;
}

const globalState = globalThis as typeof globalThis & GlobalMongoState;

function createMongoClientPromise(): Promise<MongoClient> {
  if (globalState._mongoClientPromise) {
    return globalState._mongoClientPromise;
  }

  const client = new MongoClient(MONGODB_URI, mongoOptions);
  globalState._mongoClient = client;

  const promise = client
    .connect()
    .then(async (connectedClient) => {
      try {
        setTimeout(() => {
          import("./indexes")
            .then(({ ensureDatabaseIndexes }) => {
              ensureDatabaseIndexes(connectedClient.db(DB_NAME)).catch(() => {});
            })
            .catch(() => {});
        }, 100);
      } catch {}
      return connectedClient;
    })
    .catch((err) => {
      globalState._mongoClientPromise = undefined;
      globalState._mongoClient = undefined;
      console.error("[MongoDB] Connection error:", err?.message || err);
      throw err;
    });

  globalState._mongoClientPromise = promise;
  return promise;
}

export const clientPromise: Promise<MongoClient> = createMongoClientPromise();

export async function getMongoClient(): Promise<MongoClient> {
  return createMongoClientPromise();
}

export async function getDatabase(name: string = DB_NAME): Promise<Db> {
  const client = await createMongoClientPromise();
  return client.db(name);
}

export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  const db = await getDatabase();
  await db.command({ ping: 1 });
  return { ok: true, latencyMs: Date.now() - start };
}

/**
 * Execute an operation within a MongoDB transaction with automatic abort on error.
 */
export async function withTransaction<T>(
  operation: (session: ClientSession, db: Db) => Promise<T>
): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  const db = client.db(DB_NAME);

  try {
    session.startTransaction();
    const result = await operation(session, db);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export default clientPromise;
