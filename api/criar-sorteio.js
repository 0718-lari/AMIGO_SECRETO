
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Inicialização do Firebase
if (getApps().length === 0) {
    const credencial = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT
    );

    initializeApp({
        credential: cert(credencial)
    });
}

const db = getFirestore();

// Gera código individual de 12 caracteres
function gerarCodigo() {
    return crypto.randomBytes(6).toString("hex").toUpperCase();
}

// Embaralha os participantes
function embaralhar(lista) {
    const resultado = [...lista];

    for (let i = resultado.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
    }

    return resultado;
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({
            erro: "Método não permitido."
        });
    }

    try {
        const {
            nome_sorteio,
            senha_admin,
            participantes
        } = req.body || {};

        if (
            typeof nome_sorteio !== "string" ||
            !nome_sorteio.trim()
        ) {
            return res.status(400).json({
                erro: "Informe o nome do sorteio."
            });
        }

        if (
            typeof senha_admin !== "string" ||
            senha_admin.length < 8
        ) {
            return res.status(400).json({
                erro: "A senha deve ter pelo menos 8 caracteres."
            });
        }

        if (
            !Array.isArray(participantes) ||
            participantes.length < 3 ||
            participantes.length > 100
        ) {
            return res.status(400).json({
                erro: "Adicione entre 3 e 100 participantes."
            });
        }

        const nomes = participantes.map(nome =>
            typeof nome === "string" ? nome.trim() : ""
        );

        if (nomes.some(nome => !nome || nome.length > 100)) {
            return res.status(400).json({
                erro: "Verifique os nomes dos participantes."
            });
        }

        const nomesUnicos = nomes.map(nome =>
            nome.toLowerCase()
        );

        if (new Set(nomesUnicos).size !== nomes.length) {
            return res.status(400).json({
                erro: "Existem participantes repetidos."
            });
        }

        // Cria uma distribuição sem auto-sorteio
        const embaralhados = embaralhar(nomes);

        const deslocamento = crypto.randomInt(
            1,
            embaralhados.length
        );

        const sorteados = embaralhados.map((_, indice) =>
            embaralhados[
                (indice + deslocamento) % embaralhados.length
            ]
        );

        // Protege a senha do organizador
        const senhaHash = await bcrypt.hash(senha_admin, 12);

        // Cria o sorteio no Firestore
        const sorteioRef = db.collection("sorteios").doc();

        const lote = db.batch();

        lote.set(sorteioRef, {
            nome: nome_sorteio.trim(),
            senhaAdminHash: senhaHash,
            totalParticipantes: nomes.length,
            status: "ativo",
            criadoEm: FieldValue.serverTimestamp()
        });

        const codigosParaOrganizador = [];

        for (let i = 0; i < nomes.length; i++) {
            const codigo = gerarCodigo();

            const codigoHash = crypto
                .createHash("sha256")
                .update(codigo)
                .digest("hex");

            const participanteRef = sorteioRef
                .collection("participantes")
                .doc();

            lote.set(participanteRef, {
                nome: embaralhados[i],
                codigoHash,
                sorteadoNome: sorteados[i]
            });

            codigosParaOrganizador.push({
                participante: embaralhados[i],
                codigo
            });
        }

        await lote.commit();

        return res.status(201).json({
            mensagem: "Sorteio criado com sucesso!",
            sorteioId: sorteioRef.id,
            nomeSorteio: nome_sorteio.trim(),
            participantes: codigosParaOrganizador
        });

    } catch (erro) {
        console.error("Erro ao criar sorteio:", erro);

        return res.status(500).json({
            erro: "Não foi possível criar o sorteio."
        });
    }
};
