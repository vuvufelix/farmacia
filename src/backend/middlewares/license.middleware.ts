import { Request, Response, NextFunction } from 'express'
import { LicenseService } from '../modules/license/license.service.js'

export async function checkActiveLicense(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await LicenseService.checkStatus()

    if (!status.active) {
      return res.status(402).json({
        error: 'Licença Expirada ou Inválida',
        message: status.reason,
        requiresLicenseActivation: true
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar licença do sistema' })
  }
}