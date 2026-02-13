import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_STATS_FILE = path.join(process.cwd(), 'public/data/search-stats.json');
const SECTION_ID_PATTERN = /[^a-z0-9-_]/g;

interface SearchStat {
  query: string;
  count: number;
  lastSearched: number;
}

function sanitizeSectionId(raw?: string | null) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.toLowerCase().replace(SECTION_ID_PATTERN, '');
}

function getStatsFile(sectionId?: string | null) {
  const safeSectionId = sanitizeSectionId(sectionId);
  if (!safeSectionId) return DEFAULT_STATS_FILE;
  return path.join(process.cwd(), 'public', 'data', `search-stats-${safeSectionId}.json`);
}

// Ensure stats file exists
function ensureStatsFile(statsFile: string) {
  const dir = path.dirname(statsFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(statsFile)) {
    fs.writeFileSync(statsFile, JSON.stringify([] as SearchStat[]));
  }
}

// Get top searches
export async function GET(request: NextRequest) {
  try {
    const sectionId = request.nextUrl.searchParams.get('section');
    const statsFile = getStatsFile(sectionId);
    ensureStatsFile(statsFile);

    const data = fs.readFileSync(statsFile, 'utf-8');
    const stats: SearchStat[] = JSON.parse(data);

    // Sort by count descending
    const topSearches = stats
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json(topSearches);
  } catch (error) {
    console.error('Error reading search stats:', error);
    return NextResponse.json([]);
  }
}

// Record a search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    const sectionId = body.sectionId || request.nextUrl.searchParams.get('section');
    const statsFile = getStatsFile(sectionId);
    ensureStatsFile(statsFile);

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const normalizedQuery = query.toLowerCase().trim();

    let stats: SearchStat[] = [];
    try {
      const data = fs.readFileSync(statsFile, 'utf-8');
      stats = JSON.parse(data);
    } catch {
      stats = [];
    }

    // Find or create stat entry
    const existingIndex = stats.findIndex(
      (s) => s.query.toLowerCase() === normalizedQuery
    );

    if (existingIndex >= 0) {
      stats[existingIndex].count++;
      stats[existingIndex].lastSearched = Date.now();
    } else {
      stats.push({
        query,
        count: 1,
        lastSearched: Date.now(),
      });
    }

    // Write back to file
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording search:', error);
    return NextResponse.json({ error: 'Failed to record search' }, { status: 500 });
  }
}
