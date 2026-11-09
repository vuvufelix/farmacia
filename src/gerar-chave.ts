import crypto from 'node:crypto';

const MASTER_SECRET = 'NENOVA_SECRET_KEY_LUANDA_2026';

function generateKeyForClient(months: 1 | 3 | 6 | 12): string {
  const hash = crypto
    .createHmac('sha256', MASTER_SECRET)
    .update(`PLAN-${months}-MONTHS`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  return `NV-${months}-${hash}`;
}

console.log("========================================");
console.log(" CHAVES DE ATIVAÇÃO NENOVA TECH (LUANDA)");
console.log("========================================");
console.log("1 Mês (10.000 Kz)   :", generateKeyForClient(1));
console.log("3 Meses (30.000 Kz) :", generateKeyForClient(3));
console.log("6 Meses (60.000 Kz) :", generateKeyForClient(6));
console.log("1 Ano (120.000 Kz)  :", generateKeyForClient(12));
console.log("========================================");