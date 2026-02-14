"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import MiniSearch from "minisearch";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon } from "@/components/file-icon";
import { Search, Frown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

type Document = {
  id: string;
  nombre: string;
  ruta: string;
};

type SearchResult = Document & {
  score: number;
  match: Record<string, string[]>;
};

export function FileSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | Document[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isIndexing, setIsIndexing] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { settings, isLoaded } = useSettings();

  const miniSearch = useRef<MiniSearch<Document>>(
    new MiniSearch({
      fields: ["nombre", "ruta"],
      storeFields: ["nombre", "ruta"],
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

  const initializeIndex = useCallback(async () => {
    setIsIndexing(true);
    try {
      const response = await fetch('/api/documents?sectionId=default');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: { documents: Document[] } = await response.json();
      miniSearch.current.removeAll();
      miniSearch.current.addAll(data.documents);
      setDocuments(data.documents);
      setSearchResults(data.documents.slice(0, 6));
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
    if (isLoaded) {
      initializeIndex();
    }
  }, [initializeIndex, isLoaded]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    startTransition(() => {
      if (query.length > 0) {
        const results = miniSearch.current.search(query) as any as SearchResult[];
        setSearchResults(results.slice(0, 6));
      } else {
        setSearchResults(documents.slice(0, 6));
      }
    });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">
          Document Search
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Find your local files instantly.
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or path..."
            className="w-full pl-10"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isIndexing ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </Card>
          ))
        ) : searchResults.length > 0 ? (
          searchResults.map((doc, index) => (
             <a
              key={doc.id}
              href={`/api/files?path=${encodeURIComponent(doc.ruta)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card 
                className="p-4 hover:border-primary hover:shadow-md transition-all duration-300 animate-in fade-in-0 cursor-pointer" 
                style={{animationDelay: `${index * 50}ms`}}
              >
                <div className="flex items-center gap-4">
                  <FileIcon filename={doc.nombre} className="h-8 w-8 text-accent flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-medium truncate" title={doc.nombre}>{doc.nombre}</p>
                    <p className="text-sm text-muted-foreground truncate" title={doc.ruta}>{doc.ruta}</p>
                  </div>
                </div>
              </Card>
            </a>
          ))
        ) : (
          <div className="text-center py-16">
            <Frown className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your search for "{searchQuery}" did not match any documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
