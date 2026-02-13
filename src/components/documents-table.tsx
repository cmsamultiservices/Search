"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, FileIcon, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentMetadataEditor } from "@/components/document-metadata-editor";
import { useDocuments, type Document } from "@/hooks/use-documents";

export function DocumentsTable() {
  const {
    documents,
    searchQuery,
    handleSearch,
    itemsPerPage,
    handleItemsPerPageChange,
    availableSections,
    selectedSection,
    setSelectedSection,
    currentPage,
    handlePageChange,
    totalPages,
    filteredTotal,
    loading,
    updateDocumentPrice,
    updateDocument,
  } = useDocuments();

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleOpenEditor = (doc: Document) => {
    setSelectedDocument(doc);
    setIsEditorOpen(true);
  };

  const handleSavePrice = (docId: number, precio: number) => {
    updateDocumentPrice(docId, precio);
  };

  const handleOpenFile = (ruta: string) => {
    if (!ruta) return;
    // create file:// url
    const normalized = ruta.replace(/\\/g, "/");
    let url = normalized;
    if (!/^https?:\/\//i.test(normalized) && !/^file:\/\//i.test(normalized)) {
      if (/^[A-Za-z]:\//.test(normalized)) url = `file:///${normalized}`;
    }
    try {
      window.open(url, "_blank");
    } catch (e) {
      console.error("Unable to open file url:", url, e);
    }
  };

  const getFileExtension = (nombre: string) => {
    return nombre.split(".").pop()?.toUpperCase() || "FILE";
  };

  const formatPrecio = (precio: number | string | undefined) => {
    if (precio === undefined || precio === null || precio === "") return null;
    if (typeof precio === "number") return `$${precio.toFixed(2)}`;
    return String(precio);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando documentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o ruta..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Info y controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Mostrando {documents.length} de {filteredTotal} documentos
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Sección */}
          {availableSections && availableSections.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sección:</span>
              <Select
                value={selectedSection}
                onValueChange={(value) => setSelectedSection(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Por página:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Archivo</TableHead>
              <TableHead className="hidden md:table-cell">Ruta</TableHead>
              <TableHead className="text-center">Precio</TableHead>
              <TableHead className="text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-accent">
                  <TableCell className="font-medium max-w-xs">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{doc.nombre}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getFileExtension(doc.nombre)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs">
                    <p className="truncate text-sm text-muted-foreground">
                      {doc.ruta}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatPrecio(doc.precio) ? (
                      <span className="font-semibold">{formatPrecio(doc.precio)}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin precio</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Abrir"
                        onClick={() => handleOpenFile(doc.ruta)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditor(doc)}
                      >
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No se encontraron documentos
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={
                      currentPage === pageNum ? "default" : "outline"
                    }
                    size="sm"
                    className="min-w-10"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Editor de precio */}
      <DocumentMetadataEditor
        document={
          (selectedDocument as any) || { id: -1, nombre: "", ruta: "" }
        }
        sectionId={selectedSection}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        showTrigger={false}
        onSaved={(doc) => {
          if (doc?.id) {
            updateDocument(doc as any);
          }
          setIsEditorOpen(false);
        }}
      />
    </div>
  );
}
