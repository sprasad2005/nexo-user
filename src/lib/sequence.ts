import clientPromise from "@/lib/mongodb";

/**
 * Atomically increments and returns the next monotonic sequence integer
 * for a given sequence name (e.g. 'messageSequence').
 */
export async function getNextSequence(name: string = "messageSequence"): Promise<number> {
  const client = await clientPromise;
  const db = client.db("nexo");
  const countersCol = db.collection("counters");

  const result = await countersCol.findOneAndUpdate(
    { _id: name as any },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  if (result && typeof result.seq === "number") {
    return result.seq;
  }

  // Fallback if returnDocument format varies across driver versions
  const updatedDoc = await countersCol.findOne({ _id: name as any });
  return updatedDoc?.seq || Date.now();
}
