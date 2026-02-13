"use client";

import { Clock, X, Tag } from "lucide-react";
import { SearchEntry } from "@/hooks/use-search-history";
import { FileIcon } from "@/components/file-icon";
import { DocumentDetailsDialog } from "@/components/document-details-dialog";
import { DocumentMetadataEditor } from "@/components/document-metadata-editor";

interface RecentSearchesProps {
  searches: SearchEntry[];
  onSearch?: (document: any) => void;
  onClear: () => void;
  onOpenResult?: (entry: SearchEntry) => void;
  onMetadataSaved?: (document: any) => void;
  sectionId?: string;
}

function getEntryKey(entry: SearchEntry): string | null {
  if (!entry || !entry.document) return null;
  if (typeof entry.document.id === "number" && Number.isFinite(entry.document.id)) {
    return `id:${entry.document.id}`;
  }
  if (entry.document.ruta) return `ruta:${entry.document.ruta}`;
  return null;
}

function mergeEntries(entries: SearchEntry[]): SearchEntry[] {
  const merged = new Map<string, SearchEntry>();

  entries.forEach((entry) => {
    const key = getEntryKey(entry);
    if (!key) return;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, entry);
      return;
    }

    merged.set(key, {
      document: entry.lastAccessed >= existing.lastAccessed ? entry.document : existing.document,
      count: existing.count + entry.count,
      lastAccessed: Math.max(existing.lastAccessed, entry.lastAccessed),
    });
  });

  return Array.from(merged.values());
}

export function RecentSearches({ searches, onClear, onOpenResult, onMetadataSaved, sectionId }: RecentSearchesProps) {
  if (searches.length === 0) {
    return null;
  }

  // Filter entries with valid document and sort by count descending (most accessed first)
  const validSearches = searches.filter((entry) =>
    entry &&
    entry.document &&
    entry.document.ruta &&
    entry.document.nombre &&
    typeof entry.count === "number"
  );
  const sortedSearches = mergeEntries(validSearches).sort((a, b) => b.count - a.count);

  if (sortedSearches.length === 0) {
    return null;
  }

  const getPrecioLabel = (entry: SearchEntry) => {
    const doc = entry.document as any;
    const precio = doc?.metadata?.precio ?? doc?.precio;
    if (precio === undefined || precio === null || precio === "") return null;
    return typeof precio === "number" ? "$" + precio : String(precio);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Archivos más accedidos
          </h3>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Limpiar
        </button>
      </div>
      <div className="space-y-2">
        {sortedSearches.map((entry, index) => (
          <a
            key={getEntryKey(entry) || `${entry.document.ruta}-${index}`}
            href={`/api/files?path=${encodeURIComponent(entry.document.ruta)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              onOpenResult?.(entry);
            }}
            className="block group"
          >
            <div className="relative p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <div className="flex items-start gap-3">
                <FileIcon filename={entry.document.nombre} className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-blue-900 dark:text-blue-100 truncate text-sm">{entry.document.nombre}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300/70 truncate">{entry.document.ruta}</p>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  {getPrecioLabel(entry) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold">
                      <Tag className="h-3 w-3" />
                      {getPrecioLabel(entry)}
                    </span>
                  )}
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-700 text-white text-xs font-bold">
                    {entry.count}
                  </span>
                  <DocumentDetailsDialog document={entry.document} />
                  <DocumentMetadataEditor
                    document={entry.document as any}
                    sectionId={sectionId ?? "default"}
                    onSaved={(doc) => onMetadataSaved?.(doc)}
                  />
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
