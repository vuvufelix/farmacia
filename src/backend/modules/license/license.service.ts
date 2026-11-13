import db from '../../database/db.js';
import { CryptoService, LicensePayload } from '../../utils/crypto.js';
import crypto from 'crypto';

export class LicenseService {
  /**
   * Retorna o estado atual da licença garantindo consistência (ordenado por data de criação descrescente).
   */
  static async getStatus() {
    // Correção do problema do LIMIT 1 sem ORDER BY: Ordenamos por createdAt DESC
    let license: any = db.prepare(
      'SELECT * FROM licenses ORDER BY createdAt DESC LIMIT 1'
    ).get();

    if (!license) {
      // Registo de licença inicial por defeito / demo se não existir nenhuma
      const defaultId = crypto.randomUUID();
      const now = new Date();
      const expires = new Date();
      expires.setDate(now.getDate() + 7); // 7 dias de demo inicial

      db.prepare(`
        INSERT INTO licenses (id, pharmacyName, licenseKey, nif, planMonths, isActive, startDate, expiresAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        defaultId,
        'Farmácia Demonstração',
        'DEMO-TRIAL-KEY',
        'CONSUMidor_DEMO',
        1,
        1,
        now.toISOString(),
        expires.toISOString()
      );

      license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(defaultId);
    }

    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isActive: license.isActive === 1 && daysRemaining > 0,
      expiresAt: license.expiresAt,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      nif: license.nif,
      planMonths: license.planMonths
    };
  }

  /**
   * Ativa a licença validando a assinatura criptográfica e prevenindo a reutilização da mesma chave.
   */
  static async activateLicense(signedData: { licenseKey: string; payload: LicensePayload; signature: string }) {
    const { licenseKey, payload, signature } = signedData;

    // 1. Verificar se esta exata chave de licença ou ID único já foi ativado anteriormente no banco
    const existing = db.prepare('SELECT * FROM licenses WHERE licenseKey = ? OR id = ?').get(licenseKey, payload.licenseId);
    if (existing) {
      throw new Error('Esta chave de ativação já foi utilizada anteriormente. A reutilização é proibida.');
    }

    // 2. Validar a assinatura digital da licença usando a chave pública
    const dataString = JSON.stringify(payload);
    const isValidSignature = CryptoService.verifyLicense(dataString, signature);

    if (!isValidSignature) {
      throw new Error('A assinatura da licença é inválida ou foi adulterada.');
    }

    // 3. Registar a nova licença de forma segura na base de dados (incluindo pharmacyName)
    const stmt = db.prepare(`
      INSERT INTO licenses (id, pharmacyName, licenseKey, nif, planMonths, isActive, startDate, expiresAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      payload.licenseId,
      `Farmácia NIF: ${payload.nif}`, // Preenche o campo pharmacyName para satisfazer a restrição NOT NULL
      licenseKey,
      payload.nif,
      payload.planMonths,
      payload.startDate,
      payload.expiresAt
    );

    return { success: true, message: 'Licença ativada com sucesso por assinatura digital.' };
  }
}