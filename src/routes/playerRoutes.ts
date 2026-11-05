import { Router } from 'express';
import {
  buyHero,
  createPlayer,
  deletePlayer,
  getPlayerById,
  playMatch,
  topUpDiamond,
  updatePlayer,
} from '../controllers/playerController.js';

const router = Router();

// Fitur 4: Player CRUD
router.post('/', createPlayer);
router.get('/:player_id', getPlayerById);
router.patch('/:player_id', updatePlayer);
router.delete('/:player_id', deletePlayer);

// Fitur 5: Top Up & Match
router.post('/:player_id/topup', topUpDiamond);
router.post('/:player_id/matches', playMatch);
router.post('/:player_id/heroes', buyHero);

export default router;
