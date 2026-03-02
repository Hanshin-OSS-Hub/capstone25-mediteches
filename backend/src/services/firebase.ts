import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

function getServiceAccount(): admin.ServiceAccount | undefined {
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    try {
      return JSON.parse(envKey) as admin.ServiceAccount;
    } catch {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env');
    }
  }

  const keyPath = path.resolve(__dirname, '../../firebase_key.json');
  if (fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, 'utf-8')) as admin.ServiceAccount;
  }

  return undefined;
}

const serviceAccount = getServiceAccount();

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn('No Firebase service account found. Firebase features will be unavailable.');
  admin.initializeApp();
}

export async function verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  return admin.auth().verifyIdToken(idToken);
}

export default admin;
