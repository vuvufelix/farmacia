import crypto from 'node:crypto';

const MASTER_SECRET = 'NENOVA_SECRET_KEY_LUANDA_2026';

function generateClientKey(months: 1 | 3 | 6 | 12, clientNif: string): string {
  const cleanNif = clientNif.trim().toUpperCase();
  
  // O payload inclui o plano e o NIF específico da farmácia
  const payload = `PLAN-${months}-MONTHS-${cleanNif}`;

  const hash = crypto
    .createHmac('sha256', MASTER_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  // Retorna a chave gerada com sucesso
  return `NV-${months}-${cleanNif}-${hash}`;
}

// Exemplo de uso para uma farmácia específica com NIF:
const nifFarmacia = '5401122334';

console.log("========================================");
console.log(` CHAVES DE ATIVAÇÃO PARA O NIF: ${nifFarmacia}`);
console.log("========================================");
console.log("1 Mês (10.000 Kz)   :", generateClientKey(1, nifFarmacia));
console.log("3 Meses (30.000 Kz) :", generateClientKey(3, nifFarmacia));
console.log("6 Meses (60.000 Kz) :", generateClientKey(6, nifFarmacia));
console.log("1 Ano (120.000 Kz)  :", generateClientKey(12, nifFarmacia));
console.log("========================================");