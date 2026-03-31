/**
 * FL Vault · server.js (Versão Compatível com Windows/sqlite3)
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'save.db');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve o seu index.html

// ── Conexão com o Banco de Dados ──────────────────────────────────
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Erro ao abrir banco:', err.message);
});

function initDB() {
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');

    // Criação da tabela
    db.run(`
    CREATE TABLE IF NOT EXISTS links (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT    NOT NULL,
        url      TEXT    NOT NULL,
        cat      TEXT    NOT NULL DEFAULT 'outro'
                CHECK (cat IN ('fl-studio','vst','drumkit','pack','preset','outro')),
        version  TEXT    NOT NULL DEFAULT '',
        note     TEXT    NOT NULL DEFAULT '',
        created  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_links_cat ON links(cat)');

    // Seed de dados iniciais
    db.get('SELECT COUNT(*) AS n FROM links', (err, row) => {
      if (!err && row && row.n === 0) {
        const stmt = db.prepare('INSERT INTO links (name,url,cat,version,note) VALUES (?,?,?,?,?)');
        const seedData = [
          ['FL Studio 24 Producer Edition', 'https://drive.google.com/...', 'fl-studio', 'v21.2', 'Site oficial'],
          ['Serum', 'https://xferrecords.com/products/serum', 'vst', 'v1.36', ''],
          ['Nexus 4', 'https://nexusvst.com/', 'vst', 'v4.0', ''],
          ['Cymatics Lofi Pack', 'https://cymatics.fm/', 'pack', 'Free', '']
        ];
        seedData.forEach(r => stmt.run(r));
        stmt.finalize();
        console.log('  ✓ Banco de dados populado com links iniciais.');
      }
    });
  });
}

initDB();

// ── Rotas da API ──────────────────────────────────────────────────

// GET /api/links (Busca e Filtro)
app.get('/api/links', (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  const cat = (req.query.cat || 'all').trim();

  let sql = `
    SELECT * FROM links 
    WHERE (name LIKE ? OR note LIKE ? OR version LIKE ?)
  `;
  let params = [q, q, q];

  if (cat !== 'all') {
    sql += ' AND cat = ?';
    params.push(cat);
  }

  // Lógica de Ordenação de Instalação:
  sql += `
    ORDER BY 
      CASE cat
        WHEN 'fl-studio' THEN 1
        WHEN 'vst'       THEN 2
        WHEN 'drumkit'   THEN 3
        WHEN 'pack'      THEN 4
        WHEN 'preset'    THEN 5
        ELSE 6
      END ASC, 
      id DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/links/stats (Estatísticas dos cards)
app.get('/api/links/stats', (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) AS total,
      COUNT(CASE WHEN cat='fl-studio' THEN 1 END) AS fl,
      COUNT(CASE WHEN cat='vst' THEN 1 END) AS vst,
      COUNT(CASE WHEN cat='drumkit' THEN 1 END) AS drumkit,
      COUNT(CASE WHEN cat='pack' THEN 1 END) AS pack,
      COUNT(CASE WHEN cat='preset' THEN 1 END) AS preset,
      COUNT(CASE WHEN cat='outro' THEN 1 END) AS outro
    FROM links
  `;
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// GET /api/links/:id
app.get('/api/links/:id', (req, res) => {
  db.get('SELECT * FROM links WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Não encontrado' });
    res.json(row);
  });
});

// POST /api/links (Criar novo)
app.post('/api/links', (req, res) => {
  const { name, url, cat = 'outro', version = '', note = '' } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Nome e URL são obrigatórios' });

  const sql = 'INSERT INTO links (name, url, cat, version, note) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, url, cat, version, note], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT * FROM links WHERE id = ?', [this.lastID], (err, row) => {
      res.status(201).json(row);
    });
  });
});

// PUT /api/links/:id (Editar)
app.put('/api/links/:id', (req, res) => {
  const { name, url, cat, version, note } = req.body;
  const sql = 'UPDATE links SET name=?, url=?, cat=?, version=?, note=? WHERE id=?';
  
  db.run(sql, [name, url, cat, version, note, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Não encontrado' });
    
    db.get('SELECT * FROM links WHERE id = ?', [req.params.id], (err, row) => {
      res.json(row);
    });
  });
});

// DELETE /api/links/:id
app.delete('/api/links/:id', (req, res) => {
  db.run('DELETE FROM links WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, deleted: this.changes });
  });
});

// ── Iniciar Servidor ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 FL Vault rodando em → http://localhost:${PORT}`);
  console.log(`  📂 Banco de dados: ${DB_PATH}\n`);
});