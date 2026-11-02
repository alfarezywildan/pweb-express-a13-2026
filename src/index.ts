import express from 'express';
import heroRoutes from './routes/heroRoutes.js';
import skinRoutes from './routes/skinRoutes.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Register routes untuk Fitur 2 dan 3[cite: 6]
app.use('/api/heroes', heroRoutes);
app.use('/api/skins', skinRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});