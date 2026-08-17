import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    await client.db("nexo").command({ ping: 1 });
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "degraded",
        database: "disconnected",
        error: error?.message || "Database connection error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
