import { Router } from 'express';
import { createFarm, deleteFarm, listFarms, updateFarm } from '../controllers/farmController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listFarms);
router.post('/', createFarm);
router.patch('/:id', updateFarm);
router.delete('/:id', deleteFarm);

export default router;
