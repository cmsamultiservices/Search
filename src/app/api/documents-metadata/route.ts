import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  cleanMetadata,
  extractInlineMetadata,
  mergeDocumentWithMetadataMap,
  type MetadataByDocumentId,
} from "@/lib/document-metadata";

const DEFAULT_SECTION_ID = "default";
type DocumentRecord = { id: number; [key: string]: unknown };

function sanitizeSectionId(raw?: string) {
  if (!raw || typeof raw !== "string") return "";
  return raw.toLowerCase().replace(/[^a-z0-9-_]/g, "");
}

function normalizeSectionId(raw?: string) {
  const safeSectionId = sanitizeSectionId(raw);
  if (!safeSectionId || safeSectionId === DEFAULT_SECTION_ID || safeSectionId === "todos") {
    return DEFAULT_SECTION_ID;
  }
  return safeSectionId;
}

function getDocumentsPath(sectionId?: string) {
  const normalizedSectionId = normalizeSectionId(sectionId);
  if (normalizedSectionId !== DEFAULT_SECTION_ID) {
    return path.join(process.cwd(), "public", "data", `documents-${normalizedSectionId}.json`);
  }
  return path.join(process.cwd(), "public", "data", "documents.json");
}

function getMetadataPath(sectionId?: string) {
  const normalizedSectionId = normalizeSectionId(sectionId);
  if (normalizedSectionId !== DEFAULT_SECTION_ID) {
    return path.join(process.cwd(), "public", "data", `documents-metadata-${normalizedSectionId}.json`);
  }
  return path.join(process.cwd(), "public", "data", "documents-metadata.json");
}

function normalizeMetadataMap(input: unknown): MetadataByDocumentId {
  if (!input || typeof input !== "object") return {};

  const rawMap =
    "metadataByDocumentId" in (input as Record<string, unknown>)
      ? (input as Record<string, unknown>).metadataByDocumentId
      : input;

  if (!rawMap || typeof rawMap !== "object") return {};

  const normalized: MetadataByDocumentId = {};
  Object.entries(rawMap as Record<string, unknown>).forEach(([documentId, metadata]) => {
    if (!documentId || typeof metadata !== "object" || metadata === null) return;
    normalized[documentId] = cleanMetadata(metadata as Record<string, unknown>);
  });

  return normalized;
}

function extractMetadataFromDocuments(documents: DocumentRecord[]): MetadataByDocumentId {
  const metadataByDocumentId: MetadataByDocumentId = {};

  documents.forEach((document) => {
    if (!document || typeof document.id !== "number" || !Number.isFinite(document.id)) return;
    const metadata = extractInlineMetadata(document);
    if (Object.keys(metadata).length === 0) return;
    metadataByDocumentId[String(document.id)] = metadata;
  });

  return metadataByDocumentId;
}

async function readDocuments(sectionId?: string): Promise<DocumentRecord[]> {
  const documentsPath = getDocumentsPath(sectionId);
  const fileContents = await fs.readFile(documentsPath, "utf8");
  const parsed = JSON.parse(fileContents) as { documents?: DocumentRecord[] };

  if (!Array.isArray(parsed.documents)) {
    throw new Error("Invalid documents file");
  }

  return parsed.documents;
}

async function readMetadataMap(sectionId?: string) {
  const metadataPath = getMetadataPath(sectionId);

  try {
    const fileContents = await fs.readFile(metadataPath, "utf8");
    const parsed = JSON.parse(fileContents);
    return {
      metadataPath,
      metadataByDocumentId: normalizeMetadataMap(parsed),
      exists: true,
    };
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return {
        metadataPath,
        metadataByDocumentId: {} as MetadataByDocumentId,
        exists: false,
      };
    }

    if (error instanceof SyntaxError) {
      console.warn("Invalid metadata file format, rebuilding from documents:", error);
      return {
        metadataPath,
        metadataByDocumentId: {} as MetadataByDocumentId,
        exists: false,
      };
    }

    throw error;
  }
}

async function writeMetadataMap(sectionId: string, metadataByDocumentId: MetadataByDocumentId) {
  const metadataPath = getMetadataPath(sectionId);
  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  await fs.writeFile(metadataPath, JSON.stringify({ metadataByDocumentId }, null, 2), "utf8");
  return metadataPath;
}

async function getMetadataMapWithMigration(sectionId: string) {
  const loaded = await readMetadataMap(sectionId);

  if (loaded.exists) {
    return loaded.metadataByDocumentId;
  }

  try {
    const documents = await readDocuments(sectionId);
    const migratedMetadata = extractMetadataFromDocuments(documents);

    try {
      await writeMetadataMap(sectionId, migratedMetadata);
    } catch (writeError) {
      console.warn("Metadata migration write skipped:", writeError);
    }

    return migratedMetadata;
  } catch (error) {
    console.warn("Metadata migration skipped:", error);
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const sectionId = normalizeSectionId(request.nextUrl.searchParams.get("sectionId") || undefined);
    const documentIdParam = request.nextUrl.searchParams.get("documentId");
    const metadataByDocumentId = await getMetadataMapWithMigration(sectionId);

    if (documentIdParam !== null) {
      const documentId = Number(documentIdParam);
      if (!Number.isFinite(documentId)) {
        return NextResponse.json({ error: "documentId must be a number" }, { status: 400 });
      }

      const key = String(documentId);
      const hasMetadataEntry = Object.prototype.hasOwnProperty.call(metadataByDocumentId, key);

      return NextResponse.json({
        success: true,
        sectionId,
        documentId,
        hasMetadataEntry,
        metadata: hasMetadataEntry ? metadataByDocumentId[key] : null,
      });
    }

    return NextResponse.json({
      success: true,
      sectionId,
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
    const normalizedSectionId = normalizeSectionId(sectionId);

    if (typeof documentId !== "number" || !Number.isFinite(documentId)) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const documentsPath = getDocumentsPath(normalizedSectionId);
    const metadataPath = getMetadataPath(normalizedSectionId);

    let documents: DocumentRecord[];
    try {
      documents = await readDocuments(normalizedSectionId);
    } catch (readError) {
      console.error(`Failed to read file at ${documentsPath}:`, readError);
      return NextResponse.json(
        {
          error: "Failed to read documents file",
          path: documentsPath,
          details: readError instanceof Error ? readError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    const index = documents.findIndex((doc) => doc.id === documentId);
    if (index < 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const cleanedMetadata = cleanMetadata(metadata);
    const metadataByDocumentId = await getMetadataMapWithMigration(normalizedSectionId);
    metadataByDocumentId[String(documentId)] = cleanedMetadata;

    try {
      await writeMetadataMap(normalizedSectionId, metadataByDocumentId);
    } catch (writeError) {
      console.error(`Failed to write file at ${metadataPath}:`, writeError);
      return NextResponse.json(
        {
          error: "Failed to write metadata file - check directory permissions",
          path: metadataPath,
          details: writeError instanceof Error ? writeError.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    const updatedDoc = mergeDocumentWithMetadataMap(documents[index], metadataByDocumentId);

    return NextResponse.json({
      success: true,
      sectionId: normalizedSectionId,
      document: updatedDoc,
      metadata: cleanedMetadata,
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
