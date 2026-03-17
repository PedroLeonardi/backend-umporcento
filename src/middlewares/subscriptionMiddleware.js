import { Assinatura } from '../models/index.js';
import { Op } from 'sequelize';

export const checkSubscription = async (req, res, next) => {
    try {
        // req.user.uid vem do checkAuth (Firebase)
        const user = await User.findOne({ where: { firebaseUid: req.user.uid } });

        const assinaturaAtiva = await Assinatura.findOne({
            where: {
                userId: user.id,
                status: 'active',
                dataExpiracao: { [Op.gt]: new Date() } // Data de expiração maior que agora
            }
        });

        if (!assinaturaAtiva && process.env.NODE_ENV === 'production') {
            return res.status(403).json({ 
                message: "Acesso negado. Assinatura inativa ou expirada.",
                code: "SUBSCRIPTION_REQUIRED"
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: "Erro ao verificar assinatura." });
    }
};