import { Router } from 'express'
import { SupplierController } from './supplier.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'

const supplierRoutes = Router()

supplierRoutes.use(checkActiveLicense)

supplierRoutes.post('/', SupplierController.create)
supplierRoutes.get('/', SupplierController.list)
supplierRoutes.get('/:supplierId/generate-order', SupplierController.generateOrder)

export { supplierRoutes }