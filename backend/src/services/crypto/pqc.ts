import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

const ALGORITHM = 'AES-256-GCM+ML-KEM-768';
const AES_IV_LEN = 12;
const AES_TAG_LEN = 16;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface EncryptedUserRecord {
  nameEnc: EncryptedPayload;
  phoneEnc: EncryptedPayload;
  residentIdEnc: EncryptedPayload;
  dekWrapped: EncryptedPayload;
  mlkemCiphertext: string;
  algorithm: string;
  keyVersion: number;
}

function toBase64(buf: Uint8Array | Buffer): string {
  return Buffer.from(buf).toString('base64');
}

function fromBase64(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

function getHospitalPublicKey(): Uint8Array {
  const b64 = process.env.HOSPITAL_MLKEM_PUBLIC_KEY;
  if (!b64) {
    throw new Error('HOSPITAL_MLKEM_PUBLIC_KEY is not configured');
  }
  return fromBase64(b64);
}

export function getHospitalSecretKey(): Uint8Array {
  const b64 = process.env.HOSPITAL_MLKEM_PRIVATE_KEY;
  if (!b64) {
    throw new Error('HOSPITAL_MLKEM_PRIVATE_KEY is not configured');
  }
  return fromBase64(b64);
}

function aesEncrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(AES_IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: toBase64(encrypted),
    iv: toBase64(iv),
    tag: toBase64(tag),
  };
}

function aesDecrypt(payload: EncryptedPayload, key: Buffer): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function serializePayload(p: EncryptedPayload): string {
  return JSON.stringify(p);
}

function deserializePayload(raw: string): EncryptedPayload {
  return JSON.parse(raw) as EncryptedPayload;
}

/** Encrypt PII fields with hybrid ML-KEM-768 + AES-256-GCM */
export function encryptUserPii(
  name: string,
  phone: string,
  residentId: string,
): EncryptedUserRecord {
  const publicKey = getHospitalPublicKey();
  const dek = randomBytes(32);
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);

  const kemKey = Buffer.from(sharedSecret).subarray(0, 32);
  const dekWrapped = aesEncrypt(dek.toString('base64'), kemKey);

  return {
    nameEnc: aesEncrypt(name, dek),
    phoneEnc: aesEncrypt(phone, dek),
    residentIdEnc: aesEncrypt(residentId.replace(/\D/g, ''), dek),
    dekWrapped,
    mlkemCiphertext: toBase64(cipherText),
    algorithm: ALGORITHM,
    keyVersion: parseInt(process.env.PII_ENCRYPTION_VERSION || '1', 10),
  };
}

export interface DecryptedUserPii {
  name: string;
  phone: string;
  residentId: string;
}

/** Decrypt PII — hospital portal only */
export function decryptUserPii(
  record: {
    name_enc: string;
    phone_enc: string;
    resident_id_enc: string;
    dek_wrapped: string;
    mlkem_ciphertext: string;
  },
  fields: ('name' | 'phone' | 'residentId')[] = ['name', 'phone', 'residentId'],
): DecryptedUserPii {
  const secretKey = getHospitalSecretKey();
  const sharedSecret = ml_kem768.decapsulate(
    fromBase64(record.mlkem_ciphertext),
    secretKey,
  );
  const kemKey = Buffer.from(sharedSecret).subarray(0, 32);
  const dekWrapped = deserializePayload(record.dek_wrapped);
  const dekB64 = aesDecrypt(dekWrapped, kemKey);
  const dek = Buffer.from(dekB64, 'base64');

  const result: DecryptedUserPii = { name: '', phone: '', residentId: '' };

  if (fields.includes('name')) {
    result.name = aesDecrypt(deserializePayload(record.name_enc), dek);
  }
  if (fields.includes('phone')) {
    result.phone = aesDecrypt(deserializePayload(record.phone_enc), dek);
  }
  if (fields.includes('residentId')) {
    const raw = aesDecrypt(deserializePayload(record.resident_id_enc), dek);
    result.residentId =
      raw.length === 13 ? `${raw.slice(0, 6)}-${raw.slice(6)}` : raw;
  }

  return result;
}

export function maskName(name: string): string {
  if (name.length <= 1) return '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return digits.slice(0, 3) + '-****-' + digits.slice(-4);
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.IP_HASH_SALT || 'meditech')).digest('hex').slice(0, 16);
}

export { serializePayload, deserializePayload, ALGORITHM };
