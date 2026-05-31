import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

function main() {
  const { publicKey, secretKey } = ml_kem768.keygen();

  console.log('=== ML-KEM-768 Hospital Key Pair ===\n');
  console.log('Add these to your .env file:\n');
  console.log(`HOSPITAL_MLKEM_PUBLIC_KEY=${Buffer.from(publicKey).toString('base64')}`);
  console.log(`HOSPITAL_MLKEM_PRIVATE_KEY=${Buffer.from(secretKey).toString('base64')}`);
  console.log('\nWARNING: Keep the private key secure. Only deploy it on the hospital portal server.');
}

main();
