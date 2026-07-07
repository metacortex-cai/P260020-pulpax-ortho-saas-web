import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';

export const EMPLOYEE_DOCUMENTS_DIR = join(process.cwd(), 'uploads', 'employee-documents');

if (!existsSync(EMPLOYEE_DOCUMENTS_DIR)) {
  mkdirSync(EMPLOYEE_DOCUMENTS_DIR, { recursive: true });
}

export const employeeDocumentMulterOptions = {
  storage: diskStorage({
    destination: EMPLOYEE_DOCUMENTS_DIR,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};
