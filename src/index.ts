import express from 'express';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { logger } from './middlewares/logger.js';
import { notFound } from './middlewares/notFound.js';
import heroRoutes from './routes/heroRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import skinRoutes from './routes/skinRoutes.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(logger);
app.use(express.json());

// Endpoint Health Check (Fitur 1)
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: true,
    message: 'Server berjalan dengan baik',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Register routes untuk Fitur 2, 3, 4, dan 5
app.use('/api/heroes', heroRoutes);
app.use('/api/skins', skinRoutes);
app.use('/api/players', playerRoutes);

// Middleware 404 Not Found & Global Error Handler (Fitur 1)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);

  // Sinkronisasi PostgreSQL sequence untuk tabel Player agar ID autoincrement tidak bentrok dengan data seeder
  prisma
    .$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Player"', 'id'), COALESCE((SELECT MAX(id) FROM "Player"), 1))`,
    )
    .catch((err) => {
      console.error('Info: Sequence sync check:', err instanceof Error ? err.message : err);
    });
});
