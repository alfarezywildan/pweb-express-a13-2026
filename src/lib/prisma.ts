import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL belum diatur. Periksa file .env sebelum menjalankan server.');
}

const adapter = new PrismaNeon({ connectionString });

export const prisma = new PrismaClient({ adapter });