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
        // 🔴 SOLUÇÃO PARANOICA (TEMPO REAL) ATIVADA
        // O servidor verificará com o Google a CADA requisição se a senha não 
        // foi alterada ou a conta revogada.
        // =========================================================================
        const decodedToken = await admin.auth().verifyIdToken(token, true); // 👈 O 'true' faz a mágica
        
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
        // 👇 Agora, se a conta for banida ou senha trocada, ele cai especificamente aqui:
        if (error.code === 'auth/id-token-revoked') {
            console.log("🚫 [BACKEND] Token revogado por alteração de senha ou bloqueio.");
            return res.status(401).json({ message: "Sessão expirada ou revogada. Faça login novamente." });
        }
        
        return res.status(403).json({ message: "Sessão inválida ou expirada." });
    }
};