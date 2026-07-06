import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('FATAL ERROR: ENCRYPTION_KEY is not set in environment variables.');
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 12; // GCM için standart IV uzunluğu

export class EncryptionUtil {
  /**
   * E-posta adresini SHA-256 ile hashler (arama yapabilmek için).
   */
  static hashEmail(email: string): string {
    if (!email) return '';
    return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  }

  /**
   * Verilen metni AES-256-GCM ile şifreler.
   * Çıktı formatı: iv:authTag:encryptedText (hepsi hex)
   */
  static encrypt(text: string): string {
    if (!text) return text;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Şifrelenmiş metni çözer.
   * Beklenen format: iv:authTag:encryptedText
   */
  static decrypt(encryptedData: string): string | null {
    if (!encryptedData) return null;

    // Eski/legacy veride bu alan hiç şifrelenmemiş olabilir (örn. doğrudan SQL ile eklenmiş test verisi).
    // Bu durum çağıran tarafta zaten `decrypt(x) || x` ile karşılanıyor; gerçek bir hata değil, loglama.
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Şifre çözme hatası:', error.message);
      return null;
    }
  }
}
