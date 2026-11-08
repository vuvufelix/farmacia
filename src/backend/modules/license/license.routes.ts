import { Router } from 'express';
import { LicenseController } from './license.controller.js';
import { ensureAuthenticated, ensureRole } from '../../middlewares/auth.middleware.js'

const licenseRoutes = Router();

licenseRoutes.use(ensureAuthenticated)

licenseRoutes.get('/status', LicenseController.getStatus);
licenseRoutes.post('/activate', LicenseController.activate);

export { licenseRoutes };