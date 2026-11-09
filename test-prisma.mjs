import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Testando a conexão com o Prisma e o SQLite...');
  
  // Tenta listar os registros de uma tabela (substitua 'product' ou qualquer model seu)
  try {
    const count = await prisma.product.count();
    console.log(`Sucesso total! Conexão estabelecida. Total de produtos no banco: ${count}`);
  } catch (error) {
    console.error('Erro ao consultar o banco via Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();