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

    // 1. Extrair os dados da chave: Meses, NIF da chave e o Hash
    const match = cleanKey.match(/^NV-(1|3|6|12)-([A-Z0-9]+)-([A-F0-9]{8})$/);
    if (!match) {
      throw new Error('Chave de ativação inválida ou mal formatada. Contacte a Nenova Tech.');
    }

    const months = parseInt(match[1], 10);
    const clientNif = match[2];
    const hashProvided = match[3];

    // 2. Buscar o registo da licença atual na base de dados local da farmácia
    let license = await prisma.license.findFirst();
    
    // Se já existir um NIF configurado nesta farmácia, BLOQUEAR se a chave for para outro NIF!
    if (license && license.nif) {
      if (license.nif !== clientNif) {
        throw new Error(`Erro de Segurança: Esta chave foi emitida para o NIF ${clientNif}, mas o NIF registado nesta farmácia é ${license.nif}!`);
      }
    }

    // 3. Validar o hash criptográfico com o segredo mestre
    const expectedHash = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(`PLAN-${months}-MONTHS-${clientNif}`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    if (hashProvided !== expectedHash) {
      throw new Error('Chave de ativação incorreta ou alterada.');
    }

    const status = await this.getStatus();
    const now = new Date();
    let baseDate = status.isActive && new Date(status.expiresAt) > now ? new Date(status.expiresAt) : now;
    
    const newExpiration = new Date(baseDate);
    newExpiration.setMonth(newExpiration.getMonth() + months);

    // 4. Guardar ou atualizar na base de dados local
    if (license) {
      license = await prisma.license.update({
        where: { id: license.id },
        data: {
          nif: clientNif, // Garante que o NIF fica travado aqui
          licenseKey: cleanKey,
          isActive: true,
          expiresAt: newExpiration,
          lastVerified: now,
        },
      });
    } else {
      license = await prisma.license.create({
        data: {
          pharmacyName: `Farmácia (NIF: ${clientNif})`,
          nif: clientNif,
          licenseKey: cleanKey,
          startDate: now,
          isActive: true,
          expiresAt: newExpiration,
        },
      });
    }

    return {
      message: `Licença ativada com sucesso para o NIF ${clientNif} por ${months} mês(es)!`,
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