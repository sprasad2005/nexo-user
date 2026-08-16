import { MongoClient } from "mongodb";
import { ensureDatabaseIndexes } from "./dbIndexes";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://ankit_database:iamaniket07@cluster0.bpd1pms.mongodb.net/nexo?appName=Cluster0";

const options = {
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise: Promise<MongoClient>;

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect().then(async (c) => {
    // Fire and forget background indexing to ensure queries hit indexes immediately
    ensureDatabaseIndexes().catch(() => {});
    return c;
  });
}

clientPromise = globalWithMongo._mongoClientPromise;

export default clientPromise;
