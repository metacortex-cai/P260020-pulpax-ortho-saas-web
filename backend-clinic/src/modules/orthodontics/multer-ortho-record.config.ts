import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

export const ORTHO_RECORDS_DIR = join(process.cwd(), 'uploads', 'ortho-records');

export const orthoRecordMulterOptions = {
  storage: diskStorage({
    destination: ORTHO_RECORDS_DIR,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: {
    // CBCT/STL kayıtları foto/röntgenden büyük olabilir; patient-documents'tan
    // (10MB) daha geniş bir sınır kullanılır.
    fileSize: 25 * 1024 * 1024,
  },
};
