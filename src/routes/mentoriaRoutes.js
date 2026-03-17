import { Router } from 'express';
import multer from 'multer';
import MentoriaController from '../controllers/mentoriaController.js';
import { checkSubscription } from '../middlewares/subscriptionMiddleware.js';
import { isAdmin } from '../middlewares/adminMiddleware.js';
import { checkAuth } from '../middlewares/authMiddleware.js';
import { checkMasterKey } from '../middlewares/masterKeyMiddleware.js';


const router = Router();
const upload = multer({ storage: multer.memoryStorage() });


router.put('/capitulos/:id', checkAuth, isAdmin, MentoriaController.updateCapituloText);
router.get('/search', MentoriaController.search); //open rota

router.get('/:mentoriaId/capitulos', MentoriaController.getCapitulosByMentoria); //Rota fechada Get mentorias paginada

router.put('/:id', upload.fields([{ name: 'foto' }]), MentoriaController.update); // Rota para atualizar a mentoria

router.post('/', upload.fields([{ name: 'foto' }]), MentoriaController.create); // rota fechada utilizar "checkAuth, isAdmin"
router.get('/', MentoriaController.getAll); // rota open
router.get('/categorias/todas', MentoriaController.getExistingCategories);
router.get('/mentoriaBase/:id', MentoriaController.getById); //rota fechada utilizar "checkSubscription"
router.post('/:mentoriaId/capitulos', upload.fields([{ name: 'foto' }, { name: 'audio' }]), MentoriaController.addCapitulo);//rota fechada utilizar " checkAuth, isAdmin"

// Altere a rota de categorias para usar o controller
router.get('/categorias', MentoriaController.listAllCategories);

router.delete('/full-delete/:id', checkMasterKey, MentoriaController.deleteFull);

router.delete('/capitulos/:id', checkAuth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await Capitulo.destroy({ where: { id } });
        res.status(200).json({ message: "Capítulo removido com sucesso." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;