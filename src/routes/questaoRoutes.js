import { Router } from 'express';
import multer from 'multer';
import QuestaoController from '../controllers/questaoController.js';

const router = Router();

// Configura o multer para manter o arquivo na memória temporariamente antes de enviar ao Supabase
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define os campos que a rota aceita
const uploadFields = upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]);

// ROTA POST: Criar questão
// O multer processa os arquivos e o Controller salva tudo
router.post('/', uploadFields, QuestaoController.createQuestao);

// ROTA GET: Buscar por ID
router.get('/:id', QuestaoController.getQuestaoById);

export default router;