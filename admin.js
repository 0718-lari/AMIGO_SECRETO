
const parametros = new URLSearchParams(window.location.search);
const sorteioId = parametros.get("sorteio");

const token = sessionStorage.getItem("tokenAdmin");

const lista = document.getElementById("listaParticipantes");
const nomeSorteio = document.getElementById("nomeSorteio");
const totalParticipantes = document.getElementById("totalParticipantes");
const contadorParticipantes = document.getElementById("contadorParticipantes");
const statusSorteio = document.getElementById("statusSorteio");

// Verifica se o organizador está autenticado
if (!sorteioId || !token) {
    alert("Faça login para acessar o painel do organizador.");
    window.location.href = "index.html";
}

// Comunicação com o backend
async function gerenciarSorteio(acao) {
    const resposta = await fetch("/api/gerenciar-sorteio", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            acao,
            sorteioId
        })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(resultado.erro || "Ocorreu um erro.");
    }

    return resultado;
}

// Carrega as informações do sorteio
async function carregarPainel() {
    try {
        const dados = await gerenciarSorteio("listar");

        nomeSorteio.textContent = dados.nome;

        totalParticipantes.textContent = dados.totalParticipantes;

        contadorParticipantes.textContent =
            `${dados.totalParticipantes} pessoas`;

        statusSorteio.textContent =
            dados.status === "ativo" ? "Ativo" : "Encerrado";

        lista.innerHTML = "";

        if (dados.participantes.length === 0) {
            lista.innerHTML = `
                <li class="vazio">
                    Nenhum participante encontrado.
                </li>
            `;
            return;
        }

        dados.participantes.forEach(participante => {
            const item = document.createElement("li");

            const nome = document.createElement("span");
            nome.textContent = participante.nome;

            item.appendChild(nome);
            lista.appendChild(item);
        });

        if (dados.status !== "ativo") {
            document.querySelector(".botao-encerrar").disabled = true;
            document.querySelector(".botao-encerrar").textContent =
                "Sorteio encerrado";
        }

    } catch (erro) {
        console.error(erro);
        alert(erro.message);

        if (erro.message.includes("autorizado")) {
            sairAdmin();
        }
    }
}

// Encerra o sorteio
async function encerrarSorteio() {
    const confirmar = confirm(
        "Tem certeza de que deseja encerrar este sorteio?"
    );

    if (!confirmar) return;

    try {
        await gerenciarSorteio("encerrar");

        alert("Sorteio encerrado com sucesso! 🎄");

        await carregarPainel();

    } catch (erro) {
        alert(erro.message);
    }
}

// Exclui o sorteio
async function excluirSorteio() {
    const confirmar = confirm(
        "ATENÇÃO!\n\nDeseja realmente excluir este sorteio e todos os seus participantes?"
    );

    if (!confirmar) return;

    try {
        await gerenciarSorteio("excluir");

        alert("Sorteio excluído com sucesso!");

        sairAdmin();

    } catch (erro) {
        alert(erro.message);
    }
}

// Sai do painel
function sairAdmin() {
    sessionStorage.removeItem("tokenAdmin");

    window.location.href = "index.html";
}

// Inicia o painel
if (sorteioId && token) {
    carregarPainel();
}
