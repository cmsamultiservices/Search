import { NextRequest, NextResponse } from "next/server";
import { getTopSearches, recordSearch } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sectionId = request.nextUrl.searchParams.get("section");
    const topSearches = getTopSearches(sectionId, 5);
    return NextResponse.json(topSearches);
  } catch (error) {
    console.error("Error reading search stats:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body?.query;
    const sectionId = body?.sectionId || request.nextUrl.searchParams.get("section");

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    recordSearch(sectionId, query);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording search:", error);
    return NextResponse.json({ error: "Failed to record search" }, { status: 500 });
  }
}
