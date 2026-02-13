export const KNOWN_METADATA_KEYS = ["maestro", "paginas", "precio", "universidad"] as const;

export type MetadataValue = string | number;
export type DocumentMetadata = Record<string, MetadataValue | undefined>;
export type MetadataByDocumentId = Record<string, DocumentMetadata>;

type GenericDocument = {
  id: number;
  metadata?: DocumentMetadata;
};

function isMetadataValue(value: unknown): value is MetadataValue {
  return typeof value === "string" || typeof value === "number";
}

export function cleanMetadata(input: Record<string, unknown> | null | undefined): Record<string, MetadataValue> {
  if (!input || typeof input !== "object") return {};

  const cleaned: Record<string, MetadataValue> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!key) return;
    if (value === undefined || value === null || value === "") return;
    if (!isMetadataValue(value)) return;
    cleaned[key] = value;
  });

  return cleaned;
}

export function extractInlineMetadata(document: GenericDocument & Record<string, unknown>): Record<string, MetadataValue> {
  const fromMetadata = cleanMetadata(document.metadata as Record<string, unknown> | undefined);

  KNOWN_METADATA_KEYS.forEach((key) => {
    if (fromMetadata[key] !== undefined) return;
    const value = document[key];
    if (value === undefined || value === null || value === "") return;
    if (!isMetadataValue(value)) return;
    fromMetadata[key] = value;
  });

  return fromMetadata;
}

export function applyMetadataToDocument<T extends GenericDocument>(
  document: T,
  metadata: Record<string, unknown> | null | undefined
): T {
  const cleanedMetadata = cleanMetadata(metadata || {});
  const updatedDoc = { ...document } as T;
  const mutableDoc = updatedDoc as Record<string, unknown>;

  if (Object.keys(cleanedMetadata).length > 0) {
    mutableDoc.metadata = cleanedMetadata;
  } else {
    delete mutableDoc.metadata;
  }

  KNOWN_METADATA_KEYS.forEach((key) => {
    const value = cleanedMetadata[key];
    if (value !== undefined && value !== "") {
      mutableDoc[key] = value;
      return;
    }
    delete mutableDoc[key];
  });

  return updatedDoc;
}

export function mergeDocumentWithMetadataMap<T extends GenericDocument>(
  document: T,
  metadataByDocumentId: MetadataByDocumentId | undefined
): T {
  const documentIdKey = String(document.id);
  const hasExternalMetadata =
    !!metadataByDocumentId && Object.prototype.hasOwnProperty.call(metadataByDocumentId, documentIdKey);

  if (hasExternalMetadata) {
    return applyMetadataToDocument(document, metadataByDocumentId?.[documentIdKey]);
  }

  const inlineMetadata = extractInlineMetadata(document as GenericDocument & Record<string, unknown>);
  return applyMetadataToDocument(document, inlineMetadata);
}

export function mergeDocumentsWithMetadataMap<T extends GenericDocument>(
  documents: T[],
  metadataByDocumentId: MetadataByDocumentId | undefined
): T[] {
  return documents.map((document) => mergeDocumentWithMetadataMap(document, metadataByDocumentId));
}
