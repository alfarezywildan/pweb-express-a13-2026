import { Lane, Prisma, Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isEnumValue<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function optionalPrice(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

// 1. GET /api/heroes (Pagination, Search, Filter Role)[cite: 6, 7]
export const getAllHeroes = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page === undefined ? 1 : positiveInteger(req.query.page);
    const limit = req.query.limit === undefined ? 10 : positiveInteger(req.query.limit);
    const search = req.query.search;
    const role = req.query.role;

    if (!page || !limit) {
      res.status(400).json({ status: false, message: 'Page dan limit harus bilangan bulat positif' });
      return;
    }

    if (search !== undefined && typeof search !== 'string') {
      res.status(400).json({ status: false, message: 'Search harus berupa teks' });
      return;
    }

    if (role !== undefined && !isEnumValue(role, Object.values(Role))) {
      res.status(400).json({ status: false, message: 'Role tidak valid' });
      return;
    }

    const where: Prisma.HeroWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (role) {
      where.role = role;
    }

    const totalItems = await prisma.hero.count({ where });
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    const heroes = await prisma.hero.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: 'asc' }
    });

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil data hero',
      data: heroes,
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

// 2. GET /api/heroes/:hero_id (Detail Hero + Include Skins)[cite: 6, 8]
export const getHeroById = async (req: Request, res: Response): Promise<void> => {
  try {
    const heroId = positiveInteger(req.params.hero_id);
    if (!heroId) {
      res.status(400).json({ status: false, message: 'hero_id tidak valid' });
      return;
    }

    const hero = await prisma.hero.findUnique({
      where: { id: heroId },
      include: { skins: true }
    });

    if (!hero) {
      res.status(404).json({ status: false, message: 'Hero tidak ditemukan' });
      return;
    }

    res.status(200).json({
      status: true,
      message: 'Berhasil mengambil detail hero',
      data: hero
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : 'Terjadi kesalahan pada server',
    });
  }
};

// 3. POST /api/heroes (Buat Hero Baru)[cite: 6, 8]
export const createHero = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, role, lane, releaseYear, priceBP, priceDiamond } = req.body ?? {};
    const parsedReleaseYear = positiveInteger(releaseYear);

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      !isEnumValue(role, Object.values(Role)) ||
      !isEnumValue(lane, Object.values(Lane)) ||
      !parsedReleaseYear
    ) {
      res.status(400).json({ status: false, message: 'Name, role, lane, dan releaseYear wajib diisi' });
      return;
    }

    const parsedPriceBP = optionalPrice(priceBP);
    const parsedPriceDiamond = optionalPrice(priceDiamond);
    if (parsedPriceBP === undefined || parsedPriceDiamond === undefined) {
      res.status(400).json({ status: false, message: 'Harga harus bilangan bulat positif atau kosong' });
      return;
    }

    const normalizedName = name.trim();
    const existingHero = await prisma.hero.findUnique({ where: { name: normalizedName } });
    if (existingHero) {
      res.status(409).json({ status: false, message: 'Nama hero sudah digunakan' });
      return;
    }

    const newHero = await prisma.hero.create({
      data: {
        name: normalizedName,
        role,
        lane,
        releaseYear: parsedReleaseYear,
        priceBP: parsedPriceBP,
        priceDiamond: parsedPriceDiamond
      }
    });

    res.status(201).json({
      status: true,
      message: 'Hero berhasil dibuat',
      data: newHero
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ status: false, message: 'Nama hero sudah digunakan' });
      return;
    }

    console.error(error);
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    res.status(500).json({ status: false, message });
  }
};