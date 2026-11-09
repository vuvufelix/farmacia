import db from '../../database/db.js';
import crypto from 'crypto';

export class ProductService {
  static async createProduct(data: any) {
    const { initialStock, batchNumber, expirationDate, ...productData } = data;
    const productId = crypto.randomUUID();

    const createTx = db.transaction(() => {
      const stmtProd = db.prepare(`
        INSERT INTO Product (id, name, code, description, costPrice, sellingPrice, minStock, taxRate, categoryId, supplierId, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
      stmtProd.run(
        productId,
        productData.name,
        productData.code || null,
        productData.description || null,
        productData.costPrice,
        productData.sellingPrice,
        productData.minStock ?? 5,
        productData.taxRate ?? 0.14,
        productData.categoryId || null,
        productData.supplierId || null
      );

      if (initialStock && Number(initialStock) > 0) {
        const batchId = crypto.randomUUID();
        const stmtBatch = db.prepare(`
          INSERT INTO Batch (id, batchNumber, quantity, expirationDate, productId)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmtBatch.run(
          batchId,
          batchNumber || `LOTE-${Date.now().toString().slice(-6)}`,
          Number(initialStock),
          expirationDate ? new Date(expirationDate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          productId
        );
      }
    });

    createTx();

    return this.getProductById(productId);
  }

  static getProductById(id: string) {
    const product: any = db.prepare('SELECT * FROM Product WHERE id = ?').get(id);
    if (!product) return null;

    const category = product.categoryId ? db.prepare('SELECT * FROM Category WHERE id = ?').get(product.categoryId) : null;
    const supplier = product.supplierId ? db.prepare('SELECT * FROM Supplier WHERE id = ?').get(product.supplierId) : null;
    const batches = db.prepare('SELECT * FROM Batch WHERE productId = ? AND quantity > 0 ORDER BY expirationDate ASC').all(id);

    return { ...product, category, supplier, batches };
  }

  static async listProducts() {
    const products: any[] = db.prepare('SELECT * FROM Product WHERE isActive = 1 ORDER BY name ASC').all();
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
      INSERT INTO Batch (id, batchNumber, quantity, manufacturingDate, expirationDate, productId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.batchNumber,
      data.quantity,
      data.manufacturingDate ? new Date(data.manufacturingDate).toISOString() : null,
      new Date(data.expirationDate).toISOString(),
      data.productId
    );
    return db.prepare('SELECT * FROM Batch WHERE id = ?').get(id);
  }

  static async getExpirationAlerts() {
    const now = new Date();
    const limit30 = new Date(now); limit30.setDate(now.getDate() + 30);
    const limit60 = new Date(now); limit60.setDate(now.getDate() + 60);
    const limit90 = new Date(now); limit90.setDate(now.getDate() + 90);

    const batches: any[] = db.prepare(`
      SELECT * FROM Batch 
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
    const salesCount: any = db.prepare('SELECT COUNT(*) as count FROM SaleItem WHERE productId = ?').get(id);

    if (salesCount.count > 0) {
      db.prepare('UPDATE Product SET isActive = 0 WHERE id = ?').run(id);
      return this.getProductById(id);
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM Batch WHERE productId = ?').run(id);
      db.prepare('DELETE FROM Product WHERE id = ?').run(id);
    });

    deleteTx();
    return { success: true };
  }

  static async updateProduct(id: string, data: any) {
    const { initialStock, quantity, batchNumber, expirationDate, ...productData } = data;
    const stockValue = initialStock ?? quantity;

    const updateTx = db.transaction(() => {
      const fields = Object.keys(productData).map(k => `${k} = ?`).join(', ');
      if (fields) {
        const values = Object.values(productData);
        db.prepare(`UPDATE Product SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
      }

      if (stockValue !== undefined && stockValue !== null && !isNaN(stockValue)) {
        const numericStock = Number(stockValue);
        const existingBatch: any = db.prepare('SELECT * FROM Batch WHERE productId = ? ORDER BY expirationDate ASC LIMIT 1').get(id);

        if (existingBatch) {
          db.prepare(`
            UPDATE Batch 
            SET quantity = ?, 
                batchNumber = COALESCE(?, batchNumber),
                expirationDate = COALESCE(?, expirationDate)
            WHERE id = ?
          `).run(
            numericStock,
            batchNumber || null,
            expirationDate ? new Date(expirationDate).toISOString() : null,
            existingBatch.id
          );
        } else if (numericStock > 0) {
          const batchId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO Batch (id, batchNumber, quantity, expirationDate, productId)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            batchId,
            batchNumber || `LOTE-AUTO-${Date.now().toString().slice(-6)}`,
            numericStock,
            expirationDate ? new Date(expirationDate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            id
          );
        }
      }
    });

    updateTx();
    return this.getProductById(id);
  }
}