import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sectionId = request.nextUrl.searchParams.get("sectionId");
    const documents = listDocuments(sectionId);

    return NextResponse.json({
      success: true,
      sectionId: sectionId || "todos",
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("Documents read error:", error);
    return NextResponse.json(
      {
        error: "Failed to read documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
