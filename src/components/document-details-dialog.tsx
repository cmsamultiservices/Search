"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export type DocumentMetadata = {
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
  [key: string]: string | number | undefined;
};

export type DocumentWithMetadata = {
  nombre: string;
  ruta: string;
  metadata?: DocumentMetadata;
  maestro?: string;
  paginas?: number | string;
  precio?: number | string;
  universidad?: string;
};

type DocumentDetailsDialogProps = {
  document: DocumentWithMetadata;
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

function formatValue(value: string | number | undefined) {
  if (value === undefined || value === null || value === "") return "-";
  return value;
}

export function DocumentDetailsDialog({ document }: DocumentDetailsDialogProps) {
  const metadata = normalizeMetadata(document);
  const extraKeys = Object.keys(metadata).filter((key) => !knownKeys.includes(key));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ver detalles">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalles del archivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{document.nombre}</p>
            <p className="text-xs text-muted-foreground break-all">{document.ruta}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Maestro</p>
              <p className="font-medium">{formatValue(metadata.maestro)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paginas</p>
              <p className="font-medium">{formatValue(metadata.paginas)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="font-medium">{formatValue(metadata.precio)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Universidad</p>
              <p className="font-medium">{formatValue(metadata.universidad)}</p>
            </div>
          </div>
          {extraKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Otros</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {extraKeys.map((key) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="font-medium">{formatValue(metadata[key])}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
