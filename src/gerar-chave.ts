import crypto from 'crypto';
import { CryptoService, LicensePayload } from './backend/utils/crypto.js';

// CHAVE PRIVADA SECRETA DA NENOVA TECH (Nunca deve ir para o cliente / app Electron)
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIM3NY+DJPE2qJvYLs88QNntuSxbJ44BWLZe51GKtu+wh
-----END PRIVATE KEY-----`;

function generateSignedLicense(nif: string, planMonths: number) {
  const licenseId = crypto.randomUUID();
  const startDate = new Date().toISOString();
  
  const expires = new Date();
  expires.setMonth(expires.getMonth() + planMonths);
  const expiresAt = expires.toISOString();

  const payload: LicensePayload = {
    licenseId,
    nif: nif.trim().toUpperCase(),
    planMonths,
    issuedAt: new Date().toISOString(),
    startDate,
    expiresAt
  };

  // Assinar com a chave privada
  const signature = CryptoService.signLicensePayload(payload, PRIVATE_KEY_PEM);

  console.log('=== LICENÇA GERADA COM SUCESSO ===');
  console.log(JSON.stringify({ licenseKey: `NV-${planMonths}-${payload.nif}-${licenseId.slice(0,8)}`, payload, signature }, null, 2));
}

// Exemplo de emissão para uma farmácia:
generateSignedLicense('5401122334', 3);