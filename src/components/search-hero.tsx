"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import MiniSearch from "minisearch";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon } from "@/components/file-icon";
import { Search, Frown, Copy, Check, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings, DEFAULT_SECTIONS } from "@/hooks/use-settings";
import { useSearchHistory } from "@/hooks/use-search-history";
import { RecentSearches } from "@/components/recent-searches";
import { DocumentDetailsDialog } from "@/components/document-details-dialog";
import { DocumentMetadataEditor } from "@/components/document-metadata-editor";

type DocumentMetadata = {
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
  [key: string]: string | number | undefined;
};

type Document = {
  id: string;
  nombre: string;
  ruta: string;
  sectionId?: string;
  metadata?: DocumentMetadata;
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
};

type SearchResult = Document & {
  score: number;
  match: Record<string, string[]>;
};

export function SearchHero() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | Document[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isIndexing, setIsIndexing] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const { toast } = useToast();
  const { settings, isLoaded } = useSettings();
  const sections = settings.sections?.length ? settings.sections : DEFAULT_SECTIONS;
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? 'default');
  const activeSection = sections.find((section) => section.id === activeSectionId) || sections[0];
  const currentSectionId = activeSection?.id || "default";
  const {
    recentSearches,
    addSearch,
    clearHistory,
    isLoaded: historyLoaded,
    updateSearchMetadata,
    removeSearch,
  } = useSearchHistory(activeSection?.id || 'default');
  const isPageLoading = !isLoaded || isIndexing || !historyLoaded || !activeSectionId;
  const shouldRenderHistoryPanel = !searchQuery && historyLoaded && recentSearches.length > 0;
  const shouldReserveHistorySpace = shouldRenderHistoryPanel && isHistoryPanelOpen;

  const miniSearch = useRef<MiniSearch<Document>>(
    new MiniSearch({
      fields: ["nombre", "ruta"],
      storeFields: ["nombre", "ruta", "metadata", "maestro", "paginas", "precio", "universidad"],
      idField: "id",
      processTerm: (term) => term.toLowerCase().trim(),
      searchOptions: {
        prefix: true,
        fuzzy: (term) => term.length > 2 ? 0.15 : 0,
        boost: { nombre: 10, ruta: 3 },
        combineWith: "AND",
      },
    })
  );

  const initializeIndex = useCallback(async (sectionId: string) => {
    setIsIndexing(true);
    try {
      const normalizedSectionId = sectionId || "default";
      const documentsResponse = await fetch(`/api/documents?sectionId=${encodeURIComponent(normalizedSectionId)}`);
      if (!documentsResponse.ok) {
        throw new Error(`HTTP error! status: ${documentsResponse.status}`);
      }

      const data = await documentsResponse.json() as { documents?: Document[] };
      const mergedDocuments = Array.isArray(data.documents) ? data.documents : [];
      miniSearch.current.removeAll();
      miniSearch.current.addAll(mergedDocuments);
      setDocuments(mergedDocuments);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast({
        title: "Error",
        description: "Failed to load document list.",
        variant: "destructive",
      });
    } finally {
      setIsIndexing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isLoaded && currentSectionId) {
      initializeIndex(currentSectionId);
    }
  }, [initializeIndex, isLoaded, currentSectionId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sections.length) return;
    if (!activeSectionId || !sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  useEffect(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  }, [activeSectionId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(query.length > 0);

    startTransition(() => {
      if (query.length > 0) {
        let results = miniSearch.current.search(query) as any as SearchResult[];
        // Filter by file extensions
        results = results.filter((result) => isFileExtensionAllowed(result.nombre));
        setSearchResults(results.slice(0, 10));
      } else {
        setSearchResults([]);
      }
    });
  };

  const handleClear = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const recordSearchStat = async (query: string) => {
    try {
      const sectionId = activeSection?.id || 'default';
      await fetch(`/api/search-stats?section=${encodeURIComponent(sectionId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sectionId }),
      });
    } catch (error) {
      console.error('Failed to record search:', error);
    }
  };

  const handleRecentSearchClick = (entry: any) => {
    // Open the file directly
    window.open(`/api/files?path=${encodeURIComponent(entry.document.ruta)}`, '_blank');
  };

  const handleOpenFirstResult = () => {
    if (searchResults.length > 0) {
      const firstResult = searchResults[0] as Document;
      if (searchQuery.trim()) {
        recordSearchStat(searchQuery);
      }
      // Add the opened document to history
      addSearch(firstResult);
      window.open(`/api/files?path=${encodeURIComponent(firstResult.ruta)}`, '_blank');
    }
  };

  const handleCopyPath = async (path: string, docId: string) => {
    try {
      const directory = path.includes('/')
        ? path.substring(0, path.lastIndexOf('/'))
        : path.includes('\\')
          ? path.substring(0, path.lastIndexOf('\\'))
          : path;

      await navigator.clipboard.writeText(directory);
      setCopiedId(docId);

      // Record search when user copies path
      if (searchQuery.trim()) {
        const doc = documents.find((d) => d.id === docId);
        if (doc) {
          addSearch(doc);
        }
        recordSearchStat(searchQuery);
      }

      toast({
        title: 'Copied',
        description: 'Directory copied to clipboard.',
      });
    } catch (err) {
      console.error('Failed to copy path:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy directory.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setCopiedId(null), 2000);
    }
  };


  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
    return '';
  };

  const isFileExtensionAllowed = (filename: string): boolean => {
    const ext = getFileExtension(filename);
    if (!ext) return false;
    return (settings.fileExtensions || ['pdf', 'docx']).includes(ext);
  };

  const getExtensionColor = (ext: string): { bg: string; text: string } => {
    const colors: Record<string, { bg: string; text: string }> = {
      pdf: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
      doc: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
      docx: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
      xls: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      xlsx: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      ppt: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
      pptx: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
      txt: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400' },
      jpg: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      jpeg: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      png: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      gif: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
      zip: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      rar: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
    };
    return colors[ext] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400' };
  };

  const getDocumentMetadata = (doc: Document): DocumentMetadata => {
    const merged: DocumentMetadata = { ...(doc.metadata || {}) };
    if (doc.maestro !== undefined && merged.maestro === undefined) merged.maestro = doc.maestro;
    if (doc.paginas !== undefined && merged.paginas === undefined) merged.paginas = doc.paginas;
    if (doc.precio !== undefined && merged.precio === undefined) merged.precio = doc.precio;
    if (doc.universidad !== undefined && merged.universidad === undefined) merged.universidad = doc.universidad;
    return merged;
  };

  const getPrecioLabel = (doc: Document) => {
    const metadata = getDocumentMetadata(doc);
    const precio = metadata.precio;
    if (precio === undefined || precio === null || precio === "") return null;
    return typeof precio === "number" ? "$" + precio : String(precio);
  };
  const handleMetadataSaved = (updatedDoc: Document) => {
    setDocuments((prev) => {
      const updatedDocs = prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc));
      miniSearch.current.removeAll();
      miniSearch.current.addAll(updatedDocs);

      if (searchQuery.trim()) {
        let results = miniSearch.current.search(searchQuery) as any as SearchResult[];
        results = results.filter((result) => isFileExtensionAllowed(result.nombre));
        setSearchResults(results.slice(0, 10));
      } else {
        setSearchResults([]);
      }

      return updatedDocs;
    });

    updateSearchMetadata(updatedDoc);
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-slate-950">
        <div className="w-full max-w-2xl px-4 space-y-6">
          <div className="space-y-3 text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-72 mx-auto" />
          </div>
          <Card className="p-4 rounded-full">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </Card>
          <p className="text-center text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-background dark:bg-slate-950 transition-[padding-right] duration-300 ${
        shouldReserveHistorySpace ? "lg:pr-[360px]" : ""
      }`}
    >
      {/* Hero Section */}
      <div className={`flex flex-col items-center px-4 transition-all duration-300 ${searchQuery ? 'justify-start pt-4' : 'flex-1 justify-center py-16'
        }`}>
        <div className={`w-full max-w-2xl transition-all duration-300 ${searchQuery ? 'space-y-3' : 'space-y-8'
          }`}>
          {/* Logo/Title */}
          <div className={`text-center transition-all duration-300 ${searchQuery ? 'space-y-1' : 'space-y-4'
            }`}>
            {mounted && settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className={`mx-auto object-contain transition-all duration-300 ${searchQuery ? 'max-h-12' : 'max-h-24'
                  } max-w-full`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {(mounted && (settings.showAppTitle || settings.showAppSubtitle)) || !mounted ? (
              <div className={`transition-all duration-300 ${searchQuery ? 'space-y-0' : 'space-y-2'
                }`}>
                {(mounted && settings.showAppTitle) || !mounted ? (
                  <h1 className={`font-bold tracking-tight transition-all duration-300 text-foreground dark:text-white ${searchQuery ? 'text-2xl' : 'text-5xl md:text-6xl'
                    }`}>
                    {mounted ? (settings.appTitle || 'FileFinder') : 'FileFinder'}
                  </h1>
                ) : null}
                {(mounted && settings.showAppSubtitle) || !mounted ? (
                  <p className={`transition-all duration-300 text-gray-600 dark:text-gray-300 ${searchQuery ? 'text-xs' : 'text-lg'
                    }`}>
                    {mounted ? (settings.appSubtitle || 'Encuentra tus archivos locales al instante') : 'Encuentra tus archivos locales al instante'}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Sections */}
          {sections.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {sections.map((section) => {
                const isActive = section.id === activeSectionId;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-muted hover:border-primary/50'
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </div>
          )}
          {activeSection?.description && (
            <p className="text-center text-xs text-muted-foreground">
              {activeSection.description}
            </p>
          )}

          {/* Search Box */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground dark:text-gray-400" />
              <Input
                type="search"
                placeholder={activeSection ? `Buscar ${activeSection.label.toLowerCase()} por nombre o ruta...` : 'Buscar por nombre o ruta...'}
                className="w-full pl-12 pr-4 h-12 text-base rounded-full shadow-lg border-2 border-transparent focus:border-primary bg-card dark:bg-slate-800 text-foreground dark:text-white placeholder-muted-foreground dark:placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => searchQuery && setShowResults(true)}
              />
              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="absolute right-4 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-4 max-h-96 overflow-y-auto rounded-lg border border-primary/30 dark:border-primary/50 bg-card dark:bg-slate-800 shadow-lg z-50">
                {isIndexing ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {searchResults.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleCopyPath(doc.ruta, doc.id);
                            }}
                            className="p-2 rounded hover:bg-accent/20 dark:hover:bg-accent/30 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors flex-shrink-0"
                            title="Copiar ruta"
                          >
                          {copiedId === doc.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <DocumentDetailsDialog document={doc} />
                        <DocumentMetadataEditor
                          document={doc}
                          sectionId={activeSection?.id || "default"}
                          onSaved={handleMetadataSaved}
                        />
                        </div>

                        <a
                          href={`/api/files?path=${encodeURIComponent(doc.ruta)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="overflow-hidden min-w-0 flex-1 ml-3"
                          onClick={() => {
                            if (searchQuery.trim()) {
                              recordSearchStat(searchQuery);
                            }
                            addSearch(doc);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate text-foreground dark:text-white">{doc.nombre}</p>
                            {getPrecioLabel(doc) && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {getPrecioLabel(doc)}
                              </span>
                            )}
                            {(() => {
                              const ext = getFileExtension(doc.nombre);
                              const colors = getExtensionColor(ext);
                              return (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${colors.bg} ${colors.text}`}>
                                  {ext.toUpperCase()}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-gray-400 truncate">{doc.ruta}</p>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="p-8 text-center">
                    <Frown className="mx-auto h-8 w-8 text-gray-500 dark:text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sin resultados para "{searchQuery}"
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Recent and Trending Searches */}
          {/* Recent and Trending Searches */}
          {shouldRenderHistoryPanel && (
            <div className="space-y-6 mt-8">
              <RecentSearches
                searches={recentSearches}
                onClear={clearHistory}
                onVisibilityChange={setIsHistoryPanelOpen}
                onOpenResult={(entry) => {
                  // Increment the counter by calling addSearch when opening a recent file
                  addSearch(entry.document);
                }}
                onRemoveEntry={(entry) => removeSearch(entry.document)}
                onMetadataSaved={handleMetadataSaved}
                sectionId={activeSection?.id || "default"}
              />
            </div>
          )}

          {/* Footer Info */}
          {!showResults && !isIndexing && (
            <div className="text-center py-8 text-sm text-gray-600 dark:text-gray-400">
              <p>{documents.length} archivos indexados en {activeSection?.label ?? 'esta sección'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



