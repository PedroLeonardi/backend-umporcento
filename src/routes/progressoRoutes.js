import { Router } from 'express';
import ProgressoController from '../controllers/progressoController.js';
import { checkAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// ==================================================================
// 🚨 ATENÇÃO: Rotas ESPECÍFICAS devem vir SEMPRE EM PRIMEIRO LUGAR
// ==================================================================

// 1. Salvar progresso
router.post('/atualizar', checkAuth, ProgressoController.atualizar);

// 2. Biblioteca (Esta rota PRECISA vir antes de /:capituloId)
router.get('/biblioteca', checkAuth, ProgressoController.getBiblioteca);


// 3. Resumo da Mentoria
router.get('/resumo/:mentoriaId', checkAuth, ProgressoController.getResumoMentoria);

// ==================================================================
// 🚨 Rotas GENÉRICAS (com parâmetros :id) ficam POR ÚLTIMO
// ==================================================================
router.post('/leitura', checkAuth, ProgressoController.atualizarLeitura);
// 4. Buscar progresso de um capítulo específico
// Se esta rota estivesse lá em cima, ela "engoliria" a palavra "biblioteca"
router.get('/:capituloId', checkAuth, ProgressoController.buscarPorCapitulo);

export default router;