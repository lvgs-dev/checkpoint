-- The migration runner supplies one transaction for this file.
INSERT INTO ref_status (code, label_pt, sort_order, queue_eligible)
VALUES ('wishlist', 'Desejado', 5, false)
ON CONFLICT (code) DO UPDATE SET label_pt = EXCLUDED.label_pt,
  sort_order = EXCLUDED.sort_order, queue_eligible = EXCLUDED.queue_eligible;

CREATE TABLE IF NOT EXISTS game_price (
  steam_app_id     integer  NOT NULL CHECK (steam_app_id > 0),
  country_code     char(2)  NOT NULL DEFAULT 'BR' CHECK (country_code ~ '^[A-Z]{2}$'),
  currency         char(3)  CHECK (currency ~ '^[A-Z]{3}$'),
  initial_cents    integer  CHECK (initial_cents >= 0),
  final_cents      integer  CHECK (final_cents >= 0),
  discount_percent smallint NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_ends_at timestamptz,
  is_free          boolean  NOT NULL DEFAULT false,
  formatted        text     CHECK (length(formatted) <= 40),
  fetched_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (steam_app_id, country_code)
);

CREATE INDEX IF NOT EXISTS game_price_fetched_idx ON game_price (fetched_at);

CREATE INDEX IF NOT EXISTS library_entry_user_wishlist_idx
  ON library_entry (user_id, created_at DESC) WHERE status = 'wishlist';
