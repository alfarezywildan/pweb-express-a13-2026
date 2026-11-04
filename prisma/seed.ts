import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Inisialisasi adapter Neon sesuai requirement Prisma 7
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL belum diatur. Periksa file .env sebelum menjalankan seed.');
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Memulai proses seeding...');

  // 1. Kosongkan semua tabel & reset ID ke 1
  await prisma.$executeRawUnsafe(`TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`);

  // 2. Baca file JSON dari folder data/
  const heroesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'heroes.json'), 'utf-8'));
  const skinsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'skins.json'), 'utf-8'));

  // 3. Mapping Heroes (Ubah string kosong menjadi null)
  const mappedHeroes = heroesData.map((h: any) => ({
    name: h.name,
    role: h.primaryRole,
    lane: h.primaryLane,
    releaseYear: Number(h.releaseYear),
    priceBP: h.priceBP === "" || h.priceBP === null || h.priceBP === undefined ? null : Number(h.priceBP),
    priceDiamond: h.priceDiamond === "" || h.priceDiamond === null || h.priceDiamond === undefined ? null : Number(h.priceDiamond)
  }));
  await prisma.hero.createMany({ data: mappedHeroes });
  console.log(`Berhasil insert ${mappedHeroes.length} hero.`);

  // 4. Mapping Skins (Ubah string kosong "" pada priceDiamond menjadi null)
  const mappedSkins = skinsData.map((s: any) => ({
    name: s.name,
    heroId: Number(s.heroId),
    rarity: s.rarity,
    priceDiamond: s.priceDiamond === "" || s.priceDiamond === null || s.priceDiamond === undefined ? null : Number(s.priceDiamond)
  }));
  await prisma.skin.createMany({ data: mappedSkins });
  console.log(`Berhasil insert ${mappedSkins.length} skin.`);

  // 5. Insert 3 Player bawaan & kepemilikan hero awal
  await prisma.player.createMany({
    data: [
      { nickname: 'ArekITS', bp: 1500, diamond: 75 },
      { nickname: 'SangPushRank', bp: 13000, diamond: 2892 },
      { nickname: 'MageSurabaya', bp: 10000, diamond: 0 }
    ]
  });

  await prisma.playerHero.createMany({
    data: [
      { playerId: 1, heroId: 18, currency: 'BP', pricePaid: 2000 },
      { playerId: 1, heroId: 1, currency: 'BP', pricePaid: 10800 },
      { playerId: 2, heroId: 84, currency: 'DIAMOND', pricePaid: 599 },
      { playerId: 2, heroId: 56, currency: 'BP', pricePaid: 32000 }
    ]
  });
  console.log('Berhasil insert data Player dan PlayerHero.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });