import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from './src/backend/database/db.js';

async function main() {
  console.log('🌱 A iniciar o povoamento do banco de dados (Seeding com SQLite nativo)...');

  // Limpar tabelas existentes em ordem respeitando as foreign keys (usando os nomes reais em minúsculas e plural)
  db.exec(`
    DELETE FROM returns;
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM batches;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM suppliers;
    DELETE FROM users;
    DELETE FROM licenses;
  `);

  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Criar Utilizadores (tabela 'users')
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, username, password, role, active, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const adminId = crypto.randomUUID();
  const caixaId = crypto.randomUUID();
  const contId = crypto.randomUUID();

  insertUser.run(adminId, 'Administrador Geral', 'admin', passwordHash, 'ADMIN');
  insertUser.run(caixaId, 'Operador de Caixa', 'caixa1', passwordHash, 'CAIXA');
  insertUser.run(contId, 'Contabilista', 'contabilista', passwordHash, 'ACCOUNTANT');

  // 2. Criar Fornecedor (tabela 'suppliers')
  const shalinaId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO suppliers (id, name, phone, email, address, nif, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(shalinaId, 'Shalina Healthcare', '+244923000000', 'vendas@shalina.co.ao', 'Luanda, Angola', '5401122334');

  // 3. Criar Categorias Farmacêuticas (15 categorias - tabela 'categories')
  const categoriesData = [
    'Analgésicos e Antipiréticos',
    'Antibióticos e Anti-infeciosos',
    'Anti-inflamatórios (AINEs)',
    'Gastrointestinais e Antiácidos',
    'Antialérgicos e Anti-histamínicos',
    'Vitaminas, Minerais e Suplementos',
    'Cardiovasculares e Hipertensão',
    'Sistema Respiratório e Tosse',
    'Antimaláricos',
    'Dermatológicos e Pomadas',
    'Oftálmicos e Gotas Otológicas',
    'Primeiros Socorros e Pensos',
    'Linha Infantil e Pediátrica',
    'Contraceptivos e Saúde Sexual',
    'Higiene Pessoal e Cuidados Diários'
  ];

  const categoryIds: Record<string, string> = {};
  const insertCat = db.prepare('INSERT INTO categories (id, name, createdAt, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');

  for (const catName of categoriesData) {
    const id = crypto.randomUUID();
    insertCat.run(id, catName);
    categoryIds[catName] = id;
  }

  // 4. Criar Produtos de Exemplo (tabela 'products')
  const paracetamolId = crypto.randomUUID();
  const amoxicilinaId = crypto.randomUUID();

  const insertProd = db.prepare(`
    INSERT INTO products (id, name, code, origin, costPrice, sellingPrice, taxRate, minStock, categoryId, supplierId, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertProd.run(
    paracetamolId,
    'Paracetamol Shalina 500mg',
    '5601234567890',
    'Importado',
    800,
    1500,
    0.14,
    20,
    categoryIds['Analgésicos e Antipiréticos'],
    shalinaId
  );

  insertProd.run(
    amoxicilinaId,
    'Amoxicilina 500mg Caps',
    '5609876543210',
    'Importado',
    2000,
    3500,
    0.14,
    15,
    categoryIds['Antibióticos e Anti-infeciosos'],
    shalinaId
  );

  // 5. Criar Lotes com datas calculadas (tabela 'batches')
  const now = new Date();
  const expireIn20Days = new Date(now);
  expireIn20Days.setDate(now.getDate() + 20);

  const expireIn90Days = new Date(now);
  expireIn90Days.setDate(now.getDate() + 90);

  const insertBatch = db.prepare(`
    INSERT INTO batches (id, batchNumber, quantity, manufacturingDate, expirationDate, productId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  insertBatch.run(
    crypto.randomUUID(),
    'L-PAR2026-01',
    50,
    new Date('2024-01-01').toISOString(),
    expireIn20Days.toISOString(),
    paracetamolId
  );

  insertBatch.run(
    crypto.randomUUID(),
    'L-AMO2026-02',
    30,
    new Date('2024-03-01').toISOString(),
    expireIn90Days.toISOString(),
    amoxicilinaId
  );

  // 6. Criar Licença Inicial (tabela 'licenses')
  const startDate = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(startDate.getDate() + 30);

  db.prepare(`
    INSERT INTO licenses (id, pharmacyName, nif, licenseKey, startDate, expiresAt, isActive, lastVerified, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    crypto.randomUUID(),
    'Farmácia Demonstração Nenova',
    '5401122334',
    'NENOVA-INITIAL-TRIAL',
    startDate.toISOString(),
    expiresAt.toISOString()
  );

  console.log('✅ Banco de dados semeado com sucesso via SQLite nativo!');
  console.log('👤 Utilizador Admin criado: admin / 123456');
  console.log('💊 15 categorias farmacêuticas injetadas com sucesso.');
  console.log('🔑 Licença inicial de 30 dias gerada e ativada.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});