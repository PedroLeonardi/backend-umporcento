import { Router } from 'express';
import RecomendacaoController from '../controllers/recomendacaoController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// Rota silenciosa para registrar view (quando abre a tela de detalhes)
router.post('/view/:mentoriaId', checkAuth, RecomendacaoController.registrarView);

// Rotas das prateleiras da Home
router.get('/por-play', checkAuth, RecomendacaoController.recomendacoesPorPlay);
router.get('/por-view', checkAuth, RecomendacaoController.recomendacoesPorView);

export default router;