import { useState, useEffect, useMemo } from "react";
import MiniSearch from "minisearch";
import { useSettings, DEFAULT_SECTIONS } from "@/hooks/use-settings";

export interface Document {
  id: string;
  nombre: string;
  ruta: string;
  sectionId?: string;
  metadata?: Record<string, string | number | undefined>;
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
}

export function useDocuments() {
  const { settings, isLoaded: settingsLoaded } = useSettings();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const availableSections = useMemo(
    () => (settings.sections?.length ? settings.sections : DEFAULT_SECTIONS),
    [settings.sections]
  );

  const [selectedSection, setSelectedSection] = useState<string>(availableSections[0]?.id || "default");

  useEffect(() => {
    if (!settingsLoaded || availableSections.length === 0) return;

    const hasCurrent = availableSections.some((section) => section.id === selectedSection);
    if (!selectedSection || !hasCurrent) {
      setSelectedSection(availableSections[0].id);
    }
  }, [availableSections, selectedSection, settingsLoaded]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!settingsLoaded || !selectedSection) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/documents?sectionId=${encodeURIComponent(selectedSection)}`);

        if (!response.ok) {
          throw new Error(`Failed to load documents (${response.status})`);
        }

        const data = (await response.json()) as { documents?: Document[] };
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
      } catch (error) {
        console.error("Error loading documents:", error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [selectedSection, settingsLoaded]);

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch({
      fields: ["nombre", "ruta"],
      storeFields: ["id", "nombre", "ruta", "sectionId", "precio", "metadata", "maestro", "paginas", "universidad"],
      searchOptions: {
        boost: { nombre: 2 },
        fuzzy: 0.2,
      },
    });
    ms.addAll(documents);
    return ms;
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }
    const results = miniSearch.search(searchQuery);
    return results
      .map((result) => documents.find((doc) => doc.id === result.id))
      .filter(Boolean) as Document[];
  }, [searchQuery, documents, miniSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / itemsPerPage));
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const setSelectedSectionHandler = (section: string) => {
    setSelectedSection(section);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  const updateDocumentPrice = (docId: string, price: number) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => (doc.id === docId ? { ...doc, precio: price } : doc))
    );
  };

  const updateDocument = (updated: Partial<Document> & { id: string }) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => (doc.id === updated.id ? { ...doc, ...updated } : doc))
    );
  };

  return {
    documents: paginatedDocuments,
    allDocuments: documents,
    availableSections,
    selectedSection,
    setSelectedSection: setSelectedSectionHandler,
    searchQuery,
    handleSearch,
    itemsPerPage,
    handleItemsPerPageChange,
    currentPage,
    handlePageChange,
    totalPages,
    filteredTotal: filteredDocuments.length,
    loading,
    updateDocumentPrice,
    updateDocument,
  };
}
