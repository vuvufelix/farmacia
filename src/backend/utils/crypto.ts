import crypto from 'crypto'

const SECRET_LICENSE_KEY = process.env.LICENSE_SECRET || 'nenova-tech-offline-secret-key-2026'

interface LicensePayload {
  pharmacyName: string
  startDate: string
  expiresAt: string
}

export function generateLicenseKey(payload: LicensePayload): string {
  const dataString = `${payload.pharmacyName}|${payload.startDate}|${payload.expiresAt}`
  const hmac = crypto.createHmac('sha256', SECRET_LICENSE_KEY).update(dataString).digest('hex')
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `${payloadBase64}.${hmac}`
}

export function verifyLicenseKey(licenseKey: string): { valid: boolean; payload?: LicensePayload; error?: string } {
  try {
    const parts = licenseKey.split('.')
    if (parts.length !== 2) {
      return { valid: false, error: 'Formato de chave de licença inválido' }
    }

    const [payloadBase64, hmacSignature] = parts
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8')
    const payload: LicensePayload = JSON.parse(payloadJson)

    const expectedDataString = `${payload.pharmacyName}|${payload.startDate}|${payload.expiresAt}`
    const expectedHmac = crypto.createHmac('sha256', SECRET_LICENSE_KEY).update(expectedDataString).digest('hex')

    if (hmacSignature !== expectedHmac) {
      return { valid: false, error: 'Assinatura digital da licença é inválida' }
    }

    const expirationDate = new Date(payload.expiresAt)
    const currentDate = new Date()

    if (currentDate > expirationDate) {
      return { valid: false, payload, error: 'Subscrição mensal de 10.000 Kz expirou' }
    }

    return { valid: true, payload }
  } catch {
    return { valid: false, error: 'Erro ao validar a chave de licença' }
  }
}