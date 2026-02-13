"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, RotateCcw, Plus, X, Zap, Upload, Sun, Moon, Monitor } from "lucide-react";
import { useSettings, DEFAULT_SECTIONS, Section } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

type Theme = 'light' | 'dark' | 'system';

export function SettingsDialog() {
  const { settings, updateSettings, resetSettings, isLoaded } = useSettings();
  const { theme, updateTheme } = useTheme();
  const [newPath, setNewPath] = useState("");
  const [appTitle, setAppTitle] = useState("FileFinder");
  const [appSubtitle, setAppSubtitle] = useState("Find your local files instantly");
  const [logoUrl, setLogoUrl] = useState("");
  const [showAppTitle, setShowAppTitle] = useState(true);
  const [showAppSubtitle, setShowAppSubtitle] = useState(true);
  const [useAbrirAdobe, setUseAbrirAdobe] = useState(false);
  const [fileExtensions, setFileExtensions] = useState<string[]>(['pdf', 'docx']);
  const [newExtension, setNewExtension] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme>('system');
  const [sections, setSections] = useState<Section[]>([]);
  const [indexSectionId, setIndexSectionId] = useState("");
  const [duplicateFromSectionId, setDuplicateFromSectionId] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const COMMON_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'doc', 'xls', 'ppt', 'jpg', 'png', 'zip', 'rar'];
  const activeIndexSection = sections.find((section) => section.id === indexSectionId) || sections[0];
  const activeIndexPaths = activeIndexSection?.indexPaths || [];

  const normalizeSectionId = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');

  const handleAddSection = () => {
    const id = normalizeSectionId(newSectionId);
    const label = newSectionLabel.trim();
    if (!id || !label) {
      toast({
        title: 'Error',
        description: 'La seccion necesita un ID y un nombre',
        variant: 'destructive',
      });
      return;
    }

    if (sections.some((section) => section.id === id)) {
      toast({
        title: 'Error',
        description: 'Ya existe una seccion con ese ID',
        variant: 'destructive',
      });
      return;
    }

    const newSection: Section = {
      id,
      label,
      description: newSectionDescription.trim(),
      documentsPath: `/data/documents-${id}.json`,
      statsPath: `/data/search-stats-${id}.json`,
      indexPaths: [],
    };

    setSections([...sections, newSection]);
    if (!indexSectionId) {
      setIndexSectionId(id);
    }
    setNewSectionId('');
    setNewSectionLabel('');
    setNewSectionDescription('');
  };

  const handleRemoveSection = (id: string) => {
    const updated = sections.filter((section) => section.id !== id);
    setSections(updated);
    if (indexSectionId === id) {
      setIndexSectionId(updated[0]?.id || "");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El tamaño de la imagen debe ser menor a 2MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setLogoUrl(base64String);
      toast({
        title: "Éxito",
        description: "Imagen cargada correctamente",
      });
    };
    reader.readAsDataURL(file);

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddPath = () => {
    if (!activeIndexSection) {
      toast({
        title: "Error",
        description: "Primero selecciona una sección para indexar",
        variant: "destructive",
      });
      return;
    }

    if (!newPath.trim()) {
      toast({
        title: "Error",
        description: "La ruta no puede estar vacía",
        variant: "destructive",
      });
      return;
    }

    if (activeIndexPaths.includes(newPath.trim())) {
      toast({
        title: "Error",
        description: "Esta ruta ya ha sido añadida",
        variant: "destructive",
      });
      return;
    }

    setSections(sections.map((section) =>
      section.id === activeIndexSection.id
        ? { ...section, indexPaths: [...activeIndexPaths, newPath.trim()] }
        : section
    ));
    setNewPath("");
  };

  const handleRemovePath = (pathToRemove: string) => {
    if (!activeIndexSection) return;
    setSections(sections.map((section) =>
      section.id === activeIndexSection.id
        ? { ...section, indexPaths: activeIndexPaths.filter(p => p !== pathToRemove) }
        : section
    ));
  };

  const handleAddExtension = (ext: string) => {
    const lowerExt = ext.toLowerCase().trim().replace(/^\./, '');
    if (!lowerExt) {
      toast({
        title: "Error",
        description: "La extensión no puede estar vacía",
        variant: "destructive",
      });
      return;
    }

    if (fileExtensions.includes(lowerExt)) {
      toast({
        title: "Error",
        description: "Esta extensión ya ha sido añadida",
        variant: "destructive",
      });
      return;
    }

    setFileExtensions([...fileExtensions, lowerExt]);
  };

  const handleRemoveExtension = (extToRemove: string) => {
    setFileExtensions(fileExtensions.filter(e => e !== extToRemove));
  };

  const handleDuplicatePaths = () => {
    if (!activeIndexSection) {
      toast({
        title: "Error",
        description: "Primero selecciona una sección para indexar",
        variant: "destructive",
      });
      return;
    }

    if (!duplicateFromSectionId) {
      toast({
        title: "Error",
        description: "Selecciona una sección origen",
        variant: "destructive",
      });
      return;
    }

    const source = sections.find((section) => section.id === duplicateFromSectionId);
    if (!source) {
      toast({
        title: "Error",
        description: "La sección origen no existe",
        variant: "destructive",
      });
      return;
    }

    const sourcePaths = source.indexPaths || [];
    const merged = Array.from(new Set([...(activeIndexSection.indexPaths || []), ...sourcePaths]));

    setSections(sections.map((section) =>
      section.id === activeIndexSection.id
        ? { ...section, indexPaths: merged }
        : section
    ));

    toast({
      title: "Listo",
      description: "Rutas duplicadas correctamente",
    });
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        indexPaths: settings.indexPaths || [],
        appTitle: appTitle.trim() || 'Buscador de Archivos',
        appSubtitle: appSubtitle.trim(),
        logoUrl,
        showAppTitle,
        showAppSubtitle,
        useAbrirAdobe,
        fileExtensions,
        sections,
      });

      toast({
        title: "Éxito",
        description: "Configuración guardada correctamente",
      });

      setOpen(false);

      // Recargar la página después de guardar
      setTimeout(() => {
        location.reload();
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      setAppTitle('Buscador de Archivos');
      setAppSubtitle('Encuentra tus archivos locales al instante');
      setLogoUrl('');
      setShowAppTitle(true);
      setShowAppSubtitle(true);
      setUseAbrirAdobe(false);
      setFileExtensions(['pdf', 'docx']);
      setSections(DEFAULT_SECTIONS);
      setIndexSectionId(DEFAULT_SECTIONS[0]?.id || "");
      setDuplicateFromSectionId("");
      setNewPath("");
      setNewExtension("");
      toast({
        title: "Reinicio",
        description: "La configuración ha sido reiniciada a los valores por defecto",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo reiniciar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleSyncDocuments = async () => {
    if (!activeIndexSection) {
      toast({
        title: "Error",
        description: "Primero selecciona una sección para indexar",
        variant: "destructive",
      });
      return;
    }

    if (activeIndexPaths.length === 0) {
      toast({
        title: "Error",
        description: "Por favor añade al menos una ruta de indexación",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/index-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ indexPaths: activeIndexPaths, sectionId: activeIndexSection.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'No se pudo sincronizar documentos');
      }

      const data = await response.json();
      toast({
        title: "Éxito",
        description: `Se indexaron ${data.count} archivos correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'No se pudo sincronizar documentos',
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && isLoaded) {
      setAppTitle(settings.appTitle || "Buscador de Archivos");
      setAppSubtitle(settings.appSubtitle || "Encuentra tus archivos locales al instante");
      setLogoUrl(settings.logoUrl || "");
      setShowAppTitle(settings.showAppTitle ?? true);
      setShowAppSubtitle(settings.showAppSubtitle ?? true);
      setFileExtensions(settings.fileExtensions || ['pdf', 'docx']);
      const loadedSections = settings.sections && settings.sections.length ? settings.sections : DEFAULT_SECTIONS;
      setSections(loadedSections.map((section) => ({
        ...section,
        indexPaths: section.indexPaths || [],
      })));
      setIndexSectionId(loadedSections[0]?.id || "");
      setDuplicateFromSectionId("");
      setNewSectionId("");
      setNewSectionLabel("");
      setNewSectionDescription("");
      setSelectedTheme((localStorage.getItem('file-finder-theme') as Theme) || 'system');
      setNewPath("");
      setNewExtension("");
    }
    setOpen(newOpen);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Configuración">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>
            Configura las rutas de indexación y ajustes de la aplicación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Branding Section */}
          <div className="space-y-4 border-b pb-4">
            <Label>Marca</Label>

            <div className="space-y-2">
              <Label className="text-sm">Imagen del Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Sube una imagen o pega una URL
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 flex-1"
                >
                  <Upload className="h-4 w-4" />
                  Subir Imagen
                </Button>
              </div>

              <input
                title="Subir imagen del logo"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="space-y-2">
                <Label htmlFor="logo-url-input" className="text-xs">O pega la URL de la imagen:</Label>
                <Input
                  id="logo-url-input"
                  placeholder="https://ejemplo.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Las imágenes se guardan en formato base64 cuando se suben. Tamaño máximo: 2MB
              </p>

              {logoUrl && (
                <div className="mt-3 p-3 border rounded-md flex justify-center bg-muted/50">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-16 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="app-title" className="text-sm">Título de la App</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-title"
                    checked={showAppTitle}
                    onCheckedChange={(checked) => setShowAppTitle(checked as boolean)}
                  />
                  <Label htmlFor="show-title" className="text-xs font-normal cursor-pointer">Mostrar</Label>
                </div>
              </div>
              <Input
                id="app-title"
                placeholder="Buscador de Archivos"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="app-subtitle" className="text-sm">Subtítulo</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-subtitle"
                    checked={showAppSubtitle}
                    onCheckedChange={(checked) => setShowAppSubtitle(checked as boolean)}
                  />
                  <Label htmlFor="show-subtitle" className="text-xs font-normal cursor-pointer">Mostrar</Label>
                </div>
              </div>
              <Input
                id="app-subtitle"
                placeholder="Encuentra tus archivos locales al instante"
                value={appSubtitle}
                onChange={(e) => setAppSubtitle(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tema</Label>
            <p className="text-xs text-muted-foreground">
              Elige tu tema de color preferido
            </p>
            <div className="flex gap-2">
              <Button
                variant={selectedTheme === 'light' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedTheme('light');
                  updateTheme('light');
                }}
                size="sm"
                className="gap-2"
              >
                <Sun className="h-4 w-4" />
                Claro
              </Button>
              <Button
                variant={selectedTheme === 'dark' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedTheme('dark');
                  updateTheme('dark');
                }}
                size="sm"
                className="gap-2"
              >
                <Moon className="h-4 w-4" />
                Oscuro
              </Button>
              <Button
                variant={selectedTheme === 'system' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedTheme('system');
                  updateTheme('system');
                }}
                size="sm"
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                Sistema
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Rutas de Indexación</Label>
            <p className="text-xs text-muted-foreground">
              Añade directorios para escanear archivos y crear el índice por sección
            </p>

            <div className="space-y-2">
              <Label className="text-xs">Sección a indexar</Label>
              <select
                value={activeIndexSection?.id || ""}
                onChange={(e) => setIndexSectionId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label} ({section.indexPaths?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Duplicar rutas desde</Label>
                <select
                  value={duplicateFromSectionId}
                  onChange={(e) => setDuplicateFromSectionId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecciona una sección</option>
                  {sections
                    .filter((section) => section.id !== activeIndexSection?.id)
                    .map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label} ({section.indexPaths?.length || 0})
                      </option>
                    ))}
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicatePaths}
                className="h-10"
              >
                Duplicar
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="p.ej., C:\\Users\\Documentos o /home/usuario/archivos"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPath()}
                className="flex-1"
              />
              <Button
                onClick={handleAddPath}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeIndexPaths.length === 0 ? (
                <Card className="p-3 bg-muted/50 border-0 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aún no hay rutas añadidas
                  </p>
                </Card>
              ) : (
                activeIndexPaths.map((path) => (
                  <Card
                    key={path}
                    className="p-3 flex items-center justify-between bg-muted/50 border-0"
                  >
                    <p className="text-sm break-all flex-1">{path}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePath(path)}
                      className="ml-2 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Secciones</Label>
            <p className="text-xs text-muted-foreground">
              Crea secciones personalizadas para organizar busquedas
            </p>

            <div className="grid gap-2">
              <Input
                placeholder="ID (ej: libros, curriculum)"
                value={newSectionId}
                onChange={(e) => setNewSectionId(e.target.value)}
              />
              <Input
                placeholder="Nombre (ej: Libros, Curriculum)"
                value={newSectionLabel}
                onChange={(e) => setNewSectionLabel(e.target.value)}
              />
              <Input
                placeholder="Descripcion (opcional)"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
              />
              <Button onClick={handleAddSection} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Anadir Seccion
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sections.length === 0 ? (
                <Card className="p-3 bg-muted/50 border-0 text-center">
                  <p className="text-sm text-muted-foreground">No hay secciones creadas</p>
                </Card>
              ) : (
                sections.map((section) => (
                  <Card
                    key={section.id}
                    className="p-3 space-y-2 bg-muted/50 border-0"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{section.label}</p>
                      <span className="text-xs text-muted-foreground">
                        Rutas: {section.indexPaths?.length || 0}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSection(section.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">ID</Label>
                      <Input value={section.id} disabled />
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        value={section.label}
                        onChange={(e) =>
                          setSections(sections.map((item) =>
                            item.id === section.id ? { ...item, label: e.target.value } : item
                          ))
                        }
                      />
                      <Label className="text-xs">Descripcion</Label>
                      <Input
                        value={section.description || ""}
                        onChange={(e) =>
                          setSections(sections.map((item) =>
                            item.id === section.id ? { ...item, description: e.target.value } : item
                          ))
                        }
                      />
                      <p className="text-xs text-muted-foreground">Archivos: {section.documentsPath}</p>
                      <p className="text-xs text-muted-foreground">Stats: {section.statsPath}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Extensiones de Archivo</Label>
            <p className="text-xs text-muted-foreground">
              Selecciona qué tipos de archivos incluir en los resultados de búsqueda
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="p.ej., pdf, docx, xlsx"
                value={newExtension}
                onChange={(e) => setNewExtension(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExtension(newExtension)}
                className="flex-1"
              />
              <Button
                onClick={() => handleAddExtension(newExtension)}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">Añadir rápido:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_EXTENSIONS.map((ext) => (
                  <Button
                    key={ext}
                    variant={fileExtensions.includes(ext) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (fileExtensions.includes(ext)) {
                        handleRemoveExtension(ext);
                      } else {
                        handleAddExtension(ext);
                      }
                    }}
                    className="text-xs"
                  >
                    .{ext}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {fileExtensions.length === 0 ? (
                <Card className="p-3 bg-muted/50 border-0 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay extensiones seleccionadas
                  </p>
                </Card>
              ) : (
                <Card className="p-3 bg-muted/50 border-0">
                  <div className="flex flex-wrap gap-2">
                    {fileExtensions.map((ext) => (
                      <div
                        key={ext}
                        className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm flex items-center gap-2"
                      >
                        .{ext}
                        <button
                          title="Eliminar extensión"
                          type="button"
                          onClick={() => handleRemoveExtension(ext)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar
          </Button>
          <Button
            onClick={handleSyncDocuments}
            disabled={isSyncing || activeIndexPaths.length === 0}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Documentos'}
          </Button>
          <Button onClick={handleSave}>Guardar Configuración</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
