import {
  FileText, FileSpreadsheet, FileArchive, FileVideo, FileAudio, FileJson,
  Presentation, Image as ImageIcon, File as FileIcon, LucideIcon,
} from 'lucide-react';

export interface FileIconInfo {
  Icon: LucideIcon;
  colorClass: string;
}

const EXTENSION_MAP: Record<string, FileIconInfo> = {
  pdf: { Icon: FileText, colorClass: 'text-red-500' },
  doc: { Icon: FileText, colorClass: 'text-blue-500' },
  docx: { Icon: FileText, colorClass: 'text-blue-500' },
  xls: { Icon: FileSpreadsheet, colorClass: 'text-emerald-600' },
  xlsx: { Icon: FileSpreadsheet, colorClass: 'text-emerald-600' },
  csv: { Icon: FileSpreadsheet, colorClass: 'text-emerald-600' },
  ppt: { Icon: Presentation, colorClass: 'text-orange-500' },
  pptx: { Icon: Presentation, colorClass: 'text-orange-500' },
  zip: { Icon: FileArchive, colorClass: 'text-amber-600' },
  rar: { Icon: FileArchive, colorClass: 'text-amber-600' },
  '7z': { Icon: FileArchive, colorClass: 'text-amber-600' },
  json: { Icon: FileJson, colorClass: 'text-yellow-600' },
  txt: { Icon: FileText, colorClass: 'text-slate-400' },
};

function getExtension(name?: string): string {
  if (!name) return '';
  const match = name.match(/\.([^./\\]+)$/);
  return match ? match[1].toLowerCase() : '';
}

export function getFileIconInfo(doc: { fileType?: string; name?: string }): FileIconInfo {
  const mime = doc.fileType || '';

  if (mime.startsWith('image/')) return { Icon: ImageIcon, colorClass: 'text-violet-500' };
  if (mime.startsWith('video/')) return { Icon: FileVideo, colorClass: 'text-pink-500' };
  if (mime.startsWith('audio/')) return { Icon: FileAudio, colorClass: 'text-pink-500' };
  if (mime.includes('pdf')) return EXTENSION_MAP.pdf;
  if (mime.includes('word')) return EXTENSION_MAP.docx;
  if (mime.includes('sheet') || mime.includes('excel')) return EXTENSION_MAP.xlsx;
  if (mime.includes('presentation') || mime.includes('powerpoint')) return EXTENSION_MAP.pptx;
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('rar')) return EXTENSION_MAP.zip;
  if (mime.includes('json')) return EXTENSION_MAP.json;

  const ext = getExtension(doc.name);
  if (EXTENSION_MAP[ext]) return EXTENSION_MAP[ext];

  return { Icon: FileIcon, colorClass: 'text-slate-300' };
}
