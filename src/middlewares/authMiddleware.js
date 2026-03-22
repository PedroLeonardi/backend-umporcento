import admin from 'firebase-admin';

// Inicializa usando variáveis de ambiente
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

export const checkAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // 1. ATALHO PARA DESENVOLVIMENTO (LEITOR UNIVERSAL)
    if (process.env.NODE_ENV === 'development' && authHeader === 'Bearer dev-vito') {
        req.user = {
            uid: "UztdlhJvjlN4Ey3UYh25k4zajj52", 
            email: "teste@email.com",
            name: "Usuário do Sistema",
            email_verified: true
        };
        return next();
    }

    // 2. VALIDAÇÃO REAL DO FIREBASE
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    }

    const token = authHeader.split(' ')[1];

    try {
        // =========================================================================
        // 🟢 SOLUÇÃO BRANDA (PADRÃO - ULTRA RÁPIDA)
        // O Firebase confia no token atual. Se a senha for alterada, o usuário será
        // deslogado dos outros aparelhos em até 1 hora (quando o token vencer).
        // =========================================================================
        const decodedToken = await admin.auth().verifyIdToken(token);

        // =========================================================================
        // 🔴 SOLUÇÃO PARANOICA (TEMPO REAL - MAIS LENTA)
        // Para ativar, comente a linha acima e descomente a linha abaixo.
        // O servidor verificará com o Google a CADA clique se a senha não foi alterada.
        // =========================================================================
        // const decodedToken = await admin.auth().verifyIdToken(token, true);
        
        // Trava de E-mail Verificado
        if (decodedToken.email_verified === false && decodedToken.firebase?.sign_in_provider === 'password') {
            return res.status(403).json({ 
                message: "Acesso bloqueado: O e-mail ainda não foi verificado.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        // Se a solução "paranoica" estiver ativada e a senha tiver mudado, ele cai aqui:
        if (error.code === 'auth/id-token-revoked') {
            console.log("🚫 [BACKEND] Token revogado por alteração de senha.");
            return res.status(401).json({ message: "Sessão expirada. Faça login novamente." });
        }
        
        return res.status(403).json({ message: "Sessão inválida ou expirada." });
    }
};