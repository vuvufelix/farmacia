import { Router } from 'express'
import { ProductController } from './product.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'
import { ensureAuthenticated, ensureRole } from '../../middlewares/auth.middleware.js'

const productRoutes = Router()

productRoutes.use(checkActiveLicense)
productRoutes.use(ensureAuthenticated)

productRoutes.post('/', ensureRole(['ADMIN']), ProductController.create)
productRoutes.get('/', ProductController.list)
productRoutes.post('/batches', ensureRole(['ADMIN']), ProductController.addBatch)
productRoutes.get('/alerts/expiration', ProductController.getAlerts)
productRoutes.delete('/:id', ensureRole(['ADMIN']), ProductController.deleteProduct)

export { productRoutes }