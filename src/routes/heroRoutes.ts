import { Router } from 'express';
import { getAllHeroes, getHeroById, createHero } from '../controllers/heroController.js';

const router = Router();

router.get('/', getAllHeroes);
router.get('/:hero_id', getHeroById);
router.post('/', createHero);

export default router;