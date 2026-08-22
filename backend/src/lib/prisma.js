const { PrismaClient } = require('@prisma/client');

// Singleton pattern to reuse Prisma client across modules
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

module.exports = prisma;
