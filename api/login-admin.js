
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const limitarTentativas = require("../lib/rate-limit");

// Inicialização do Firebase
if (getApps().length === 0) {
    const credencial = JSON.parse(
        Buffer.from(
            process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
            "base64"
        ).toString("utf8")
    );

    initializeApp({
        credential: cert(credencial)
    });
}

const db = getFirestore();

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({
            erro: "Método não permitido."
        });
    }

    try {
        const limite = await limitarTentativas(
            db,
            req,
            "login-admin",
            5,
            15 * 60 * 1000
        );

        if (!limite.permitido) {
            res.setHeader("Retry-After", limite.aguardar);

            return res.status(429).json({
                erro: "Muitas tentativas de login. Aguarde alguns minutos."
            });
        }

        const { sorteioId, senha } = req.body || {};

        if (
            typeof sorteioId !== "string" ||
            typeof senha !== "string" ||
            !senha ||
            sorteioId.length > 150
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
