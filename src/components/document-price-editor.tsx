"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const documentPriceSchema = z.object({
  precio: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo")
    .optional(),
});

type DocumentPriceFormValues = z.infer<typeof documentPriceSchema>;

interface DocumentPriceEditorProps {
  open: boolean;
  document: {
    id: number;
    nombre: string;
    precio?: number;
  } | null;
  onOpenChange: (open: boolean) => void;
  onSave: (docId: number, precio: number) => void;
}

export function DocumentPriceEditor({
  open,
  document,
  onOpenChange,
  onSave,
}: DocumentPriceEditorProps) {
  const form = useForm<DocumentPriceFormValues>({
    resolver: zodResolver(documentPriceSchema),
    defaultValues: {
      precio: document?.precio || 0,
    },
  });

  const onSubmit = (values: DocumentPriceFormValues) => {
    if (document) {
      onSave(document.id, values.precio || 0);
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Precio del Documento</DialogTitle>
          <DialogDescription>
            Ajusta el precio para: <strong>{document?.nombre}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ingresa el precio en tu moneda local
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Precio</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
