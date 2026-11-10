import db from '../../database/db.js';

export class ReportService {
  static async getMonthlySalesAndTaxReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    // Consulta na tabela mapeada 'sales'
    const sales: any[] = db.prepare(`
      SELECT * FROM sales 
      WHERE createdAt >= ? AND createdAt <= ? 
      ORDER BY createdAt DESC
    `).all(startDate, endDate);

    // Consulta na tabela mapeada 'returns'
    const returns: any[] = db.prepare(`
      SELECT * FROM returns 
      WHERE createdAt >= ? AND createdAt <= ?
    `).all(startDate, endDate);

    let totalRevenue = 0;
    let totalTaxCollected = 0;
    const salesByOperator: Record<string, { count: number; total: number }> = {};

    const salesFormatted = sales.map(sale => {
      totalRevenue += sale.total;
      totalTaxCollected += sale.taxTotal;

      // Tabela 'users'
      const user: any = db.prepare('SELECT name, username FROM users WHERE id = ?').get(sale.userId);
      const operatorName = user ? user.name : 'Desconhecido';

      if (!salesByOperator[operatorName]) {
        salesByOperator[operatorName] = { count: 0, total: 0 };
      }
      salesByOperator[operatorName].count += 1;
      salesByOperator[operatorName].total += sale.total;

      // Tabela 'sale_items' e 'products'
      const items = db.prepare('SELECT * FROM sale_items WHERE saleId = ?').all(sale.id).map((i: any) => ({
        ...i,
        product: db.prepare('SELECT * FROM products WHERE id = ?').get(i.productId)
      }));

      return { ...sale, user, items };
    });

    const returnsFormatted = returns.map(ret => {
      const user: any = db.prepare('SELECT name FROM users WHERE id = ?').get(ret.userId);
      const saleItem: any = db.prepare('SELECT * FROM sale_items WHERE id = ?').get(ret.saleItemId);
      const product = saleItem ? db.prepare('SELECT * FROM products WHERE id = ?').get(saleItem.productId) : null;
      const sale: any = db.prepare('SELECT invoiceNumber FROM sales WHERE id = ?').get(ret.saleId);

      return {
        ...ret,
        user,
        saleItem: { ...saleItem, product },
        sale: { invoiceNumber: sale ? sale.invoiceNumber : '' }
      };
    });

    return {
      period: `${month}/${year}`,
      totalInvoices: sales.length,
      totalRevenue,
      totalTaxCollected,
      salesByOperator,
      salesDetails: salesFormatted,
      returnsDetails: returnsFormatted
    };
  }
}