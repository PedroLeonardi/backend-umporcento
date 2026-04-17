import { User, Assinatura } from '../models/index.js';
import { Op } from 'sequelize';

export const checkSubscription = async (req, res, next) => {
    try {
        const { uid } = req.user;

        // 1. BARREIRA PARA VISITANTES (GUEST)
        if (uid === 'guest') {
            return res.status(403).json({ 
                message: "Acesso restrito. Crie uma conta gratuita para liberar 3 dias de conteúdo!", 
                code: "AUTH_REQUIRED" 
            });
        }

        // Busca o usuário no banco Neon
        const user = await User.findOne({ where: { firebaseUid: uid } });
        if (!user) {
            return res.status(404).json({ message: "Usuário não sincronizado no banco de dados." });
        }

        // 2. PASSE LIVRE PARA ADMIN (A CORREÇÃO FOI AQUI)
        if (user.role === 'admin') {
            console.log(`🛡️ [SUBSCRIPTION] Passe Livre concedido para o Admin: ${user.email}`);
            return next();
        }

        // 3. VERIFICAÇÃO DE ASSINATURA ATIVA (RevenueCat/Stripe)
        if (user.isPremium) {
            return next();
        }

        // Fallback: Verifica na tabela de assinaturas (Segurança extra)
        const assinaturaAtiva = await Assinatura.findOne({
            where: {
                userId: user.id,
                status: 'active',
                dataExpiracao: { [Op.gt]: new Date() }
            }
        });

        if (assinaturaAtiva) {
            return next();
        }

        // 4. VERIFICAÇÃO DE TRIAL (DEGUSTAÇÃO DE 3 DIAS)
        if (user.trialExpiration && new Date() < new Date(user.trialExpiration)) {
            console.log(`💡 [SUBSCRIPTION] Usuário ${user.email} acessando via Trial.`);
            return next();
        }

        // 5. BLOQUEIO FINAL
        return res.status(403).json({ 
            message: "Seu período de teste terminou. Assine um plano para continuar sua evolução!", 
            code: "SUBSCRIPTION_REQUIRED"
        });

    } catch (error) {
        console.error("Erro no Subscription Middleware:", error);
        res.status(500).json({ error: "Erro interno ao verificar permissões de acesso." });
    }
};