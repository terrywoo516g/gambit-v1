import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL || 'file:./data/gambit.db';
const adapter = new PrismaLibSql({ url });

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function main() {
  await prisma.workspace.create({
    data: {
      id: 'test-ws-001',
      title: 'Test Workspace',
      mode: 'chat',
      toolsUsed: '[]',
      currentState: '{}',
    },
  });
  console.log('Workspace created successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());