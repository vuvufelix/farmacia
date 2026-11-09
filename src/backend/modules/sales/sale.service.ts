import db from '../../database/db.js';
import crypto from 'crypto';

export class SaleService {
  private static generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const res: any = db.prepare('SELECT COUNT(*) as count FROM Sale').get();
    const sequence = String(res.count + 1).padStart(4, '0');
    return `FR FMN${year}/${sequence}`;
  }

  private static generateSaleHash(invoiceNumber: string, total: number, createdAt: Date): string {
    const rawData = `${invoiceNumber};${total.toFixed(2)};${createdAt.toISOString()}`;
    return crypto.createHash('sha256').update(rawData).digest('hex').substring(0, 16).toUpperCase();
  }

  static async createSale(data: {
    userId: string;
    paymentMethod: 'MONEY' | 'MULTICAIXA' | 'TRANSFER' | 'COMBINED';
    items: Array<{ productId: string; batchId: string; quantity: number }>;
  }) {
    const saleId = crypto.randomUUID();
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems: any[] = [];

    const saleTx = db.transaction(() => {
      for (const item of data.items) {
        const product: any = db.prepare('SELECT * FROM Product WHERE id = ?').get(item.productId);
        if (!product) throw new Error(`Produto não encontrado (ID: ${item.productId})`);

        const batch: any = db.prepare('SELECT * FROM Batch WHERE id = ?').get(item.batchId);
        if (!batch) throw new Error(`Lote não encontrado (ID: ${item.batchId})`);

        if (batch.quantity < item.quantity) {
          throw new Error(`Estoque insuficiente no lote ${batch.batchNumber}. Disponível: ${batch.quantity}`);
        }

        db.prepare('UPDATE Batch SET quantity = ? WHERE id = ?').run(batch.quantity - item.quantity, batch.id);

        const itemSubtotal = product.sellingPrice * item.quantity;
        const itemTax = itemSubtotal * product.taxRate;
        const itemTotal = itemSubtotal + itemTax;

        subtotal += itemSubtotal;
        taxTotal += itemTax;

        processedItems.push({
          id: crypto.randomUUID(),
          saleId,
          productId: product.id,
          batchId: batch.id,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate,
          taxAmount: itemTax,
          subtotal: itemSubtotal,
          total: itemTotal
        });
      }

      const total = subtotal + taxTotal;
      const invoiceNumber = this.generateInvoiceNumber();
      const now = new Date();
      const hash = this.generateSaleHash(invoiceNumber, total, now);
      const qrCodeData = `NENOVA|${invoiceNumber}|${total.toFixed(2)}|${hash}`;

      db.prepare(`
        INSERT INTO Sale (id, invoiceNumber, subtotal, taxTotal, total, paymentMethod, hash, qrCodeData, userId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId,
        invoiceNumber,
        subtotal,
        taxTotal,
        total,
        data.paymentMethod,
        hash,
        qrCodeData,
        data.userId,
        now.toISOString()
      );

      const itemStmt = db.prepare(`
        INSERT INTO SaleItem (id, saleId, productId, batchId, quantity, unitPrice, taxRate, taxAmount, subtotal, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pi of processedItems) {
        itemStmt.run(
          pi.id,
          pi.saleId,
          pi.productId,
          pi.batchId,
          pi.quantity,
          pi.unitPrice,
          pi.taxRate,
          pi.taxAmount,
          pi.subtotal,
          pi.total
        );
      }
    });

    saleTx();
    return this.getSaleInvoice(saleId);
  }

  static getSaleInvoice(saleId: string) {
    const sale: any = db.prepare('SELECT * FROM Sale WHERE id = ?').get(saleId);
    if (!sale) throw new Error('Venda não encontrada');

    const items = db.prepare('SELECT * FROM SaleItem WHERE saleId = ?').all(saleId).map((item: any) => ({
      ...item,
      product: db.prepare('SELECT * FROM Product WHERE id = ?').get(item.productId),
      batch: db.prepare('SELECT * FROM Batch WHERE id = ?').get(item.batchId)
    }));

    const user = db.prepare('SELECT name, role FROM User WHERE id = ?').get(sale.userId);

    return { ...sale, items, user };
  }

  static getSaleByInvoiceNumber(invoiceNumber: string) {
    const sale: any = db.prepare('SELECT * FROM Sale WHERE invoiceNumber = ?').get(invoiceNumber.trim().toUpperCase());
    if (!sale) throw new Error('Fatura não encontrada com este número');
    return this.getSaleInvoice(sale.id);
  }

  static async processReturn(data: {
    saleId: string;
    saleItemId: string;
    userId: string;
    quantity: number;
    reason: string;
  }) {
    let returnRecord: any;

    const returnTx = db.transaction(() => {
      const saleItem: any = db.prepare('SELECT * FROM SaleItem WHERE id = ?').get(data.saleItemId);
      if (!saleItem || saleItem.saleId !== data.saleId) {
        throw new Error('Item de venda não encontrado nesta fatura');
      }

      if (data.quantity > saleItem.quantity) {
        throw new Error('Quantidade para troca/devolução superior à faturada');
      }

      const batch: any = db.prepare('SELECT * FROM Batch WHERE id = ?').get(saleItem.batchId);
      db.prepare('UPDATE Batch SET quantity = ? WHERE id = ?').run(batch.quantity + data.quantity, batch.id);

      const refundAmount = saleItem.unitPrice * data.quantity * (1 + saleItem.taxRate);
      const returnId = crypto.randomUUID();

      db.prepare(`
        INSERT INTO Return (id, saleId, saleItemId, userId, quantity, reason, refundAmount, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        returnId,
        data.saleId,
        data.saleItemId,
        data.userId,
        data.quantity,
        data.reason,
        refundAmount,
        new Date().toISOString()
      );

      returnRecord = db.prepare('SELECT * FROM Return WHERE id = ?').get(returnId);
    });

    returnTx();

    const rawSaleItem = db.prepare('SELECT * FROM SaleItem WHERE id = ?').get(data.saleItemId) as any;
    const rawProduct = rawSaleItem ? db.prepare('SELECT * FROM Product WHERE id = ?').get(rawSaleItem.productId) as any : null;

    return {
      ...returnRecord,
      saleItem: {
        ...rawSaleItem,
        product: rawProduct
      }
    };
  }

  static listAllSales() {
    const sales: any[] = db.prepare('SELECT * FROM Sale ORDER BY createdAt DESC').all();
    return sales.map(s => this.getSaleInvoice(s.id));
  }
}