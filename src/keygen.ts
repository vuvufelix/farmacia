import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log("--- CHAVE PRIVADA (Guarda apenas no teu servidor/gerador) ---");
console.log(privateKey);

console.log("--- CHAVE PÚBLICA (Coloca dentro de crypto.ts na app) ---");
console.log(publicKey);