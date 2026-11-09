import db from '../../database/db.js';

export class ReportService {
  static async getMonthlySalesAndTaxReport(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const sales: any[] = db.prepare(`
      SELECT * FROM Sale 
      WHERE createdAt >= ? AND createdAt <= ? 
      ORDER BY createdAt DESC
    `).all(startDate, endDate);

    const returns: any[] = db.prepare(`
      SELECT * FROM Return 
      WHERE createdAt >= ? AND createdAt <= ?
    `).all(startDate, endDate);

    let totalRevenue = 0;
    let totalTaxCollected = 0;
    const salesByOperator: Record<string, { count: number; total: number }> = {};

    const salesFormatted = sales.map(sale => {
      totalRevenue += sale.total;
      totalTaxCollected += sale.taxTotal;

      const user: any = db.prepare('SELECT name, username FROM User WHERE id = ?').get(sale.userId);
      const operatorName = user ? user.name : 'Desconhecido';

      if (!salesByOperator[operatorName]) {
        salesByOperator[operatorName] = { count: 0, total: 0 };
      }
      salesByOperator[operatorName].count += 1;
      salesByOperator[operatorName].total += sale.total;

      const items = db.prepare('SELECT * FROM SaleItem WHERE saleId = ?').all(sale.id).map((i: any) => ({
        ...i,
        product: db.prepare('SELECT * FROM Product WHERE id = ?').get(i.productId)
      }));

      return { ...sale, user, items };
    });

    const returnsFormatted = returns.map(ret => {
      const user: any = db.prepare('SELECT name FROM User WHERE id = ?').get(ret.userId);
      const saleItem: any = db.prepare('SELECT * FROM SaleItem WHERE id = ?').get(ret.saleItemId);
      const product = saleItem ? db.prepare('SELECT * FROM Product WHERE id = ?').get(saleItem.productId) : null;
      const sale: any = db.prepare('SELECT invoiceNumber FROM Sale WHERE id = ?').get(ret.saleId);

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