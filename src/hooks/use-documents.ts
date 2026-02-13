import { useState, useEffect, useMemo } from "react";
import MiniSearch from "minisearch";
import { mergeDocumentsWithMetadataMap, type MetadataByDocumentId } from "@/lib/document-metadata";

export interface Document {
  id: number;
  nombre: string;
  ruta: string;
  metadata?: Record<string, string | number | undefined>;
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
}

const AVAILABLE_SECTIONS = [
  { id: "todos", label: "Todos", file: "documents.json" },
  { id: "curriculum", label: "Curriculum", file: "documents-curriculum.json" },
  { id: "clientes", label: "Clientes", file: "documents-clientes.json" },
  { id: "libros", label: "Libros", file: "documents-libros.json" },
];

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Cargar documentos de la sección seleccionada
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const section = AVAILABLE_SECTIONS.find((s) => s.id === selectedSection);
        if (!section) return;

        const metadataSectionId = section.id === "todos" ? "default" : section.id;

        const [documentsResponse, metadataResponse] = await Promise.all([
          fetch(`/data/${section.file}`),
          fetch(`/api/documents-metadata?sectionId=${encodeURIComponent(metadataSectionId)}`),
        ]);

        if (!documentsResponse.ok) {
          throw new Error(`Failed to load documents file (${documentsResponse.status})`);
        }

        const data = await documentsResponse.json() as { documents?: Document[] };

        let metadataByDocumentId: MetadataByDocumentId = {};
        if (metadataResponse.ok) {
          const metadataPayload = await metadataResponse.json();
          if (metadataPayload?.metadataByDocumentId && typeof metadataPayload.metadataByDocumentId === "object") {
            metadataByDocumentId = metadataPayload.metadataByDocumentId as MetadataByDocumentId;
          }
        } else {
          console.warn("Failed to load external metadata:", metadataResponse.status);
        }

        const mergedDocuments = mergeDocumentsWithMetadataMap(data.documents || [], metadataByDocumentId);
        setDocuments(mergedDocuments);
      } catch (error) {
        console.error("Error loading documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [selectedSection]);

  // Configurar MiniSearch
  const miniSearch = useMemo(() => {
    const ms = new MiniSearch({
      fields: ["nombre", "ruta"],
      storeFields: ["id", "nombre", "ruta", "precio", "metadata", "maestro", "paginas", "universidad"],
      searchOptions: {
        boost: { nombre: 2 },
        fuzzy: 0.2,
      },
    });
    ms.addAll(documents);
    return ms;
  }, [documents]);

  // Buscar documentos
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }
    const results = miniSearch.search(searchQuery);
    return results.map((result) =>
      documents.find((doc) => doc.id === result.id)
    ).filter(Boolean) as Document[];
  }, [searchQuery, documents, miniSearch]);

  // Paginación
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
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

  const updateDocumentPrice = (docId: number, price: number) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === docId ? { ...doc, precio: price } : doc
      )
    );
  };

  const updateDocument = (updated: Partial<Document> & { id: number }) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => (doc.id === updated.id ? { ...doc, ...updated } : doc))
    );
  };

  return {
    documents: paginatedDocuments,
    allDocuments: documents,
    availableSections: AVAILABLE_SECTIONS,
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
