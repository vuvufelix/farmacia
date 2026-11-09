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

// Criação do Esquema Relacional Completo
db.exec(`
  CREATE TABLE IF NOT EXISTS Category (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Supplier (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    description TEXT,
    costPrice REAL NOT NULL,
    sellingPrice REAL NOT NULL,
    minStock INTEGER NOT NULL DEFAULT 5,
    taxRate REAL NOT NULL DEFAULT 0.14,
    categoryId TEXT,
    supplierId TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES Category(id),
    FOREIGN KEY (supplierId) REFERENCES Supplier(id)
  );

  CREATE TABLE IF NOT EXISTS Batch (
    id TEXT PRIMARY KEY,
    batchNumber TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    manufacturingDate DATETIME,
    expirationDate DATETIME NOT NULL,
    productId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OPERATOR',
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Sale (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT UNIQUE NOT NULL,
    subtotal REAL NOT NULL,
    taxTotal REAL NOT NULL,
    total REAL NOT NULL,
    paymentMethod TEXT NOT NULL,
    hash TEXT NOT NULL,
    qrCodeData TEXT NOT NULL,
    userId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS SaleItem (
    id TEXT PRIMARY KEY,
    saleId TEXT NOT NULL,
    productId TEXT NOT NULL,
    batchId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    taxRate REAL NOT NULL,
    taxAmount REAL NOT NULL,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (saleId) REFERENCES Sale(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Product(id),
    FOREIGN KEY (batchId) REFERENCES Batch(id)
  );

  CREATE TABLE IF NOT EXISTS Return (
    id TEXT PRIMARY KEY,
    saleId TEXT NOT NULL,
    saleItemId TEXT NOT NULL,
    userId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    refundAmount REAL NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (saleId) REFERENCES Sale(id),
    FOREIGN KEY (saleItemId) REFERENCES SaleItem(id),
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS License (
    id TEXT PRIMARY KEY,
    pharmacyName TEXT NOT NULL,
    nif TEXT,
    licenseKey TEXT NOT NULL,
    startDate DATETIME NOT NULL,
    expiresAt DATETIME NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1,
    lastVerified DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;