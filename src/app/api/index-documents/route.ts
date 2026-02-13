import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Document {
  id: number;
  nombre: string;
  ruta: string;
}

function sanitizeSectionId(raw?: string) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.toLowerCase().replace(/[^a-z0-9-_]/g, '');
}

function getOutputPath(sectionId?: string, outputFile?: string) {
  if (outputFile) {
    return path.join(process.cwd(), 'public', 'data', outputFile);
  }
  const safeSectionId = sanitizeSectionId(sectionId);
  if (safeSectionId) {
    return path.join(process.cwd(), 'public', 'data', `documents-${safeSectionId}.json`);
  }
  return path.join(process.cwd(), 'public', 'data', 'documents.json');
}

async function getFilesRecursive(dirPath: string, baseId: number = 0): Promise<{ files: Document[]; nextId: number }> {
  const files: Document[] = [];
  let currentId = baseId;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Escanear subdirectorio recursivamente
        const { files: subFiles, nextId: newId } = await getFilesRecursive(fullPath, currentId);
        files.push(...subFiles);
        currentId = newId;
      } else if (entry.isFile()) {
        files.push({
          id: currentId++,
          nombre: entry.name,
          ruta: fullPath,
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return { files, nextId: currentId };
}

export async function POST(request: NextRequest) {
  try {
    const { indexPaths, sectionId, outputFile } = await request.json();

    if (!indexPaths || !Array.isArray(indexPaths) || indexPaths.length === 0) {
      return NextResponse.json(
        { error: 'No index paths provided' },
        { status: 400 }
      );
    }

    const allDocuments: Document[] = [];
    let currentId = 0;

    // Escanear cada ruta configurada
    for (const dirPath of indexPaths) {
      const { files, nextId } = await getFilesRecursive(dirPath, currentId);
      allDocuments.push(...files);
      currentId = nextId;
    }

    // Escribir el archivo documents.json en /public/data/
    const outputPath = getOutputPath(sectionId, outputFile);
    
    // Crear directorio si no existe
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Escribir archivo
    await fs.writeFile(
      outputPath,
      JSON.stringify({ documents: allDocuments }, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: `Indexed ${allDocuments.length} files`,
      count: allDocuments.length,
    });
  } catch (error) {
    console.error('Indexing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to index documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
