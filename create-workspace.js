const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.workspace.create({
    data: {
      id: 'test-ws-001',
      title: 'Test Workspace',
      mode: 'chat',
      toolsUsed: [],
      currentState: {},
    },
  });
  console.log('Workspace created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
