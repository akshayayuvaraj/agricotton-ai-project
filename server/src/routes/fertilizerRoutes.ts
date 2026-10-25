import { Router } from 'express';
import { createFertilizerPlan, deleteFertilizerPlan, listFertilizerPlans } from '../controllers/fertilizerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listFertilizerPlans);
router.post('/', createFertilizerPlan);
router.delete('/:id', deleteFertilizerPlan);

export default router;
