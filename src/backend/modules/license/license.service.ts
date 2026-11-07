import { prisma } from '../../database/prisma.client.js'
import { verifyLicenseKey, generateLicenseKey } from '../../utils/crypto.js'

export class LicenseService {
  static async activateLicense(pharmacyName: string, licenseKey: string) {
    const verification = verifyLicenseKey(licenseKey)

    if (!verification.valid || !verification.payload) {
      throw new Error(verification.error || 'Chave de licença inválida')
    }

    await prisma.license.deleteMany({})

    const license = await prisma.license.create({
      data: {
        pharmacyName,
        licenseKey,
        startDate: new Date(verification.payload.startDate),
        expiresAt: new Date(verification.payload.expiresAt),
        isActive: true,
        lastVerified: new Date()
      }
    })

    return license
  }

  static async checkStatus() {
    const currentLicense = await prisma.license.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!currentLicense) {
      return { active: false, reason: 'Nenhuma licença instalada no sistema' }
    }

    const verification = verifyLicenseKey(currentLicense.licenseKey)
    const now = new Date()

    if (!verification.valid || now > currentLicense.expiresAt) {
      await prisma.license.update({
        where: { id: currentLicense.id },
        data: { isActive: false }
      })
      return { active: false, reason: 'Licença mensal (10.000 Kz) expirou' }
    }

    await prisma.license.update({
      where: { id: currentLicense.id },
      data: { lastVerified: now }
    })

    return {
      active: true,
      pharmacyName: currentLicense.pharmacyName,
      expiresAt: currentLicense.expiresAt,
      daysRemaining: Math.ceil((currentLicense.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  static async generateInitialKeyForSeed(pharmacyName: string, daysValid = 30) {
    const startDate = new Date()
    const expiresAt = new Date()
    expiresAt.setDate(startDate.getDate() + daysValid)

    return generateLicenseKey({
      pharmacyName,
      startDate: startDate.toISOString(),
      expiresAt: expiresAt.toISOString()
    })
  }
}