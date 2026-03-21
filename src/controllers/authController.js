import User from '../models/user.js';
import { put } from '@vercel/blob';

const sanitize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

export default class AuthController {
    static async syncUser(req, res) {
    try {
        const { uid, email, name, picture, firebase } = req.user;
        const providerId = firebase.sign_in_provider; 
        
        // Verifica se a Master Key foi enviada no Header de uma requisição específica
        const adminKey = req.headers['x-admin-key']; 
        const isMaster = adminKey === process.env.ADMIN_MASTER_KEY;

        const [user, created] = await User.findOrCreate({
            where: { firebaseUid: uid },
            defaults: {
                nome: name || "Usuário do Sistema",
                email: email,
                foto: picture || null,
                provedor: providerId,
                role: isMaster ? 'admin' : 'user' // Define como admin se a chave bater
            }
        });

        // Se o usuário já existia mas você enviou a chave agora, ele vira admin
        if (!created && isMaster && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        return res.status(200).json({
            message: isMaster ? "Acesso administrativo sincronizado" : "Usuário sincronizado",
            user
        });
    } catch (error) {
        console.error("Erro na sincronia:", error);
        return res.status(500).json({ error: "Erro interno" });
    }
}
static async updateProfile(req, res) {
        try {
            const { uid } = req.user; // Funciona com Firebase ou com o seu bypass dev-vito
            const { nome } = req.body;
            const file = req.file; // Arquivo capturado pelo multer

            const user = await User.findOne({ where: { firebaseUid: uid } });

            if (!user) {
                return res.status(404).json({ message: "Usuário não encontrado." });
            }

            // Atualiza o nome se foi enviado
            if (nome) user.nome = nome;

            // Faz o upload da nova foto de perfil se o arquivo foi enviado
            if (file) {
                const path = `usuarios/perfil/${Date.now()}_${sanitize(file.originalname)}`;
                const blobOptions = { access: 'public', addRandomSuffix: false };
                
                const blob = await put(path, file.buffer, { 
                    ...blobOptions, 
                    contentType: file.mimetype 
                });
                
                user.foto = blob.url; // Salva a URL gerada pelo Vercel Blob
            }

            await user.save();

            return res.status(200).json({
                message: "Perfil atualizado com sucesso",
                user
            });

        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            return res.status(500).json({ error: "Erro interno ao atualizar perfil" });
        }
    }
    static async sendPasswordReset(req, res) {
        try {
            const { email } = req.user; // Pega o e-mail do token autenticado
            
            // O Firebase Admin gera um link, mas o jeito mais seguro para o usuário 
            // é usar o método do Client SDK (Mobile). 
            // Mas via Admin, podemos gerar o link:
            const link = await admin.auth().generatePasswordResetLink(email);
            
            // Aqui você poderia enviar um e-mail via SendGrid/Nodemailer
            // Por simplicidade e segurança, retornamos sucesso para o Mobile disparar o método nativo.
            return res.status(200).json({ message: "Link de redefinição gerado", link });
        } catch (error) {
            return res.status(500).json({ error: "Erro ao solicitar redefinição" });
        }
    }


}