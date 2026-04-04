import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync('your-secret-key', 'salt', 32); // In production, use environment variable
const IV_LENGTH = 16;

// Generate a random IV
function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

// Encrypt password
export function encryptPassword(password: string): { encrypted: string; iv: string } {
  const iv = generateIV();
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

// Decrypt password
export function decryptPassword(encrypted: string, iv: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Hash password for storage (we'll still use bcrypt for actual storage)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}
