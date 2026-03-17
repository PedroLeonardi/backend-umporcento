// src/middlewares/adminMiddleware.js
import User from '../models/user.js';

export const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { firebaseUid: req.user.uid } });

        if (user && user.role === 'admin') {
            return next();
        }

        return res.status(403).json({ message: "Acesso negado: Requer cargo de Administrador." });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao verificar cargo." });
    }
};