# MLBB Shop API

## Menjalankan proyek

Buka terminal pada folder yang berisi `package.json`, `src/`, dan `prisma/`.
Pastikan `.env` berisi `DATABASE_URL` PostgreSQL yang valid. Jika `.env` belum
ada, buat dari `.env.example`; jangan menimpa `.env` yang sudah berisi kredensial.
Jangan commit file `.env`.

```bash
npm install
npm run prisma:generate
npm run typecheck
npm run dev
```

Server berjalan di `http://localhost:3000`. Jika PowerShell memblokir
`npm.ps1`, jalankan perintah dengan `npm.cmd`, misalnya `npm.cmd run dev`.

`npm run build` membuat hasil kompilasi di `dist/`; `npm start` menjalankan hasil
tersebut. `npm test` menjalankan pemeriksaan TypeScript.

## Database

Prisma membaca `DATABASE_URL` dari `.env`. Jalankan `npm run db:studio` untuk
membuka Prisma Studio. Seed hanya dijalankan saat diminta:

```bash
npm run db:seed
```

**Seed mengosongkan tabel `PlayerHero`, `Player`, `Skin`, dan `Hero` sebelum
mengisi data.** Pastikan database yang dipakai benar dan datanya boleh dihapus
sebelum menjalankannya.

## Endpoint

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/heroes?page=1&limit=10&search=miya&role=MARKSMAN` | Daftar, pencarian, dan filter hero |
| GET | `/api/heroes/:hero_id` | Detail hero beserta skin |
| POST | `/api/heroes` | Menambahkan hero |
| GET | `/api/skins?page=1&limit=10&heroId=1&rarity=EXQUISITE` | Daftar dan filter skin |
| GET | `/api/skins/:skin_id` | Detail skin beserta hero |