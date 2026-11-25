
const crypto = require("crypto");

async function limitarTentativas(
    db,
    req,
    identificador,
    limite,
    janelaMs
) {
    // IP fornecido pela infraestrutura da Vercel
    const ip = req.headers["x-real-ip"] || "desconhecido";

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET não configurado.");
    }

    // Não armazenamos o IP diretamente no Firestore.
    const identificadorSeguro = crypto
        .createHmac("sha256", process.env.JWT_SECRET)
        .update(`${identificador}:${ip}`)
        .digest("hex");

    const referencia = db
        .collection("rateLimits")
        .doc(identificadorSeguro);

    const agora = Date.now();

    return db.runTransaction(async (transacao) => {
        const documento = await transacao.get(referencia);

        if (!documento.exists || documento.data().resetAt <= agora) {
            transacao.set(referencia, {
                count: 1,
                resetAt: agora + janelaMs
            });

            return {
                permitido: true,
                tentativasRestantes: limite - 1
            };
        }

        const dados = documento.data();

        if (dados.count >= limite) {
            return {
                permitido: false,
                aguardar: Math.ceil(
                    (dados.resetAt - agora) / 1000
                )
            };
        }

        transacao.update(referencia, {
            count: dados.count + 1
        });

        return {
            permitido: true,
            tentativasRestantes: limite - dados.count - 1
        };
    });
}

module.exports = limitarTentativas;
