-- FL Vault · schema.sql
-- Execute uma vez para criar o banco:
--   node -e "require('./server').initDB()"
-- ou deixe o server.js criar automaticamente no primeiro start.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────
--  Tabela principal de links
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS links (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL,
  url      TEXT    NOT NULL,
  cat      TEXT    NOT NULL DEFAULT 'outro'
             CHECK (cat IN ('fl-studio','vst','drumkit','pack','preset','outro')),
  version  TEXT    NOT NULL DEFAULT '',
  note     TEXT    NOT NULL DEFAULT '',
  created  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- índice para buscas por categoria
CREATE INDEX IF NOT EXISTS idx_links_cat ON links(cat);

-- ─────────────────────────────────────────────
--  Dados iniciais (seed)
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO links (id, name, url, cat, version, note) VALUES
  (1, 'FL Studio 24 Producer Edition',
      'https://drive.usercontent.google.com/download?id=1G4VVfn90AnkdY4AUmYhYo-mCpJAa8gCq&export=download&authuser=0',
      'fl-studio', 'v21.2', 'Site oficial Image-Line'),
  (2, 'Serum',    'https://xferrecords.com/products/serum', 'vst',  'v1.36', ''),
  (3, 'Nexus 4',  'https://nexusvst.com/',                  'vst',  'v4.0',  ''),
  (4, 'Cymatics Lofi Pack', 'https://cymatics.fm/',          'pack', 'Free',  '');