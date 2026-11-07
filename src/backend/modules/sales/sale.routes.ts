import { Router } from 'express'
import { SaleController } from './sale.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'

const saleRoutes = Router()

saleRoutes.use(checkActiveLicense)

// 1. Listar todas as vendas (Histórico)
saleRoutes.get('/', SaleController.listSales)

// 2. Procurar fatura por número legível (ex: FR FMN2026/0001) - ANTES de parâmetros genéricos por ID
saleRoutes.get('/invoice-number/:invoiceNumber', SaleController.getByInvoiceNumber)

// 3. Criar venda
saleRoutes.post('/', SaleController.create)

// 4. Processar devoluções
saleRoutes.post('/returns', SaleController.processReturn)

// 5. Imprimir / Consultar fatura por ID UUID
saleRoutes.get('/:id/invoice', SaleController.printInvoice)

export { saleRoutes }