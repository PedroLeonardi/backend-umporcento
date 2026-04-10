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
            role: 'admin', // Injetamos o papel para facilitar
            email_verified: true
        };
        return next();
    }

    // 2. MODO VISITANTE (GUEST)
    // Se não houver header ou não começar com Bearer, definimos como guest em vez de dar erro 401
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = { 
            uid: 'guest', 
            role: 'guest', 
            isPremium: false,
            email_verified: false 
        };
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        // SOLUÇÃO EM TEMPO REAL: Verifica revogação de token
        const decodedToken = await admin.auth().verifyIdToken(token, true);
        
        // Trava de E-mail Verificado (apenas para quem usa senha)
        if (decodedToken.email_verified === false && decodedToken.firebase?.sign_in_provider === 'password') {
            return res.status(403).json({ 
                message: "Acesso bloqueado: O e-mail ainda não foi verificado.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        // Usuário autenticado com sucesso
        req.user = decodedToken;
        next();
    } catch (error) {
        // Se o token existir mas for inválido/expirado, aqui tratamos como erro mesmo
        // para forçar o front-end a deslogar o usuário ou renovar o token.
        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ message: "Sessão revogada. Faça login novamente." });
        }
        
        // Em caso de token expirado ou malformado, retornamos 403
        return res.status(403).json({ message: "Sessão inválida ou expirada.", code: "INVALID_TOKEN" });
    }
};