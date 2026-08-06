-- Written defensively with IF NOT EXISTS everywhere: since an earlier
-- version of this migration may have already run against this database
-- (before it was reverted and rebuilt), this is safe to apply either way.

-- DEFAULT true is deliberate: it back-fills every existing row as already
-- verified, so nobody who registered before this feature existed gets
-- locked out. New registrations explicitly insert email_verified = false
-- in application code (see db/users.ts createUser), overriding this
-- default for genuinely new signups going forward.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx ON email_verification_tokens(user_id);
