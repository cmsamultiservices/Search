import { NextRequest, NextResponse } from "next/server";
import {
  documentExists,
  getDocument,
  getMetadataMap,
  normalizeDocumentId,
  saveDocumentMetadata,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const sectionId = request.nextUrl.searchParams.get("sectionId") || undefined;
    const documentIdParam = request.nextUrl.searchParams.get("documentId");

    const metadataByDocumentId = getMetadataMap(sectionId);

    if (documentIdParam !== null) {
      const normalized = normalizeDocumentId(sectionId, documentIdParam);
      if (!normalized) {
        return NextResponse.json({ error: "documentId is required" }, { status: 400 });
      }

      const hasMetadataEntry = Object.prototype.hasOwnProperty.call(
        metadataByDocumentId,
        normalized.documentId
      );

      return NextResponse.json({
        success: true,
        sectionId: normalized.sectionId,
        documentId: normalized.documentId,
        hasMetadataEntry,
        metadata: hasMetadataEntry ? metadataByDocumentId[normalized.documentId] : null,
      });
    }

    return NextResponse.json({
      success: true,
      sectionId: sectionId || "default",
      metadataByDocumentId,
    });
  } catch (error) {
    console.error("Metadata read error:", error);
    return NextResponse.json(
      {
        error: "Failed to read metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionId, documentId, metadata } = body || {};

    const normalized = normalizeDocumentId(sectionId, documentId);
    if (!normalized) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    if (!documentExists(normalized.sectionId, normalized.documentId)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const saved = saveDocumentMetadata(normalized.sectionId, normalized.documentId, metadata);
    const updatedDoc = getDocument(normalized.sectionId, normalized.documentId);

    return NextResponse.json({
      success: true,
      sectionId: saved.sectionId,
      document: updatedDoc,
      metadata: saved.metadata,
    });
  } catch (error) {
    console.error("Metadata update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
