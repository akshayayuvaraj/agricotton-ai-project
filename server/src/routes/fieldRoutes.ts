import { Router } from 'express';
import { createField, deleteField, listFields, updateField } from '../controllers/fieldController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', listFields);
router.post('/', createField);
router.patch('/:id', updateField);
router.delete('/:id', deleteField);

export default router;
