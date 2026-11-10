import db from '../../database/db.js';
import crypto from 'crypto';

const MASTER_SECRET = 'NENOVA_SECRET_KEY_LUANDA_2026';

export class LicenseService {
  static async getStatus() {
    // Nota: Confirme se o nome da tabela na sua BD é 'licenses' (conforme o @@map do Prisma) ou 'License'
    let license: any = db.prepare('SELECT * FROM licenses LIMIT 1').get();

    if (!license) {
      const now = new Date();
      const initialExpiration = new Date();
      initialExpiration.setDate(initialExpiration.getDate() + 30);
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO licenses (id, pharmacyName, licenseKey, startDate, isActive, expiresAt)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(
        id,
        'Farmácia Nenova Tech (Demo)',
        'NENOVA-INITIAL-TRIAL',
        now.toISOString(),
        initialExpiration.toISOString()
      );

      license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(id);
    }

    const now = new Date();
    const expiresAtDate = new Date(license.expiresAt);
    const isExpired = expiresAtDate < now;
    const isActiveBool = Boolean(license.isActive);

    if (isExpired && isActiveBool) {
      db.prepare('UPDATE licenses SET isActive = 0 WHERE id = ?').run(license.id);
      license.isActive = 0;
    }

    return {
      id: license.id,
      isActive: Boolean(license.isActive) && !isExpired,
      expiresAt: license.expiresAt,
      daysRemaining: Math.max(0, Math.ceil((expiresAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    };
  }

  static async activateWithKey(activationKey: string) {
    const cleanKey = activationKey.trim().toUpperCase();
    const match = cleanKey.match(/^NV-(1|3|6|12)-([A-Z0-9]+)-([A-F0-9]{8})$/);
    if (!match) {
      throw new Error('Chave de ativação inválida ou mal formatada. Contacte a Nenova Tech.');
    }

    const months = parseInt(match[1], 10);
    const clientNif = match[2];
    const hashProvided = match[3];

    let license: any = db.prepare('SELECT * FROM licenses LIMIT 1').get();

    if (license && license.nif) {
      if (license.nif !== clientNif) {
        throw new Error(`Erro de Segurança: Esta chave foi emitida para o NIF ${clientNif}, mas o NIF registado nesta farmácia é ${license.nif}!`);
      }
    }

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

    if (license) {
      db.prepare(`
        UPDATE licenses 
        SET nif = ?, licenseKey = ?, isActive = 1, expiresAt = ?, lastVerified = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        clientNif,
        cleanKey,
        newExpiration.toISOString(),
        now.toISOString(),
        license.id
      );
      license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(license.id);
    } else {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO licenses (id, pharmacyName, nif, licenseKey, startDate, isActive, expiresAt)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        id,
        `Farmácia (NIF: ${clientNif})`,
        clientNif,
        cleanKey,
        now.toISOString(),
        newExpiration.toISOString()
      );
      license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(id);
    }

    return {
      message: `Licença ativada com sucesso para o NIF ${clientNif} por ${months} mês(es)!`,
      expiresAt: license.expiresAt,
      isActive: true,
    };
  }

  static generateKeyForClient(months: 1 | 3 | 6 | 12, nif: string): string {
    const cleanNif = nif.trim().toUpperCase();
    const hash = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(`PLAN-${months}-MONTHS-${cleanNif}`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    return `NV-${months}-${cleanNif}-${hash}`;
  }
}