import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // dental_editor.html is now inside the public directory
    const filePath = path.join(process.cwd(), 'public', 'dental_editor.html');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'dental_editor.html not found at ' + filePath }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Regex to extract the IMGS JSON object
    const match = content.match(/const IMGS\s*=\s*(\{.*?\});/s);
    if (!match || !match[1]) {
      return NextResponse.json({ error: 'IMGS object not found in file' }, { status: 500 });
    }

    // Parse the extracted JS object (it might not be strict JSON due to missing quotes on keys)
    const imgsJson = new Function(`return ${match[1]}`)();
    
    // Set headers to cache the response aggressively since it won't change
    return NextResponse.json(imgsJson, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
