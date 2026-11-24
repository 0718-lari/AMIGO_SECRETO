import { db } from "./firebase.js";

let participantes = [];

function irParaCriar() {
    document.querySelector(".principal").style.display = "none";
    document.getElementById("telaCriar").style.display = "block";
}

function voltarInicio() {
    document.getElementById("telaCriar").style.display = "none";
    document.querySelector(".principal").style.display = "block";
}

function adicionarParticipante() {
    const campo = document.getElementById("nomeParticipante");
    const nome = campo.value.trim();

    if (nome === "") {
        alert("Digite o nome do participante.");
        return;
    }

    const existe = participantes.some(
        pessoa => pessoa.toLowerCase() === nome.toLowerCase()
    );

    if (existe) {
        alert("Esse participante já foi adicionado.");
        return;
    }

    participantes.push(nome);
    campo.value = "";

    atualizarLista();
}

function atualizarLista() {
    const lista = document.getElementById("listaParticipantes");
    const contador = document.getElementById("contador");

    lista.innerHTML = "";

    participantes.forEach((nome, indice) => {
        const item = document.createElement("li");

        item.style.display = "flex";
        item.style.alignItems = "center";

        const texto = document.createElement("span");
        texto.textContent = nome;

        const remover = document.createElement("button");
        remover.innerHTML = "🗑";
        remover.classList.add("botao-remover");
        remover.title = "Remover participante";

        remover.onclick = () => {
            participantes.splice(indice, 1);
            atualizarLista();
        };

        item.appendChild(texto);
        item.appendChild(remover);
        lista.appendChild(item);
    });

    if (participantes.length === 0) {
        lista.innerHTML =
            '<li class="vazio">Nenhum participante adicionado.</li>';
    }

    contador.textContent =
        `${participantes.length} participantes adicionados`;
}

async function prepararSorteio() {
    const nomeSorteio = document
        .getElementById("nomeSorteio").value.trim();

    const senhaAdmin = document
        .getElementById("senhaAdmin").value;

    if (nomeSorteio === "") {
        alert("Digite o nome do sorteio.");
        return;
    }

    if (senhaAdmin === "") {
        alert("Digite a senha do organizador.");
        return;
    }

    if (participantes.length < 3) {
        alert("Adicione pelo menos 3 participantes.");
        return;
    }

    const botao = document.querySelector(".criar-sorteio");

    botao.disabled = true;
    botao.textContent = "Criando sorteio...";

    try {
        const resposta = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                acao: "criar",
                senha_admin: senhaAdmin,
                nome_sorteio: nomeSorteio,
                participantes: participantes
            })
        });

        const textoResposta = await resposta.text();

        console.log("Status:", resposta.status);
        console.log("URL:", resposta.url);
        console.log("Resposta:", textoResposta);
        
        let resultado = {};

        try {
            resultado = textoResposta ? JSON.parse(textoResposta) : {};
        } catch {
            throw new Error(
                `Resposta inválida do servidor. HTTP ${resposta.status}. Conteúdo: ${textoResposta || "Vazio"}`
            );
        }

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                resultado.mensagem ||
                `Erro HTTP ${resposta.status}`
            );
        }
        console.log("Resultado do cadastro:", resultado);

        alert("Sorteio criado com sucesso! 🎄");

    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro ao criar sorteio: " + erro.message);

    } finally {
        botao.disabled = false;
        botao.textContent = "Continuar →";
    }
}
