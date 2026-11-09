import { prisma } from '../../database/prisma.client.js';
import crypto from 'crypto';

// Segredo fixo e idêntico ao do gerador de chaves
const MASTER_SECRET = 'NENOVA_SECRET_KEY_LUANDA_2026';

export class LicenseService {
  static async getStatus() {
    let license = await prisma.license.findFirst();

    if (!license) {
      const now = new Date();
      const initialExpiration = new Date();
      initialExpiration.setDate(initialExpiration.getDate() + 30);

      license = await prisma.license.create({
        data: {
          pharmacyName: 'Farmácia Nenova Tech (Demo)',
          licenseKey: 'NENOVA-INITIAL-TRIAL',
          startDate: now,
          isActive: true,
          expiresAt: initialExpiration,
        },
      });
    }

    const now = new Date();
    const isExpired = new Date(license.expiresAt) < now;

    if (isExpired && license.isActive) {
      license = await prisma.license.update({
        where: { id: license.id },
        data: { isActive: false },
      });
    }

    return {
      id: license.id,
      isActive: license.isActive && !isExpired,
      expiresAt: license.expiresAt,
      daysRemaining: Math.max(0, Math.ceil((new Date(license.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    };
  }

  static async activateWithKey(activationKey: string) {
    const cleanKey = activationKey.trim().toUpperCase();

    const match = cleanKey.match(/^NV-(1|3|6|12)-([A-F0-9]{8})$/);
    if (!match) {
      throw new Error('Chave de ativação inválida ou mal formatada. Contacte a Nenova Tech.');
    }

    const months = parseInt(match[1], 10);
    const hashProvided = match[2];

    // Validação com o segredo fixo MASTER_SECRET
    const expectedHash = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(`PLAN-${months}-MONTHS`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    if (hashProvided !== expectedHash) {
      throw new Error('Chave de ativação incorreta ou alterada. Solicite uma nova chave à Nenova Tech.');
    }

    const status = await this.getStatus();
    const now = new Date();
    let baseDate = status.isActive && new Date(status.expiresAt) > now ? new Date(status.expiresAt) : now;
    
    const newExpiration = new Date(baseDate);
    newExpiration.setMonth(newExpiration.getMonth() + months);

    let license = await prisma.license.findFirst();

    if (license) {
      license = await prisma.license.update({
        where: { id: license.id },
        data: {
          licenseKey: cleanKey,
          isActive: true,
          expiresAt: newExpiration,
          lastVerified: now,
        },
      });
    } else {
      license = await prisma.license.create({
        data: {
          pharmacyName: 'Farmácia Nenova Tech',
          licenseKey: cleanKey,
          startDate: now,
          isActive: true,
          expiresAt: newExpiration,
        },
      });
    }

    return {
      message: `Licença renovada com sucesso por ${months} mês(es)!`,
      expiresAt: license.expiresAt,
      isActive: true,
    };
  }

  static generateKeyForClient(months: 1 | 3 | 6 | 12): string {
    const hash = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(`PLAN-${months}-MONTHS`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    return `NV-${months}-${hash}`;
  }
}