import { Request, Response, NextFunction } from 'express'
import { LicenseService } from '../modules/license/license.service.js'

export async function checkActiveLicense(req: Request, res: Response, next: NextFunction) {
  try {
    // Alinhado com o nome correto do método no LicenseService
    const status = await LicenseService.getStatus()

    // Alinhado com a propriedade isActive retornada pelo getStatus()
    if (!status.isActive) {
      return res.status(402).json({
        error: 'Licença Expirada ou Inválida',
        message: 'A subscrição mensal do sistema expirou. Contacte a Nenova Tech para renovar.',
        requiresLicenseActivation: true
      })
    }

    next()
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao verificar licença do sistema' })
  }
}