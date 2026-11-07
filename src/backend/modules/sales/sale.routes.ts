import { Router } from 'express'
import { SaleController } from './sale.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'

const saleRoutes = Router()

saleRoutes.use(checkActiveLicense)

saleRoutes.post('/', SaleController.create)
saleRoutes.post('/returns', SaleController.processReturn)
saleRoutes.get('/:id/invoice', SaleController.printInvoice)

export { saleRoutes }