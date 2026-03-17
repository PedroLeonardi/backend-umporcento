export const checkMasterKey = (req, res, next) => {
    // Pegamos o header (o Express sempre deixa em minúsculo no objeto headers)
    const authHeader = req.headers['authorization']; 
    
    if (!authHeader) {
        return res.status(401).json({ message: "Header de autorização não fornecido." });
    }

    // Dividimos o "Bearer" do "Token"
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ message: "Erro no formato do Token (Use: Bearer CHAVE)." });
    }

    const [scheme, token] = parts;

    // Verificamos se é Bearer (ignora maiúsculas/minúsculas no nome Bearer)
    // E comparamos o token EXATAMENTE com o .env
    if (!/^Bearer$/i.test(scheme) || token !== process.env.ADMIN_MASTER_KEY) {
        return res.status(401).json({ message: "Chave mestre inválida." });
    }

    next();
};