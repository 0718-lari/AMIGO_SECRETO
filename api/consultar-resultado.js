
const admin = require("firebase-admin");
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
        const { codigo } = req.body || {};

        if (
            typeof codigo !== "string" ||
            !/^[a-fA-F0-9]{8}$/.test(codigo)
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
