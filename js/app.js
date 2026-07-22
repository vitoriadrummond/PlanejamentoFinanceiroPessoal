let paginaAtual = "planejamento";

function setTitulo(titulo, subtitulo) {
    document.getElementById("pageTitle").textContent = titulo;
    document.getElementById("pageSubtitle").textContent = subtitulo || "";
}

function setAcaoPrincipal(texto, funcao) {
    const botao = document.getElementById("btnAcaoPrincipal");

    botao.textContent = texto;
    botao.onclick = funcao;
}

function abrirModal(titulo, conteudo) {
    document.getElementById("modalTitulo").textContent = titulo;
    document.getElementById("modalConteudo").innerHTML = conteudo;
    document.getElementById("modal").hidden = false;
}

function fecharModal() {
    document.getElementById("modal").hidden = true;
    document.getElementById("modalConteudo").innerHTML = "";
}

async function navegar(pagina) {
    paginaAtual = pagina;

    document.querySelectorAll(".nav").forEach(botao => {
        botao.classList.toggle(
            "active",
            botao.dataset.page === pagina
        );
    });

    const app = document.getElementById("app");

    app.innerHTML = `
        <div class="panel">
            <p class="msg">Carregando...</p>
        </div>
    `;

    try {
        switch (pagina) {
            case "planejamento":
                await paginaPlanejamento();
                break;

            case "lancamentos":
                await paginaLancamentos();
                break;

            case "recorrencias":
                await paginaRecorrencias();
                break;

            case "cartoes":
                await paginaCartoes();
                break;

            case "categorias":
                await paginaCategorias();
                break;

            case "salario":
                await paginaSalario();
                break;

            default:
                await paginaPlanejamento();
                break;
        }
    } catch (erro) {
        console.error(erro);

        app.innerHTML = `
            <div class="panel">
                <p class="msg">
                    Erro: ${escapeHtml(
                        erro?.message ||
                        "Não foi possível abrir esta página."
                    )}
                </p>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll(".nav").forEach(botao => {
        botao.addEventListener("click", () => {
            navegar(botao.dataset.page);
        });
    });

    document
        .getElementById("btnFecharModal")
        .addEventListener("click", fecharModal);

    document
        .getElementById("modal")
        .addEventListener("click", evento => {
            if (evento.target.id === "modal") {
                fecharModal();
            }
        });

    const status = document.getElementById("statusConexao");

    try {
        await testarConexao();

        status.textContent = "Nuvem conectada";
        status.className = "status ok";

        await navegar("planejamento");
    } catch (erro) {
        console.error(erro);

        status.textContent = "Erro na conexão";
        status.className = "status error";

        document.getElementById("app").innerHTML = `
            <div class="panel">
                <p class="msg">
                    Erro: ${escapeHtml(erro.message)}
                </p>
            </div>
        `;
    }
});
