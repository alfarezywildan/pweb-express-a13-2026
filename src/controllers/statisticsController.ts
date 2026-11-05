import { prisma } from '../lib/prisma.js';
import { Request, Response, NextFunction } from 'express';
// TODO: Sesuaikan baris import prisma ini dengan struktur temenmu
// Contoh: import prisma from '../lib/prisma';

export const getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Total Players
    const totalPlayers = await prisma.player.count();

    // 2. Total Heroes Owned
    const totalHeroesOwned = await prisma.playerHero.count();

    // 3. Total Diamond
    const diamondSum = await prisma.player.aggregate({
      _sum: { diamond: true }
    });
    const totalDiamond = diamondSum._sum.diamond || 0;

    // 4. Most Owned Hero
    const mostOwnedHeroGroup = await prisma.playerHero.groupBy({
      by: ['heroId'],
      _count: { heroId: true },
      orderBy: { _count: { heroId: 'desc' } },
      take: 1
    });

    let mostOwnedHero = null;
    if (mostOwnedHeroGroup.length > 0) {
      const bestHeroId = mostOwnedHeroGroup[0].heroId;
      const ownersCount = mostOwnedHeroGroup[0]._count.heroId;
      
      const heroData = await prisma.hero.findUnique({
        where: { id: bestHeroId },
        select: { id: true, name: true, role: true } 
      });

      if (heroData) {
        mostOwnedHero = {
          ...heroData,
          totalOwners: ownersCount
        };
      }
    }

    // 5. Heroes Per Role
    const heroesPerRoleGroup = await prisma.hero.groupBy({
      by: ['role'],
      _count: { _all: true }
    });

    const heroesPerRole = heroesPerRoleGroup.map(item => ({
      role: item.role,
      count: item._count._all
    }));

    // Response 200 OK
    res.status(200).json({
      status: true,
      message: "Berhasil mendapatkan statistik",
      data: {
        totalPlayers,
        totalHeroesOwned,
        totalDiamond,
        mostOwnedHero,
        heroesPerRole
      }
    });
  } catch (error) {
    next(error);
  }
};