import crypto from 'crypto';

// Chave pública hardcoded na aplicação para validação offline segura.
// (A chave privada correspondente fica apenas no gerador da Nenova Tech).
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAab735LdKbGeuBVSHu8OG5zXXihlu3JF3th21Q8oBHmc=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  licenseId: string;
  nif: string;
  planMonths: number;
  issuedAt: string;
  startDate: string;
  expiresAt: string;
  installationId?: string;
}

export class CryptoService {
  /**
   * Valida a assinatura digital Ed25519 de uma licença.
   */
  static verifyLicense(licenseString: string, signatureHex: string): boolean {
    try {
      const pubKey = crypto.createPublicKey(PUBLIC_KEY_PEM);
      const isVerified = crypto.verify(
        null,
        Buffer.from(licenseString),
        pubKey,
        Buffer.from(signatureHex, 'hex')
      );
      return isVerified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Função utilitária para uso exclusivo do Gerador da Nenova Tech (Chave Privada).
   */
  static signLicensePayload(payload: LicensePayload, privateKeyPem: string): string {
    const dataString = JSON.stringify(payload);
    const signature = crypto.sign(null, Buffer.from(dataString), crypto.createPrivateKey(privateKeyPem));
    return signature.toString('hex');
  }
}