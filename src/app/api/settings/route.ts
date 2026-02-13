import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'public', 'setting.json');

const DEFAULT_SECTIONS = [
  {
    id: 'libros',
    label: 'Libros',
    description: 'Busca libros y PDFs',
    documentsPath: '/data/documents-libros.json',
    statsPath: '/data/search-stats-libros.json',
    indexPaths: [],
  },
  {
    id: 'curriculum',
    label: 'Curriculum',
    description: 'CVs y perfiles profesionales',
    documentsPath: '/data/documents-curriculum.json',
    statsPath: '/data/search-stats-curriculum.json',
    indexPaths: [],
  },
];

function safePublicPath(relativeUrl: string) {
  if (!relativeUrl || typeof relativeUrl !== 'string') return null;
  if (!relativeUrl.startsWith('/data/')) return null;
  if (!relativeUrl.endsWith('.json')) return null;
  const clean = relativeUrl.replace(/^\//, '');
  return path.join(process.cwd(), 'public', clean);
}

async function ensureSectionFiles(sections: any[]) {
  if (!Array.isArray(sections)) return;
  for (const section of sections) {
    const docsPath = safePublicPath(section?.documentsPath);
    const statsPath = safePublicPath(section?.statsPath);

    if (docsPath) {
      try {
        await fs.access(docsPath);
      } catch {
        await fs.mkdir(path.dirname(docsPath), { recursive: true });
        await fs.writeFile(docsPath, JSON.stringify({ documents: [] }, null, 2), 'utf-8');
      }
    }

    if (statsPath) {
      try {
        await fs.access(statsPath);
      } catch {
        await fs.mkdir(path.dirname(statsPath), { recursive: true });
        await fs.writeFile(statsPath, JSON.stringify([], null, 2), 'utf-8');
      }
    }
  }
}

async function validateSectionIndexPaths(sections: any[]) {
  const missing: Array<{ sectionId: string; path: string }> = [];
  if (!Array.isArray(sections)) return missing;
  for (const section of sections) {
    const sectionId = section?.id || 'unknown';
    const paths: string[] = Array.isArray(section?.indexPaths) ? section.indexPaths : [];
    for (const rawPath of paths) {
      if (!rawPath || typeof rawPath !== 'string') continue;
      try {
        await fs.access(rawPath);
      } catch {
        missing.push({ sectionId, path: rawPath });
      }
    }
  }
  return missing;
}

export async function GET() {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    // Return default settings if file doesn't exist
    return NextResponse.json({
      appTitle: 'FileFinder',
      appSubtitle: 'Find your local files instantly',
      logoUrl: '',
      showAppTitle: true,
      showAppSubtitle: true,
      useAbrirAdobe: false,
      indexPaths: [],
      fileExtensions: ['pdf', 'docx', 'txt', 'xlsx', 'pptx'],
      sections: DEFAULT_SECTIONS,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.appTitle || !body.appSubtitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure section files exist
    await ensureSectionFiles(body.sections || []);

    // Validate index paths per section
    const missing = await validateSectionIndexPaths(body.sections || []);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Hay rutas que no existen. Corrige las rutas antes de guardar.',
          missing,
        },
        { status: 400 }
      );
    }

    // Write settings to file
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(body, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      settings: body,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
