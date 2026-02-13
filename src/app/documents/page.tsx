import { DocumentsTable } from "@/components/documents-table";

export const metadata = {
  title: "Documentos | FileFinder",
  description: "Gestiona y busca tus documentos",
};

export default function DocumentsPage() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
            <p className="text-muted-foreground mt-2">
              Busca, organiza y gestiona todos tus documentos en un solo lugar.
            </p>
          </div>

          <DocumentsTable />
        </div>
      </div>
    </main>
  );
}
