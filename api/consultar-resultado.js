
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
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
        // Limita consultas por IP: 10 tentativas a cada 15 minutos.
        const limite = await limitarTentativas(
            db,
            req,
            "consulta-resultado",
            10,
            15 * 60 * 1000
        );

        if (!limite.permitido) {
            res.setHeader("Retry-After", limite.aguardar);

            return res.status(429).json({
                erro: "Muitas tentativas. Aguarde alguns minutos."
            });
        }

        const { codigo } = req.body || {};

        if (
            typeof codigo !== "string" ||
            !/^[A-HJ-NP-Z2-9]{6}$/.test(codigo)
        ) {
            return res.status(400).json({
                erro: "Código inválido."
            });
        }

        const codigoHash = crypto
            .createHash("sha256")
            .update(codigo.toUpperCase())
            .digest("hex");

        const resultado = await db
            .collectionGroup("participantes")
            .where("codigoHash", "==", codigoHash)
            .limit(1)
            .get();

        if (resultado.empty) {
            return res.status(404).json({
                erro: "Código não encontrado."
            });
        }

        const participante = resultado.docs[0];
        const sorteioRef = participante.ref.parent.parent;

        const sorteio = await sorteioRef.get();

        if (!sorteio.exists || sorteio.data().status !== "ativo") {
            return res.status(404).json({
                erro: "Este sorteio não está disponível."
            });
        }

        return res.status(200).json({
            participante: participante.data().nome,
            sorteado: participante.data().sorteadoNome
        });

    } catch (erro) {
        console.error("Erro ao consultar resultado:", erro);

        return res.status(500).json({
            erro: "Não foi possível consultar o resultado."
        });
    }
};
