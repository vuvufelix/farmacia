import db from '../../database/db.js';
import crypto from 'crypto';

export class SupplierService {
  static async createSupplier(data: any) {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO Supplier (id, name, contact, phone, email, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.name,
      data.contact || null,
      data.phone,
      data.email || null,
      data.address || null
    );
    return db.prepare('SELECT * FROM Supplier WHERE id = ?').get(id);
  }

  static async listSuppliers() {
    const suppliers: any[] = db.prepare('SELECT * FROM Supplier ORDER BY name ASC').all();
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM Product WHERE supplierId = ?');

    return suppliers.map(supplier => {
      const res: any = countStmt.get(supplier.id);
      return {
        ...supplier,
        _count: { products: res.count }
      };
    });
  }

  static async getLowStockProductsBySupplier(supplierId: string) {
    const products: any[] = db.prepare('SELECT * FROM Product WHERE supplierId = ?').all(supplierId);
    const lowStockItems = [];

    const batchStmt = db.prepare('SELECT * FROM Batch WHERE productId = ? AND quantity > 0');

    for (const product of products) {
      const batches: any[] = batchStmt.all(product.id);
      const currentStock = batches.reduce((acc: number, b: any) => acc + b.quantity, 0);

      if (currentStock <= product.minStock) {
        const suggestedQuantity = (product.minStock * 2) - currentStock;
        lowStockItems.push({
          productId: product.id,
          productName: product.name,
          code: product.code,
          currentStock,
          minStock: product.minStock,
          suggestedQuantity: Math.max(suggestedQuantity, product.minStock)
        });
      }
    }

    return lowStockItems;
  }

  static async generateWhatsAppOrderMessage(supplierId: string) {
    const supplier: any = db.prepare('SELECT * FROM Supplier WHERE id = ?').get(supplierId);
    if (!supplier) throw new Error('Fornecedor não encontrado');

    const itemsToOrder = await this.getLowStockProductsBySupplier(supplierId);

    if (itemsToOrder.length === 0) {
      return {
        hasItems: false,
        message: `Não há produtos abaixo do estoque mínimo para o fornecedor ${supplier.name}.`,
        whatsappUrl: null
      };
    }

    let textMessage = `*PEDIDO DE REPOSIÇÃO - NENOVA TECH*\n`;
    textMessage += `*Fornecedor:* ${supplier.name}\n`;
    textMessage += `*Data:* ${new Date().toLocaleDateString('pt-AO')}\n\n`;
    textMessage += `Olá! Gostaria de fazer o pedido dos seguintes itens com estoque baixo:\n\n`;

    itemsToOrder.forEach((item, index) => {
      textMessage += `${index + 1}. *${item.productName}*\n`;
      textMessage += `   - Qtd Atual: ${item.currentStock} | Qtd Solicitada: *${item.suggestedQuantity} un*\n`;
    });

    textMessage += `\nAguardo confirmação de disponibilidade e cotação. Obrigado!`;

    const cleanPhone = supplier.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(textMessage);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    return {
      hasItems: true,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      itemCount: itemsToOrder.length,
      rawText: textMessage,
      whatsappUrl,
      items: itemsToOrder
    };
  }
}