"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type DocumentMetadata = {
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
  [key: string]: string | number | undefined;
};

export type DocumentWithMetadata = {
  id: string;
  nombre: string;
  ruta: string;
  metadata?: DocumentMetadata;
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
};

type ExtraMetadataField = {
  id: number;
  key: string;
  value: string;
};

type DocumentMetadataEditorProps = {
  document: DocumentWithMetadata;
  sectionId: string;
  onSaved?: (document: DocumentWithMetadata) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

const knownKeys = ["maestro", "paginas", "precio", "universidad"];

function normalizeMetadata(doc: DocumentWithMetadata): DocumentMetadata {
  const merged: DocumentMetadata = { ...(doc.metadata || {}) };
  if (doc.maestro !== undefined && merged.maestro === undefined) merged.maestro = doc.maestro;
  if (doc.paginas !== undefined && merged.paginas === undefined) merged.paginas = doc.paginas;
  if (doc.precio !== undefined && merged.precio === undefined) merged.precio = doc.precio;
  if (doc.universidad !== undefined && merged.universidad === undefined) merged.universidad = doc.universidad;
  return merged;
}

function parseMaybeNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

export function DocumentMetadataEditor({ document, sectionId, onSaved, open, onOpenChange, showTrigger = true }: DocumentMetadataEditorProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nextExtraIdRef = useRef(0);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (typeof onOpenChange === "function") onOpenChange(v);
    if (!controlled) setInternalOpen(v);
  };

  const initialMetadata = useMemo(() => normalizeMetadata(document), [document]);

  const [maestro, setMaestro] = useState("");
  const [paginas, setPaginas] = useState("");
  const [precio, setPrecio] = useState("");
  const [universidad, setUniversidad] = useState("");
  const [extras, setExtras] = useState<ExtraMetadataField[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setMaestro(String(initialMetadata.maestro ?? ""));
    setPaginas(String(initialMetadata.paginas ?? ""));
    setPrecio(String(initialMetadata.precio ?? ""));
    setUniversidad(String(initialMetadata.universidad ?? ""));

    const extraEntries = Object.keys(initialMetadata)
      .filter((key) => !knownKeys.includes(key))
      .map((key) => ({
        id: nextExtraIdRef.current++,
        key,
        value: String(initialMetadata[key] ?? ""),
      }));

    setExtras(extraEntries);
  }, [isOpen, initialMetadata]);

  const handleAddExtra = () => {
    setExtras((prev) => [...prev, { id: nextExtraIdRef.current++, key: "", value: "" }]);
  };

  const handleExtraChange = (index: number, field: "key" | "value", value: string) => {
    setExtras((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveExtra = (index: number) => {
    setExtras((prev) => prev.filter((_, i) => i !== index));
  };

  const buildMetadata = () => {
    const metadata: Record<string, string | number> = {};

    const maybeAssign = (key: string, value: string | number | undefined) => {
      if (value === undefined || value === null || value === "") return;
      metadata[key] = value;
    };

    maybeAssign("maestro", maestro.trim());
    maybeAssign("universidad", universidad.trim());
    maybeAssign("paginas", parseMaybeNumber(paginas));
    maybeAssign("precio", parseMaybeNumber(precio));

    extras.forEach((entry) => {
      const key = entry.key.trim();
      const value = entry.value.trim();
      if (!key || !value) return;
      if (knownKeys.includes(key)) return;
      maybeAssign(key, parseMaybeNumber(value));
    });

    return metadata;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const metadata = buildMetadata();
      const response = await fetch("/api/documents-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: sectionId || "default",
          documentId: document.id,
          metadata,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save metadata");
      }

      const data = await response.json();
      if (data?.document) {
        onSaved?.(data.document);
      }

      toast({
        title: "Guardado",
        description: "Metadatos actualizados.",
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to save metadata:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los metadatos.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {showTrigger !== false && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Editar metadatos">
            <Pencil className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar metadatos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{document.nombre}</p>
            <p className="text-xs text-muted-foreground break-all">{document.ruta}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meta-maestro">Maestro</Label>
              <Input
                id="meta-maestro"
                value={maestro}
                onChange={(e) => setMaestro(e.target.value)}
                placeholder="Nombre del maestro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-universidad">Universidad</Label>
              <Input
                id="meta-universidad"
                value={universidad}
                onChange={(e) => setUniversidad(e.target.value)}
                placeholder="Nombre de la universidad"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-paginas">Paginas</Label>
              <Input
                id="meta-paginas"
                value={paginas}
                onChange={(e) => setPaginas(e.target.value)}
                placeholder="Cantidad de paginas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-precio">Precio</Label>
              <Input
                id="meta-precio"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Precio"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Metadatos adicionales</p>
              <Button variant="outline" size="sm" onClick={handleAddExtra}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar campo
              </Button>
            </div>
            {extras.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay metadatos adicionales.</p>
            ) : (
              <div className="space-y-3">
                {extras.map((entry, index) => (
                  <div key={entry.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input
                      value={entry.key}
                      onChange={(e) => handleExtraChange(index, "key", e.target.value)}
                      placeholder="Clave"
                    />
                    <Input
                      value={entry.value}
                      onChange={(e) => handleExtraChange(index, "value", e.target.value)}
                      placeholder="Valor"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExtra(index)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
