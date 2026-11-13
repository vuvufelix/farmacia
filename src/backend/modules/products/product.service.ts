import db from '../../database/db.js';
import crypto from 'crypto';

export class ProductService {
  static async createProduct(data: any) {
    const { initialStock, batchNumber, expirationDate, ...productData } = data;
    const productId = crypto.randomUUID();

    const safeCode = productData.code && productData.code.trim() !== '' ? productData.code.trim() : null;

    const createTx = db.transaction(() => {
      const stmtProd = db.prepare(`
        INSERT INTO products (id, name, code, origin, costPrice, sellingPrice, minStock, taxRate, categoryId, supplierId, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      stmtProd.run(
        productId,
        productData.name,
        safeCode,
        productData.origin || 'Importado',
        productData.costPrice,
        productData.sellingPrice,
        productData.minStock ?? 10,
        productData.taxRate ?? 0.14,
        productData.categoryId || null,
        productData.supplierId || null
      );

      // Só cria o lote se houver stock inicial E se o número do lote e a validade forem fornecidos pelo utilizador
      if (initialStock !== undefined && initialStock !== null && Number(initialStock) >= 0) {
        if (!batchNumber || !expirationDate) {
          throw new Error('O número do lote e a data de validade são obrigatórios quando o stock inicial é preenchido.');
        }

        const batchId = crypto.randomUUID();
        const stmtBatch = db.prepare(`
          INSERT INTO batches (id, batchNumber, quantity, expirationDate, productId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        stmtBatch.run(
          batchId,
          String(batchNumber).trim(),
          Number(initialStock),
          new Date(expirationDate).toISOString(),
          productId
        );
      }
    });

    createTx();

    return this.getProductById(productId);
  }

  static getProductById(id: string) {
    const product: any = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return null;

    const category = product.categoryId ? db.prepare('SELECT * FROM categories WHERE id = ?').get(product.categoryId) : null;
    const supplier = product.supplierId ? db.prepare('SELECT * FROM suppliers WHERE id = ?').get(product.supplierId) : null;
    
    const batches = db.prepare('SELECT * FROM batches WHERE productId = ? ORDER BY expirationDate ASC').all(id);

    return { ...product, category, supplier, batches };
  }

  static async listProducts() {
    const products: any[] = db.prepare('SELECT * FROM products WHERE isActive = 1 ORDER BY name ASC').all();
    return products.map(p => this.getProductById(p.id));
  }

  static async addBatch(data: {
    batchNumber: string;
    quantity: number;
    manufacturingDate?: string;
    expirationDate: string;
    productId: string;
  }) {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO batches (id, batchNumber, quantity, manufacturingDate, expirationDate, productId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      id,
      data.batchNumber,
      data.quantity,
      data.manufacturingDate ? new Date(data.manufacturingDate).toISOString() : null,
      new Date(data.expirationDate).toISOString(),
      data.productId
    );
    return db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
  }

  static async getExpirationAlerts() {
    const now = new Date();
    const limit30 = new Date(now); limit30.setDate(now.getDate() + 30);
    const limit60 = new Date(now); limit60.setDate(now.getDate() + 60);
    const limit90 = new Date(now); limit90.setDate(now.getDate() + 90);

    const batches: any[] = db.prepare(`
      SELECT * FROM batches 
      WHERE quantity > 0 AND expirationDate <= ? 
      ORDER BY expirationDate ASC
    `).all(limit90.toISOString());

    const expired: any[] = [];
    const alert30Days: any[] = [];
    const alert60Days: any[] = [];
    const alert90Days: any[] = [];

    for (const batch of batches) {
      const expDate = new Date(batch.expirationDate);
      const product = this.getProductById(batch.productId);
      const enrichedBatch = { ...batch, product };

      if (expDate <= now) {
        expired.push(enrichedBatch);
      } else if (expDate <= limit30) {
        alert30Days.push(enrichedBatch);
      } else if (expDate <= limit60) {
        alert60Days.push(enrichedBatch);
      } else {
        alert90Days.push(enrichedBatch);
      }
    }

    return {
      summary: {
        expiredCount: expired.length,
        alert30Count: alert30Days.length,
        alert60Count: alert60Days.length,
        alert90Count: alert90Days.length
      },
      expired,
      alert30Days,
      alert60Days,
      alert90Days
    };
  }

  static async deleteProduct(id: string) {
    const salesCount: any = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE productId = ?').get(id);

    if (salesCount.count > 0) {
      db.prepare('UPDATE products SET isActive = 0 WHERE id = ?').run(id);
      return this.getProductById(id);
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM batches WHERE productId = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
    });

    deleteTx();
    return { success: true };
  }

  static async updateProduct(id: string, data: any) {
    const { initialStock, quantity, batchNumber, expirationDate, ...productData } = data;
    const stockValue = initialStock ?? quantity;

    if (productData.code !== undefined) {
      productData.code = productData.code && productData.code.trim() !== '' ? productData.code.trim() : null;
    }

    const updateTx = db.transaction(() => {
      const keys = Object.keys(productData);
      if (keys.length > 0) {
        const fields = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => productData[k]);
        db.prepare(`UPDATE products SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
      }

      if (stockValue !== undefined && stockValue !== null && !isNaN(stockValue)) {
        const numericStock = Number(stockValue);
        const existingBatch: any = db.prepare('SELECT * FROM batches WHERE productId = ? ORDER BY expirationDate ASC LIMIT 1').get(id);

        if (existingBatch) {
          db.prepare(`
            UPDATE batches 
            SET quantity = ?, 
                batchNumber = COALESCE(?, batchNumber),
                expirationDate = COALESCE(?, expirationDate),
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            numericStock,
            batchNumber ? String(batchNumber).trim() : null,
            expirationDate ? new Date(expirationDate).toISOString() : null,
            existingBatch.id
          );
        } else if (numericStock > 0) {
          if (!batchNumber || !expirationDate) {
            throw new Error('O número do lote e a data de validade são obrigatórios ao criar o lote.');
          }

          const batchId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO batches (id, batchNumber, quantity, expirationDate, productId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            batchId,
            String(batchNumber).trim(),
            numericStock,
            new Date(expirationDate).toISOString(),
            id
          );
        }
      }
    });

    updateTx();
    return this.getProductById(id);
  }
}