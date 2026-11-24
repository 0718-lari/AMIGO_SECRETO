
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

if (!admin.apps.length) {
    const credencial = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );

    admin.initializeApp({
        credential: admin.credential.cert(credencial)
    });
}

const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({
            erro: "Método não permitido."
        });
    }

    try {
        const { sorteioId, senha } = req.body || {};

        if (
            typeof sorteioId !== "string" ||
            typeof senha !== "string" ||
            !senha
        ) {
            return res.status(400).json({
                erro: "Informe o sorteio e a senha."
            });
        }

        const sorteioRef = db.collection("sorteios").doc(sorteioId);
        const sorteio = await sorteioRef.get();

        if (!sorteio.exists) {
            return res.status(401).json({
                erro: "Sorteio ou senha inválidos."
            });
        }

        const dados = sorteio.data();

        const senhaCorreta = await bcrypt.compare(
            senha,
            dados.senhaAdminHash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: "Sorteio ou senha inválidos."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET não configurado.");
        }

        const token = jwt.sign(
            {
                sorteioId: sorteioRef.id,
                tipo: "admin"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h",
                jwtid: crypto.randomUUID()
            }
        );

        return res.status(200).json({
            mensagem: "Login realizado!",
            token,
            nomeSorteio: dados.nome
        });

    } catch (erro) {
        console.error("Erro no login:", erro);

        return res.status(500).json({
            erro: "Não foi possível realizar o login."
        });
    }
};
