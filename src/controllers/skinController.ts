import { Prisma, Rarity } from '@prisma/client';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isRarity(value: unknown): value is Rarity {
  return (
    typeof value === 'string' &&
    Object.values(Rarity).includes(value as Rarity)
  );
}

// 1. GET /api/skins (Pagination, Filter heroId & rarity + Include Hero Name)[cite: 6, 8]
export const getAllSkins = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page === undefined ? 1 : positiveInteger(req.query.page);
    const limit = req.query.limit === undefined ? 10 : positiveInteger(req.query.limit);
    const heroId = req.query.heroId === undefined
      ? undefined
      : positiveInteger(req.query.heroId);
    const rarity = req.query.rarity;

    if (!page || !limit) {
      res.status(400).json({ status: false, message: 'Page dan limit harus bilangan bulat positif' });
      return;
    }

    if (req.query.heroId !== undefined && !heroId) {
      res.status(400).json({ status: false, message: 'heroId harus bilangan bulat positif' });
      return;
    }

    if (rarity !== undefined && !isRarity(rarity)) {
      res.status(400).json({ status: false, message: 'Rarity tidak valid' });
      return;
    }

    const where: Prisma.SkinWhereInput = {};

    if (heroId) {
      where.heroId = heroId;
    }

    if (rarity) {
      where.rarity = rarity;
    }

    const totalItems = await prisma.skin.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    const skins = await prisma.skin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'asc' },
      include: {
        hero: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil data skin',
      data: skins,
      metadata: {
        currentPage: page,
        limit,
        totalItems,
        totalPages
      }
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : 'Terjadi kesalahan pada server',
    });
  }
};

// 2. GET /api/skins/:skin_id (Detail Skin + Include Hero Name)[cite: 6, 9]
export const getSkinById = async (req: Request, res: Response): Promise<void> => {
  try {
    const skinId = positiveInteger(req.params.skin_id);
    if (!skinId) {
      res.status(400).json({ status: false, message: 'skin_id tidak valid' });
      return;
    }

    const skin = await prisma.skin.findUnique({
      where: { id: skinId },
      include: {
        hero: {
          select: { name: true }
        }
      }
    });

    if (!skin) {
      res.status(404).json({ status: false, message: 'Skin tidak ditemukan' });
      return;
    }

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil detail skin',
      data: skin
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : 'Terjadi kesalahan pada server',
    });
  }
};