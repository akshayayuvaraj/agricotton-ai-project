import { Router } from 'express';
import { createSoilSample, deleteSoilSample, listSoilSamples } from '../controllers/soilController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listSoilSamples);
router.post('/', createSoilSample);
router.delete('/:id', deleteSoilSample);

export default router;
