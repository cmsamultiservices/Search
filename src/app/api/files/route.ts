import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// A simple function to get MIME type based on file extension
function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.pdf': return 'application/pdf';
    case '.txt': return 'text/plain';
    case '.json': return 'application/json';
    case '.xml': return 'application/xml';
    case '.csv': return 'text/csv';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.ppt': return 'application/vnd.ms-powerpoint';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.md': return 'text/markdown';
    // Add more MIME types as needed
    default: return 'application/octet-stream'; // Default for unknown file types
  }
}


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('File path is required', { status: 400 });
  }

  try {
    // Basic security check: prevent directory traversal attacks.
    // This is a simple check and might need to be more robust depending on the use case.
    if (filePath.includes('..')) {
      return new NextResponse('Invalid file path', { status: 400 });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const mimeType = getMimeType(filePath);
    const filename = path.basename(filePath);

    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    // Use both formats for better browser compatibility
    headers.set('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);


    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Error reading file:', error);
    return new NextResponse('Error reading file', { status: 500 });
  }
}
