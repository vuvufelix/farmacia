import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 📂 Obtém o caminho seguro enviado pelo processo principal do Electron ou usa o cwd em desenvolvimento
const userDataPath = process.env.DB_USER_DATA_PATH || process.cwd();

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'database.db');
console.log('📂 Caminho oficial da Base de Dados:', dbPath);

// 🛠️ Correção do erro TypeScript: tipagem explícita 'any' evita conflito com tipos externos do better-sqlite3
const dbInstance: any = new Database(dbPath);

dbInstance.pragma('journal_mode = WAL');
dbInstance.pragma('foreign_keys = ON');

// 🏗️ Criação do Esquema Relacional Completo
dbInstance.exec(`
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

// 🌱 SEED AUTOMÁTICO NO PRIMEIRO ARRANQUE
const adminCheck = dbInstance.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin') as { count: number };

if (adminCheck.count === 0) {
  console.log('🌱 A popular a base de dados com dados iniciais (Seed automático)...');
  const passwordHash = bcrypt.hashSync('123456', 10);

  // 🆔 Geração de UUIDs válidos para satisfazer as validações Zod nas vendas
  const adminId = crypto.randomUUID();
  const caixaId = crypto.randomUUID();
  const contId = crypto.randomUUID();

  const insertUser = dbInstance.prepare(`
    INSERT INTO users (id, name, username, password, role, active, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertUser.run(adminId, 'Administrador Geral', 'admin', passwordHash, 'ADMIN');
  insertUser.run(caixaId, 'Operador de Caixa', 'caixa1', passwordHash, 'CAIXA');
  insertUser.run(contId, 'Contabilista', 'contabilista', passwordHash, 'ACCOUNTANT');

  const shalinaId = crypto.randomUUID();
  dbInstance.prepare(`
    INSERT INTO suppliers (id, name, phone, email, address, nif, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(shalinaId, 'Shalina Healthcare', '+244923000000', 'vendas@shalina.co.ao', 'Luanda, Angola', '5401122334');

  const categoriesData = [
    'Analgésicos e Antipiréticos', 'Antibióticos e Anti-infeciosos', 'Anti-inflamatórios (AINEs)',
    'Gastrointestinais e Antiácidos', 'Antialérgicos e Anti-histamínicos', 'Vitaminas, Minerais e Suplementos',
    'Cardiovasculares e Hipertensão', 'Sistema Respiratório e Tosse', 'Antimaláricos',
    'Dermatológicos e Pomadas', 'Oftálmicos e Gotas Otológicas', 'Primeiros Socorros e Pensos',
    'Linha Infantil e Pediátrica', 'Contraceptivos e Saúde Sexual', 'Higiene Pessoal e Cuidados Diários'
  ];

  const categoryIds: Record<string, string> = {};
  const insertCat = dbInstance.prepare('INSERT INTO categories (id, name, createdAt, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');

  for (const catName of categoriesData) {
    const id = crypto.randomUUID();
    insertCat.run(id, catName);
    categoryIds[catName] = id;
  }

  const paracetamolId = crypto.randomUUID();
  const amoxicilinaId = crypto.randomUUID();

  const insertProd = dbInstance.prepare(`
    INSERT INTO products (id, name, code, origin, costPrice, sellingPrice, taxRate, minStock, categoryId, supplierId, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertProd.run(paracetamolId, 'Paracetamol Shalina 500mg', '5601234567890', 'Importado', 800, 1500, 0.14, 20, categoryIds['Analgésicos e Antipiréticos'], shalinaId);
  insertProd.run(amoxicilinaId, 'Amoxicilina 500mg Caps', '5609876543210', 'Importado', 2000, 3500, 0.14, 15, categoryIds['Antibióticos e Anti-infeciosos'], shalinaId);

  const now = new Date();
  const expireIn20Days = new Date(now);
  expireIn20Days.setDate(now.getDate() + 20);
  const expireIn90Days = new Date(now);
  expireIn90Days.setDate(now.getDate() + 90);

  const insertBatch = dbInstance.prepare(`
    INSERT INTO batches (id, batchNumber, quantity, manufacturingDate, expirationDate, productId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertBatch.run(crypto.randomUUID(), 'L-PAR2026-01', 50, new Date('2024-01-01').toISOString(), expireIn20Days.toISOString(), paracetamolId);
  insertBatch.run(crypto.randomUUID(), 'L-AMO2026-02', 30, new Date('2024-03-01').toISOString(), expireIn90Days.toISOString(), amoxicilinaId);

  const startDate = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(startDate.getDate() + 30);

  dbInstance.prepare(`
    INSERT INTO licenses (id, pharmacyName, nif, licenseKey, startDate, expiresAt, isActive, lastVerified, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(crypto.randomUUID(), 'Farmácia Demonstração Nenova', '5401122334', 'NENOVA-INITIAL-TRIAL', startDate.toISOString(), expiresAt.toISOString());

  console.log('✅ Base de dados semeada com sucesso automaticamente!');
}

export default dbInstance;