import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middlewares/errorHandler.js';

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

// 1. POST /api/players (Create Player)
export const createPlayer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { nickname } = req.body ?? {};

    if (typeof nickname !== 'string' || !nickname.trim()) {
      throw new HttpError(400, 'Nickname wajib diisi');
    }

    const normalizedNickname = nickname.trim();
    const existingPlayer = await prisma.player.findUnique({
      where: { nickname: normalizedNickname },
    });

    if (existingPlayer) {
      throw new HttpError(409, 'Nickname sudah digunakan');
    }

    let newPlayer;
    try {
      newPlayer = await prisma.player.create({
        data: {
          nickname: normalizedNickname,
        },
      });
    } catch (createErr: unknown) {
      if (isUniqueConstraintError(createErr)) {
        // Sinkronkan sequence autoincrement ID di PostgreSQL jika tertinggal dari seeding, lalu coba sekali lagi
        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"Player"', 'id'), COALESCE((SELECT MAX(id) FROM "Player"), 1))`,
        );
        newPlayer = await prisma.player.create({
          data: {
            nickname: normalizedNickname,
          },
        });
      } else {
        throw createErr;
      }
    }

    res.status(201).json({
      status: true,
      message: 'Player berhasil dibuat',
      data: newPlayer,
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      next(new HttpError(409, 'Nickname sudah digunakan'));
      return;
    }
    next(error);
  }
};

// 2. GET /api/players/:player_id (Get Player Detail + Heroes)
export const getPlayerById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const playerId = positiveInteger(req.params.player_id);
    if (!playerId) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        heroes: {
          include: {
            hero: true,
          },
        },
      },
    });

    if (!player) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil data player',
      data: {
        id: player.id,
        nickname: player.nickname,
        bp: player.bp,
        diamond: player.diamond,
        createdAt: player.createdAt,
        heroes: player.heroes.map((ph) => ({
          heroId: ph.heroId,
          name: ph.hero.name,
          currency: ph.currency,
          pricePaid: ph.pricePaid,
        })),
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};

// 3. PATCH /api/players/:player_id (Update Player Nickname)
export const updatePlayer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const playerId = positiveInteger(req.params.player_id);
    if (!playerId) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!existingPlayer) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const { nickname } = req.body ?? {};
    if (typeof nickname !== 'string' || !nickname.trim()) {
      throw new HttpError(400, 'Nickname wajib diisi');
    }

    const normalizedNickname = nickname.trim();
    const duplicatePlayer = await prisma.player.findUnique({
      where: { nickname: normalizedNickname },
    });

    if (duplicatePlayer && duplicatePlayer.id !== playerId) {
      throw new HttpError(409, 'Nickname sudah digunakan oleh player lain');
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { nickname: normalizedNickname },
    });

    res.status(200).json({
      status: true,
      message: 'Player berhasil diperbarui',
      data: updatedPlayer,
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      next(new HttpError(409, 'Nickname sudah digunakan oleh player lain'));
      return;
    }
    next(error);
  }
};

// 4. DELETE /api/players/:player_id (Delete Player)
export const deletePlayer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const playerId = positiveInteger(req.params.player_id);
    if (!playerId) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!existingPlayer) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const deletedPlayer = await prisma.player.delete({
      where: { id: playerId },
    });

    res.status(200).json({
      status: true,
      message: 'Player berhasil dihapus',
      data: deletedPlayer,
    });
  } catch (error: unknown) {
    next(error);
  }
};

// 5. POST /api/players/:player_id/topup (Top Up Diamond)
export const topUpDiamond = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { amount } = req.body ?? {};

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      throw new HttpError(400, 'Amount harus berupa bilangan bulat lebih dari 0');
    }

    const playerId = positiveInteger(req.params.player_id);
    if (!playerId) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!existingPlayer) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        diamond: {
          increment: amount,
        },
      },
    });

    res.status(200).json({
      status: true,
      message: 'Top up berhasil',
      data: {
        playerId: updatedPlayer.id,
        amount,
        diamond: updatedPlayer.diamond,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};

// 6. POST /api/players/:player_id/matches (Bermain Match)
export const playMatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { result } = req.body ?? {};

    if (result !== 'WIN' && result !== 'LOSE') {
      throw new HttpError(400, 'Result harus bernilai WIN atau LOSE');
    }

    const playerId = positiveInteger(req.params.player_id);
    if (!playerId) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!existingPlayer) {
      throw new HttpError(404, 'Player tidak ditemukan');
    }

    const bpEarned = result === 'WIN' ? 300 : 100;

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        bp: {
          increment: bpEarned,
        },
      },
    });

    res.status(200).json({
      status: true,
      message: 'Hadiah match berhasil ditambahkan',
      data: {
        playerId: updatedPlayer.id,
        result,
        bpEarned,
        bp: updatedPlayer.bp,
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};

// Tambahkan fungsi ini di bagian paling bawah playerController.ts
export const buyHero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const playerId = parseInt(req.params.player_id);
    const { heroId, currency } = req.body;

    // 1. Cek Input Kosong / Format Salah
    if (!heroId || !currency || (currency !== 'BP' && currency !== 'DIAMOND')) {
      res.status(400).json({ status: false, message: "heroId wajib diisi dan currency harus BP atau DIAMOND" });
      return;
    }

    // 2. Cek Player Ada/Tidak
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      res.status(404).json({ status: false, message: "Player tidak ditemukan" });
      return;
    }

    // 3. Cek Hero Ada/Tidak
    const hero = await prisma.hero.findUnique({ where: { id: heroId } });
    if (!hero) {
      res.status(404).json({ status: false, message: "Hero tidak ditemukan" });
      return;
    }

    // 4. Cek Harga (Null = Tidak Bisa Dibeli dengan Currency Tersebut)
    const price = currency === 'BP' ? hero.priceBP : hero.priceDiamond;
    if (price === null) {
      res.status(400).json({ status: false, message: `Hero tidak bisa dibeli menggunakan ${currency}` });
      return;
    }

    // 5. Cek Apakah Player Sudah Punya Hero Ini (Pakai kombinasi Unique)
    const alreadyOwned = await prisma.playerHero.findUnique({
      where: { playerId_heroId: { playerId, heroId } }
    });
    if (alreadyOwned) {
      res.status(409).json({ status: false, message: "Player sudah memiliki hero tersebut" });
      return;
    }

    // 6. Cek Saldo
    const balance = currency === 'BP' ? player.bp : player.diamond;
    if (balance < price) {
      res.status(400).json({ status: false, message: `Saldo ${currency} tidak cukup` });
      return;
    }

    // --- TRANSACTION DATABASE ---
    const [updatedPlayer, playerHero] = await prisma.$transaction([
      prisma.player.update({
        where: { id: playerId },
        data: currency === 'BP' 
          ? { bp: { decrement: price } } 
          : { diamond: { decrement: price } }
      }),
      prisma.playerHero.create({
        data: {
          playerId,
          heroId,
          currency,
          pricePaid: price
        },
        include: { hero: true }
      })
    ]);

    // Response 201 Created
    res.status(201).json({
      status: true,
      message: "Berhasil membeli hero",
      data: {
        hero: playerHero.hero,
        currency: playerHero.currency,
        pricePaid: playerHero.pricePaid,
        sisaBP: updatedPlayer.bp,
        sisaDiamond: updatedPlayer.diamond
      }
    });
  } catch (error) {
    next(error); // Lempar ke Error Handler global punya Orang 2
  }
};