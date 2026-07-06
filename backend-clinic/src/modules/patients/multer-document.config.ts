import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

export const PATIENT_DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'patient-documents');

export const patientDocumentMulterOptions = {
  storage: diskStorage({
    destination: PATIENT_DOCUMENTS_DIR,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB - dosya türü kısıtlaması yok
  },
};
