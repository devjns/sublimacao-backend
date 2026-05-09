const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../database.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    whatsapp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL DEFAULT 0,
    mp_preference_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    price REAL NOT NULL,
    image_url TEXT,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS generated_arts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_photo TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    access_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS generated_products (
    id TEXT PRIMARY KEY,
    art_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    base_price REAL NOT NULL,
    FOREIGN KEY (art_id) REFERENCES generated_arts(id)
  );
`);

// Adiciona coluna mp_preference_id se nao existir (migracao)
try {
  db.exec("ALTER TABLE orders ADD COLUMN mp_preference_id TEXT");
} catch (e) {
  // Coluna ja existe, ignora
}

// Adiciona coluna paid ao status se necessario
try {
  db.exec("ALTER TABLE orders ADD COLUMN paid_at DATETIME");
} catch (e) {
  // Coluna ja existe, ignora
}

module.exports = db;
