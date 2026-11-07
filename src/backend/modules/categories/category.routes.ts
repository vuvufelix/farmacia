import { Router } from 'express'
import { CategoryController } from './category.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'
import { ensureAuthenticated } from '../../middlewares/auth.middleware.js'

const categoryRoutes = Router()

categoryRoutes.use(checkActiveLicense)
categoryRoutes.use(ensureAuthenticated)

categoryRoutes.get('/', CategoryController.list)
categoryRoutes.post('/', CategoryController.create)

export { categoryRoutes }