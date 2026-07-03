CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  city text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'banned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric,
  category_id integer REFERENCES categories(id),
  city text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url text NOT NULL,
  position smallint NOT NULL DEFAULT 0
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('illegal', 'scam', 'inappropriate', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  UNIQUE (listing_id, reporter_id)
);

CREATE TABLE chat_deletes (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  other_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, user_id, other_id)
);

CREATE TABLE user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  UNIQUE (reported_id, reporter_id)
);

CREATE INDEX listings_user_id_idx ON listings(user_id);
CREATE INDEX listings_category_id_idx ON listings(category_id);
CREATE INDEX listing_images_listing_id_idx ON listing_images(listing_id);
CREATE INDEX messages_listing_id_idx ON messages(listing_id);
CREATE INDEX messages_sender_id_idx ON messages(sender_id);
CREATE INDEX messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX favorites_listing_id_idx ON favorites(listing_id);
CREATE INDEX reports_listing_id_idx ON reports(listing_id);
CREATE INDEX user_reports_reported_id_idx ON user_reports(reported_id);
