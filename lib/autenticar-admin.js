
const jwt = require("jsonwebtoken");

function autenticarAdmin(req, sorteioId) {
    const autorizacao = req.headers.authorization || "";

    if (!autorizacao.startsWith("Bearer ")) {
        return null;
    }

    const token = autorizacao.slice(7);

    try {
        const dados = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (
            dados.tipo !== "admin" ||
            dados.sorteioId !== sorteioId
        ) {
            return null;
        }

        return dados;

    } catch {
        return null;
    }
}

module.exports = autenticarAdmin;
