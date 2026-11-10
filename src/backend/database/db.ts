import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Obtenção segura do diretório de dados sem importar estaticamente o 'app' do Electron
let userDataPath: string;

try {
  // Tenta obter dinamicamente se estivermos no processo principal do Electron
  // @ts-ignore
  if (process.versions && process.versions.electron) {
    // Importação dinâmica para evitar erro de módulo estático no Node puro
    const electron = eval('require')('electron');
    const electronApp = electron.app || (electron.remote && electron.remote.app);
    userDataPath = electronApp ? electronApp.getPath('userData') : process.cwd();
  } else {
    userDataPath = process.cwd();
  }
} catch {
  userDataPath = process.cwd();
}

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'database.db');
const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criação do Esquema Relacional Completo alinhado com os mapeamentos do Prisma (@@map)
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    nif TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    origin TEXT,
    costPrice REAL NOT NULL,
    sellingPrice REAL NOT NULL,
    taxRate REAL NOT NULL DEFAULT 0.0,
    taxExemption TEXT,
    minStock INTEGER NOT NULL DEFAULT 10,
    isActive INTEGER NOT NULL DEFAULT 1,
    categoryId TEXT NOT NULL,
    supplierId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id),
    FOREIGN KEY (supplierId) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    batchNumber TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    manufacturingDate DATETIME,
    expirationDate DATETIME NOT NULL,
    productId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CAIXA',
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT UNIQUE NOT NULL,
    subtotal REAL NOT NULL,
    taxTotal REAL NOT NULL,
    total REAL NOT NULL,
    paymentMethod TEXT NOT NULL DEFAULT 'MONEY',
    hash TEXT NOT NULL,
    qrCodeData TEXT,
    userId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    taxRate REAL NOT NULL,
    taxAmount REAL NOT NULL,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    saleId TEXT NOT NULL,
    productId TEXT NOT NULL,
    batchId TEXT NOT NULL,
    FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id),
    FOREIGN KEY (batchId) REFERENCES batches(id)
  );

  CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    refundAmount REAL NOT NULL,
    saleId TEXT NOT NULL,
    saleItemId TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saleId) REFERENCES sales(id),
    FOREIGN KEY (saleItemId) REFERENCES sale_items(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    pharmacyName TEXT NOT NULL,
    nif TEXT DEFAULT '5412345678',
    licenseKey TEXT NOT NULL,
    startDate DATETIME NOT NULL,
    expiresAt DATETIME NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1,
    lastVerified DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;