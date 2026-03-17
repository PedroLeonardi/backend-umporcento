import { Router } from 'express';
import * as TesteController from '../controllers/testeController.js';

const router = Router();

router.get('/', TesteController.health);
router.get('/teste', TesteController.getTest);
router.post('/teste2', TesteController.postTest);

export default router;