
let participantes = [];

// ELEMENTOS E NAVEGAÇÃO


// ELEMENTOS E NAVEGAÇÃO

function irParaCriar() {
    document.querySelector(".principal").style.display = "none";
    document.getElementById("telaParticipar").style.display = "none";
    document.getElementById("telaAdminLogin").style.display = "none";
    document.getElementById("telaCriar").style.display = "block";
}

function irParaParticipar() {
    document.querySelector(".principal").style.display = "none";
    document.getElementById("telaCriar").style.display = "none";
    document.getElementById("telaAdminLogin").style.display = "none";
    document.getElementById("telaParticipar").style.display = "block";

    document.getElementById("formularioConsulta").style.display = "block";
    document.getElementById("resultadoParticipante").style.display = "none";
}

function irParaLoginAdmin() {
    document.querySelector(".principal").style.display = "none";
    document.getElementById("telaCriar").style.display = "none";
    document.getElementById("telaParticipar").style.display = "none";
    document.getElementById("telaAdminLogin").style.display = "block";
}

function voltarInicio() {
    document.getElementById("telaCriar").style.display = "none";
    document.getElementById("telaParticipar").style.display = "none";
    document.getElementById("telaAdminLogin").style.display = "none";
    document.querySelector(".principal").style.display = "block";

    document.getElementById("formularioConsulta").style.display = "block";
    document.getElementById("resultadoParticipante").style.display = "none";
    document.getElementById("codigoParticipante").value = "";
}

window.irParaCriar = irParaCriar;
window.irParaParticipar = irParaParticipar;
window.irParaLoginAdmin = irParaLoginAdmin;
window.voltarInicio = voltarInicio;

// ADICIONAR PARTICIPANTES

function adicionarParticipante() {
    const campo = document.getElementById("nomeParticipante");
    const nome = campo.value.trim();

    if (!nome) {
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

        const texto = document.createElement("span");
        texto.textContent = nome;

        const remover = document.createElement("button");
        remover.textContent = "🗑";
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
        const vazio = document.createElement("li");
        vazio.classList.add("vazio");
        vazio.textContent = "Nenhum participante adicionado.";
        lista.appendChild(vazio);
    }

    contador.textContent =
        `${participantes.length} participantes adicionados`;
}

window.adicionarParticipante = adicionarParticipante;

// CRIAR SORTEIO

async function prepararSorteio() {
    const nomeSorteio = document
        .getElementById("nomeSorteio").value.trim();

    const senhaAdmin = document
        .getElementById("senhaAdmin").value;

    if (!nomeSorteio) {
        alert("Digite o nome do sorteio.");
        return;
    }

    if (senhaAdmin.length < 12) {
        alert("A senha deve ter pelo menos 12 caracteres.");
        return;
    }

    if (participantes.length < 3) {
        alert("Adicione pelo menos 3 participantes.");
        return;
    }

    const botao = document.querySelector(
        "#telaCriar .criar-sorteio"
    );

    botao.disabled = true;
    botao.textContent = "Criando sorteio...";

    try {
        // 1. Cria o sorteio no backend

        const resposta = await fetch("/api/criar-sorteio", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome_sorteio: nomeSorteio,
                senha_admin: senhaAdmin,
                participantes: participantes
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível criar o sorteio."
            );
        }

        // 2. Faz login do organizador

        const respostaLogin = await fetch("/api/login-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sorteioId: resultado.sorteioId,
                senha: senhaAdmin
            })
        });

        const dadosLogin = await respostaLogin.json();

        if (!respostaLogin.ok) {
            throw new Error(
                dadosLogin.erro || "Não foi possível entrar no painel."
            );
        }

        // 3. Guarda o token da sessão

        sessionStorage.setItem(
            "tokenAdmin",
            dadosLogin.token
        );

        // 4. Mostra os códigos individuais

        mostrarCodigos(
            resultado.participantes,
            resultado.sorteioId
        );

    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro: " + erro.message);

        botao.disabled = false;
        botao.textContent = "Continuar →";
    }
}

window.prepararSorteio = prepararSorteio;

// MOSTRAR CÓDIGOS

function mostrarCodigos(codigos, sorteioId) {
    const tela = document.createElement("div");

    tela.id = "telaCodigos";

    tela.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #183B2D;
        padding: 30px 20px;
        overflow-y: auto;
        display: flex;
        justify-content: center;
        align-items: flex-start;
    `;

    const conteudo = document.createElement("div");

    conteudo.style.cssText = `
        width: 100%;
        max-width: 650px;
        margin: 30px auto;
        background: #214534;
        border: 1px solid #49634c;
        border-radius: 16px;
        padding: 28px;
        color: #fffaf0;
        font-family: Arial, sans-serif;
    `;

    const titulo = document.createElement("h2");
    titulo.textContent = "Sorteio criado! 🎄";
    titulo.style.color = "#d8bd7a";

    const descricao = document.createElement("p");
    descricao.textContent =
        "Entregue a cada participante somente o código correspondente ao seu nome.";

    descricao.style.cssText = "margin: 15px 0; line-height: 1.6;";

    const aviso = document.createElement("p");
    aviso.textContent =
        "Guarde estes códigos! Eles não poderão ser recuperados em texto pelo painel depois.";

    aviso.style.cssText = "color: #d8bd7a; margin-bottom: 20px;";

    const identificador = document.createElement("div");

    identificador.style.cssText = `
    background: #173326;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
`;

    const textoIdentificador = document.createElement("p");
    textoIdentificador.textContent = "Identificador do sorteio:";
    textoIdentificador.style.marginBottom = "10px";

    const codigoSorteio = document.createElement("strong");
    codigoSorteio.textContent = sorteioId;
    codigoSorteio.style.cssText = `
    color: #d8bd7a;
    font-size: 18px;
    letter-spacing: 1px;
    word-break: break-all;
`;

    const botaoCopiarId = document.createElement("button");
    botaoCopiarId.textContent = "Copiar identificador";

    botaoCopiarId.style.cssText = `
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 12px;
    background: transparent;
    color: #d8bd7a;
    border: 1px solid #d8bd7a;
    border-radius: 8px;
    cursor: pointer;
`;

    botaoCopiarId.onclick = async () => {
        try {
            await navigator.clipboard.writeText(sorteioId);
            botaoCopiarId.textContent = "Identificador copiado!";
        } catch {
            alert("Não foi possível copiar o identificador.");
        }
    };

    identificador.append(
        textoIdentificador,
        codigoSorteio,
        botaoCopiarId
    );


    const lista = document.createElement("div");

    codigos.forEach(pessoa => {
        const linha = document.createElement("div");

        linha.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 12px;
            margin-bottom: 10px;
            background: #173326;
            border-radius: 8px;
        `;

        const nome = document.createElement("strong");
        nome.textContent = pessoa.participante;

        const codigo = document.createElement("span");
        codigo.textContent = pessoa.codigo;

        codigo.style.cssText = `
            color: #d8bd7a;
            font-weight: bold;
            letter-spacing: 2px;
        `;

        linha.append(nome, codigo);
        lista.appendChild(linha);
    });

    const botaoCopiar = document.createElement("button");
    botaoCopiar.textContent = "Copiar todos os códigos";

    botaoCopiar.style.cssText = `
        width: 100%;
        padding: 14px;
        margin-top: 15px;
        background: #d8bd7a;
        color: #183B2D;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
    `;

    botaoCopiar.onclick = async () => {
        const texto = codigos
            .map(p => `${p.participante}: ${p.codigo}`)
            .join("\n");

        try {
            await navigator.clipboard.writeText(texto);
            botaoCopiar.textContent = "Códigos copiados!";
        } catch {
            alert(
                "Não foi possível copiar automaticamente. Anote os códigos exibidos."
            );
        }
    };

    const botaoPainel = document.createElement("button");
    botaoPainel.textContent = "Acessar painel do organizador →";

    botaoPainel.style.cssText = `
        width: 100%;
        padding: 14px;
        margin-top: 12px;
        background: transparent;
        color: #d8bd7a;
        border: 1px solid #d8bd7a;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
    `;

    botaoPainel.onclick = () => {
        window.location.href =
            `admin.html?sorteio=${encodeURIComponent(sorteioId)}`;
    };

    conteudo.append(
        titulo,
        descricao,
        aviso,
        identificador,
        lista,
        botaoCopiar,
        botaoPainel
    );

    tela.appendChild(conteudo);
    document.body.appendChild(tela);
}

// CONSULTAR RESULTADO

async function consultarResultado() {
    const campo = document.getElementById("codigoParticipante");
    const resultadoDiv = document.getElementById("resultadoParticipante");
    const formulario = document.getElementById("formularioConsulta");
    const botao = document.getElementById("botaoConsultar");

    const codigo = campo.value.trim().toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(codigo)) {
        alert("Digite um código válido de 6 caracteres.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Consultando...";

    try {
        const resposta = await fetch("/api/consultar-resultado", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ codigo })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível consultar."
            );
        }

        resultadoDiv.innerHTML = "";

        const saudacao = document.createElement("p");
        saudacao.textContent = `Olá, ${dados.participante}!`;

        const titulo = document.createElement("h3");
        titulo.textContent = "Você tirou:";

        const nome = document.createElement("strong");
        nome.textContent = dados.sorteado;

        const voltar = document.createElement("button");
        voltar.textContent = "← Voltar ao início";
        voltar.classList.add("botao-voltar-inicio");
        voltar.onclick = voltarInicio;

        resultadoDiv.append(
            saudacao,
            titulo,
            nome,
            voltar
        );

        formulario.style.display = "none";
        resultadoDiv.style.display = "block";

    } catch (erro) {
        alert(erro.message);

    } finally {
        botao.disabled = false;
        botao.textContent = "Consultar resultado →";
    }
}

window.consultarResultado = consultarResultado;


// LOGIN DO ORGANIZADOR

async function loginOrganizador() {
    const sorteioId = document
        .getElementById("sorteioIdAdmin")
        .value.trim();

    const senha = document
        .getElementById("senhaLoginAdmin")
        .value;

    const botao = document.getElementById("botaoLoginAdmin");

    if (!sorteioId || !senha) {
        alert("Preencha o identificador e a senha.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const resposta = await fetch("/api/login-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sorteioId: sorteioId,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível entrar."
            );
        }

        sessionStorage.setItem("tokenAdmin", dados.token);

        window.location.href =
            `admin.html?sorteio=${encodeURIComponent(sorteioId)}`;

    } catch (erro) {
        alert(erro.message);

    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar no painel →";
    }
}

window.loginOrganizador = loginOrganizador;
