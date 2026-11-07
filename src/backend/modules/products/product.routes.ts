import { Router } from 'express'
import { ProductController } from './product.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'

const productRoutes = Router()

productRoutes.use(checkActiveLicense)

productRoutes.post('/', ProductController.create)
productRoutes.get('/', ProductController.list)
productRoutes.post('/batches', ProductController.addBatch)
productRoutes.get('/alerts/expiration', ProductController.getAlerts)

export { productRoutes }