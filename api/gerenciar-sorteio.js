
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const autenticarAdmin = require("../lib/autenticar-admin");

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
        const { acao, sorteioId } = req.body || {};

        if (
            typeof sorteioId !== "string" ||
            !/^[a-zA-Z0-9_-]+$/.test(sorteioId)
        ) {
            return res.status(400).json({
                erro: "Sorteio inválido."
            });
        }

        const usuario = autenticarAdmin(req, sorteioId);

        if (!usuario) {
            return res.status(401).json({
                erro: "Acesso não autorizado. Faça login novamente."
            });
        }

        const sorteioRef = db.collection("sorteios").doc(sorteioId);
        const sorteio = await sorteioRef.get();

        if (!sorteio.exists) {
            return res.status(404).json({
                erro: "Sorteio não encontrado."
            });
        }

        const dados = sorteio.data();

        if (acao === "listar") {
            const participantes = await sorteioRef
                .collection("participantes")
                .get();

            return res.status(200).json({
                nome: dados.nome,
                status: dados.status,
                totalParticipantes: dados.totalParticipantes,
                participantes: participantes.docs.map(doc => ({
                    nome: doc.data().nome
                }))
            });
        }

        if (acao === "encerrar") {
            if (dados.status !== "ativo") {
                return res.status(400).json({
                    erro: "Este sorteio já está encerrado."
                });
            }

            await sorteioRef.update({
                status: "encerrado"
            });

            return res.status(200).json({
                mensagem: "Sorteio encerrado com sucesso."
            });
        }

        if (acao === "excluir") {
            await db.recursiveDelete(sorteioRef);

            return res.status(200).json({
                mensagem: "Sorteio excluído com sucesso."
            });
        }

        return res.status(400).json({
            erro: "Ação inválida."
        });

    } catch (erro) {
        console.error("Erro ao gerenciar sorteio:", erro);

        return res.status(500).json({
            erro: "Não foi possível realizar essa operação."
        });
    }
};
