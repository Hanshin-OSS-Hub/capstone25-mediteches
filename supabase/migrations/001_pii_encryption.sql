-- Meditech PII encryption & consent schema

-- Extend users: masked display only (no plaintext PII)
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS name_masked text,
  ADD COLUMN IF NOT EXISTS phone_masked text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Encrypted PII storage
CREATE TABLE IF NOT EXISTS users_encrypted (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name_enc text NOT NULL,
  phone_enc text NOT NULL,
  resident_id_enc text NOT NULL,
  dek_wrapped text NOT NULL,
  mlkem_ciphertext text NOT NULL,
  algorithm text NOT NULL DEFAULT 'AES-256-GCM+ML-KEM-768',
  key_version int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Consent audit trail
CREATE TABLE IF NOT EXISTS user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'sensitive')),
  version text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);

-- Hospital staff accounts
CREATE TABLE IF NOT EXISTS hospital_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'hospital',
  created_at timestamptz DEFAULT now()
);

-- Decryption audit log
CREATE TABLE IF NOT EXISTS decrypt_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES hospital_staff(id),
  user_id uuid NOT NULL REFERENCES users(id),
  fields_accessed text[] NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text
);

CREATE INDEX IF NOT EXISTS idx_decrypt_audit_user ON decrypt_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_decrypt_audit_staff ON decrypt_audit_log(staff_id);

-- Medication schedules (Phase 2)
CREATE TABLE IF NOT EXISTS medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  start_hour numeric NOT NULL,
  interval_hours int NOT NULL,
  dose_count int NOT NULL,
  instructions text,
  color text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_schedules_user ON medication_schedules(user_id);
