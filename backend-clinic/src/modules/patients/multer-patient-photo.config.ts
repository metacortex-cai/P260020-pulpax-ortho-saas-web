import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

export const PATIENT_PHOTOS_DIR = join(process.cwd(), 'uploads', 'patient-photos');

if (!existsSync(PATIENT_PHOTOS_DIR)) {
  mkdirSync(PATIENT_PHOTOS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const patientPhotoMulterOptions = {
  storage: diskStorage({
    destination: PATIENT_PHOTOS_DIR,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException('Yalnızca JPEG, PNG veya WEBP formatında fotoğraf yüklenebilir.'), false);
      return;
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
