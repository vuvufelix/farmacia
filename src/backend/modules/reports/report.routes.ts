import { Router } from 'express'
import { ReportController } from './report.controller.js'
import { checkActiveLicense } from '../../middlewares/license.middleware.js'
import { ensureAuthenticated, ensureRole } from '../../middlewares/auth.middleware.js'

const reportRoutes = Router()

reportRoutes.use(checkActiveLicense)
reportRoutes.use(ensureAuthenticated)
reportRoutes.use(ensureRole(['ADMIN', 'GERENTE', 'CONTABILISTA']))

reportRoutes.get('/monthly', ReportController.getMonthlyReport)

export { reportRoutes }