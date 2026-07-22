let estado = {
    meses: [],
    categorias: [],
    cartoes: [],
    lancamentos: [],
    recorrencias: [],
    itensPlanejamento: [],
    reservaInicial: 0,
    salarios: {},
    valorHoraTrabalho: 110
};
function mesesAteDezembro2032() {
    const inicio = new Date();
    inicio.setDate(1);

    const fim = new Date(2032, 11, 1);
    const meses = [];
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

    while (cursor <= fim) {
        meses.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return meses;
}


function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function montarDataRecorrencia(competencia, diaVencimento) {
    const [ano, mes] = competencia.split("-").map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const diaValido = Math.min(
        Math.max(Number(diaVencimento || 1), 1),
        ultimoDia
    );

    return `${ano}-${String(mes).padStart(2, "0")}-${String(diaValido).padStart(2, "0")}`;
}

function recorrenciaValidaNoMes(recorrencia, competencia) {
    if (recorrencia.ativo === false) return false;

    const inicio = chaveMes(recorrencia.competencia_inicial);
    const fim = recorrencia.competencia_final
        ? chaveMes(recorrencia.competencia_final)
        : null;

    if (competencia < inicio) return false;
    if (fim && competencia > fim) return false;

    return true;
}

function gerarItensDoPlanejamento() {
    const itens = [...estado.lancamentos];
    const ocorrenciasExistentes = new Set();

    estado.lancamentos
        .filter(item => item.recorrencia_id)
        .forEach(item => {
            ocorrenciasExistentes.add(
                `${item.recorrencia_id}|${chaveMes(item.competencia)}`
            );
        });

    estado.recorrencias.forEach(recorrencia => {
        estado.meses.forEach(competencia => {
            if (!recorrenciaValidaNoMes(recorrencia, competencia)) return;

            const chave = `${recorrencia.id}|${competencia}`;
            if (ocorrenciasExistentes.has(chave)) return;

            itens.push({
                id: `recorrencia-${recorrencia.id}-${competencia}`,
                virtual: true,
                recorrencia_id: recorrencia.id,
                natureza: recorrencia.natureza,
                tipo: recorrencia.tipo,
                categoria_id: recorrencia.categoria_id,
                cartao_id: recorrencia.cartao_id,
                categorias: recorrencia.categorias,
                cartoes: recorrencia.cartoes,
                descricao: recorrencia.descricao,
                competencia: `${competencia}-01`,
                vencimento: montarDataRecorrencia(
                    competencia,
                    recorrencia.dia_vencimento
                ),
                valor_previsto: Number(recorrencia.valor || 0),
                valor_realizado: null,
                status: "pendente",
                data_realizacao: null,
                parcela_atual: null,
                total_parcelas: null,
                observacao: "Gerado por recorrência"
            });
        });
    });

    estado.itensPlanejamento = itens;
}

function ehReservaFinanceira(item) {
    return item.categorias?.is_reserva === true;
}

function filtrosPlanejamento() {
    return {
        busca: document.getElementById("filtroBusca")?.value.trim().toLowerCase() || "",
        categoria: document.getElementById("filtroCategoria")?.value || "",
        cartao: document.getElementById("filtroCartao")?.value || "",
        natureza: document.getElementById("filtroNatureza")?.value || "",
        tipo: document.getElementById("filtroTipo")?.value || "",
        status: document.getElementById("filtroStatus")?.value || ""
    };
}

function aplicarFiltrosPlanejamento(lista) {
    const filtros = filtrosPlanejamento();

    return lista.filter(item => {
        const statusCalculado = normalizarStatus(item);

        return (
            (!filtros.busca || String(item.descricao || "").toLowerCase().includes(filtros.busca)) &&
            (!filtros.categoria || String(item.categoria_id || "") === filtros.categoria) &&
            (!filtros.cartao || String(item.cartao_id || "") === filtros.cartao) &&
            (!filtros.natureza || item.natureza === filtros.natureza) &&
            (!filtros.tipo || item.tipo === filtros.tipo) &&
            (!filtros.status || statusCalculado === filtros.status)
        );
    });
}

function agruparPlanejamento(lista) {
    const mapa = new Map();

    for (const item of lista) {
        const chave = [
            item.natureza,
            item.tipo,
            item.categoria_id || "",
            item.descricao,
            item.cartao_id || "",
            item.recorrencia_id || "",
            item.vencimento ? item.vencimento.slice(8, 10) : ""
        ].join("|");

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                vencimento: item.vencimento ? item.vencimento.slice(8, 10) : "-",
                natureza: item.natureza,
                tipo: item.tipo,
                categoria: item.categorias?.nome || "Sem categoria",
                categoriaCor: item.categorias?.cor || "#94a3b8",
                descricao: item.descricao,
                cartao: item.cartoes?.nome || "-",
                recorrente: Boolean(item.recorrencia_id),
                meses: {}
            });
        }

        mapa.get(chave).meses[chaveMes(item.competencia)] = item;
    }

    return [...mapa.values()].sort((a, b) => {
        const porDia = String(a.vencimento).localeCompare(String(b.vencimento));
        if (porDia !== 0) return porDia;
        return String(a.descricao).localeCompare(String(b.descricao), "pt-BR");
    });
}

function criarLinhasConsolidadasCartoes(lista) {
    const mapa = new Map();

    lista
        .filter(item => item.natureza === "saida" && item.cartao_id)
        .forEach(item => {
            const cartaoId = Number(item.cartao_id);
            const competencia = chaveMes(item.competencia);
            const cartao = estado.cartoes.find(registro => Number(registro.id) === cartaoId);

            if (!mapa.has(cartaoId)) {
                mapa.set(cartaoId, {
                    vencimento: cartao?.dia_vencimento
                        ? String(cartao.dia_vencimento).padStart(2, "0")
                        : "-",
                    natureza: "saida",
                    tipo: "variavel",
                    categoria: "Cartão de crédito",
                    categoriaCor: "#8b5cf6",
                    descricao: `Fatura ${cartao?.nome || "Cartão"}`,
                    cartao: cartao?.nome || "Cartão",
                    cartaoId,
                    consolidadoCartao: true,
                    meses: {}
                });
            }

            const linha = mapa.get(cartaoId);

            if (!linha.meses[competencia]) {
                linha.meses[competencia] = {
                    virtual: true,
                    consolidadoCartao: true,
                    cartao_id: cartaoId,
                    competencia: `${competencia}-01`,
                    valor_previsto: 0,
                    valor_realizado: 0,
                    quantidade: 0,
                    todosPagos: true,
                    status: "pendente"
                };
            }

            const total = linha.meses[competencia];
            total.valor_previsto += Number(item.valor_previsto || 0);
            total.valor_realizado += Number(item.valor_realizado || 0);
            total.quantidade += 1;

            if (!["pago", "recebido"].includes(item.status)) {
                total.todosPagos = false;
            }

            total.status = total.todosPagos ? "pago" : "pendente";
        });

    return [...mapa.values()].sort((a, b) =>
        String(a.cartao).localeCompare(String(b.cartao), "pt-BR")
    );
}

function calcularReservasPorMes(lista) {
    const resultado = [];
    let acumuladaProjetada = Number(estado.reservaInicial || 0);
    let acumuladaRealizada = Number(estado.reservaInicial || 0);

    estado.meses.forEach(competencia => {
        const itensMes = lista.filter(item =>
            chaveMes(item.competencia) === competencia &&
            ehReservaFinanceira(item) &&
            item.status !== "cancelado"
        );

        const aportePrevisto = itensMes.reduce(
            (soma, item) => soma + Number(item.valor_previsto || 0),
            0
        );

        const aporteRealizado = itensMes
            .filter(item => !item.virtual && ["pago", "recebido"].includes(item.status))
            .reduce(
                (soma, item) => soma + Number(item.valor_realizado ?? item.valor_previsto ?? 0),
                0
            );

        acumuladaProjetada += aportePrevisto;
        acumuladaRealizada += aporteRealizado;

        resultado.push({
            competencia,
            aportePrevisto,
            aporteRealizado,
            acumuladaProjetada,
            acumuladaRealizada
        });
    });

    return resultado;
}

function dadosSalarioMes(competencia) {
    const dados = estado.salarios?.[competencia] || {};
    const diasTrabalhados = Number(dados.diasTrabalhados || 0);
    const horasExtras = Number(dados.horasExtras || 0);
    const valorHora = Number(dados.valorHora || estado.valorHoraTrabalho || 110);
    const horasTotais = (diasTrabalhados * 8) + horasExtras;
    const salarioBruto = horasTotais * valorHora;

    return { diasTrabalhados, horasExtras, valorHora, horasTotais, salarioBruto };
}

async function abrirDadosSalario(competencia) {
    if (typeof abrirFormularioSalario === "function") {
        abrirFormularioSalario(competencia);
    }
}

function totalMes(lista, mes) {
    const itens = lista.filter(item =>
        chaveMes(item.competencia) === mes && item.status !== "cancelado"
    );

    const itensReserva = itens.filter(ehReservaFinanceira);
    const itensFinanceiros = itens.filter(item => !ehReservaFinanceira(item));

    const entradas = itensFinanceiros
        .filter(item => item.natureza === "entrada")
        .reduce((soma, item) => soma + Number(item.valor_previsto || 0), 0);

    const saidas = itensFinanceiros
        .filter(item => item.natureza === "saida")
        .reduce((soma, item) => soma + Number(item.valor_previsto || 0), 0);

    const entradasRealizadas = itensFinanceiros
        .filter(item =>
            item.natureza === "entrada" &&
            !item.virtual &&
            ["recebido", "pago"].includes(item.status)
        )
        .reduce(
            (soma, item) => soma + Number(item.valor_realizado ?? item.valor_previsto ?? 0),
            0
        );

    const saidasRealizadas = itensFinanceiros
        .filter(item =>
            item.natureza === "saida" &&
            !item.virtual &&
            ["pago", "recebido"].includes(item.status)
        )
        .reduce(
            (soma, item) => soma + Number(item.valor_realizado ?? item.valor_previsto ?? 0),
            0
        );

    const nubank = itensFinanceiros
        .filter(item => normalizarTexto(item.cartoes?.nome) === "nubank")
        .reduce((soma, item) => soma + Number(item.valor_previsto || 0), 0);

    const itau = itensFinanceiros
        .filter(item => normalizarTexto(item.cartoes?.nome) === "itau")
        .reduce((soma, item) => soma + Number(item.valor_previsto || 0), 0);

    const reservaPrevista = itensReserva.reduce(
        (soma, item) => soma + Number(item.valor_previsto || 0),
        0
    );

    const reservaRealizada = itensReserva
        .filter(item => !item.virtual && ["pago", "recebido"].includes(item.status))
        .reduce(
            (soma, item) => soma + Number(item.valor_realizado ?? item.valor_previsto ?? 0),
            0
        );

    const salarioBruto = dadosSalarioMes(mes).salarioBruto;

    return {
        entradas: entradas + salarioBruto,
        saidas,
        entradasRealizadas,
        saidasRealizadas,
        nubank,
        itau,
        reservaPrevista,
        reservaRealizada,
        saldo: entradas + salarioBruto - saidas - reservaPrevista,
        saldoRealizado: entradasRealizadas - saidasRealizadas - reservaRealizada
    };
}

function abrirConfiguracaoReserva() {
    abrirModal(
        "Reserva financeira",
        `
            <form id="formReservaInicial" class="form-grid">
                <label class="span-2">
                    Valor que já está guardado
                    <input
                        id="valorReservaInicial"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${Number(estado.reservaInicial || 0)}"
                        required
                    >
                </label>

                <div class="form-actions span-2">
                    <button class="btn secondary" type="button" onclick="fecharModal()">
                        Cancelar
                    </button>
                    <button class="btn primary" type="submit">Salvar</button>
                </div>
            </form>
        `
    );

    document.getElementById("formReservaInicial").addEventListener("submit", async evento => {
        evento.preventDefault();
        estado.reservaInicial = Number(
            document.getElementById("valorReservaInicial").value || 0
        );
        await salvarConfiguracao("reservaInicial", estado.reservaInicial);
        fecharModal();
        renderPlanejamento();
    });
}

function renderResumoPlanejamento(lista) {
    const mesAtual = estado.meses[0];
    const totais = totalMes(lista, mesAtual);
    const reservas = calcularReservasPorMes(lista);
    const reservaMesAtual = reservas.find(
        item => item.competencia === mesAtual
    );

    const reservaAtual =
        Number(estado.reservaInicial || 0)
        + Number(reservaMesAtual?.aporteRealizado || 0);

    const aportePrevistoMes =
        Number(reservaMesAtual?.aportePrevisto || 0);

    const aporteRealizadoMes =
        Number(reservaMesAtual?.aporteRealizado || 0);

    const nomeMesAtual = nomeMes(mesAtual);
    const resumo = document.getElementById("resumoGeral");

    if (!resumo) {
        return;
    }

    resumo.innerHTML = `
        <div class="summary-card entrada">
            <span>Entradas previstas — ${nomeMesAtual}</span>
            <strong>${moeda(totais.entradas)}</strong>
        </div>

        <div class="summary-card saida">
            <span>Despesas previstas — ${nomeMesAtual}</span>
            <strong>${moeda(totais.saidas)}</strong>
        </div>

        <div class="summary-card saldo">
            <span>Saldo previsto — ${nomeMesAtual}</span>
            <strong>${moeda(totais.saldo)}</strong>
        </div>

        <button
            class="summary-card reserva"
            type="button"
            onclick="abrirConfiguracaoReserva()"
        >
            <span>Reserva atual</span>
            <strong>${moeda(reservaAtual)}</strong>
            <small>
                Separado em ${nomeMesAtual}: ${moeda(aportePrevistoMes)} previsto
                ${
                    aporteRealizadoMes > 0
                        ? ` • ${moeda(aporteRealizadoMes)} confirmado`
                        : ""
                }
            </small>
        </button>
    `;
}

function addCell(grid, html, classes = "") {
    const elemento = document.createElement("div");
    elemento.className = `cell ${classes}`.trim();
    elemento.innerHTML = html;
    grid.appendChild(elemento);
}

function renderPlanejamento() {
    const lista = aplicarFiltrosPlanejamento(estado.itensPlanejamento);
    const itensSemReserva = lista.filter(item => !ehReservaFinanceira(item));
    const itensSemCartao = itensSemReserva.filter(item => !item.cartao_id);
    const linhasNormais = agruparPlanejamento(itensSemCartao);
    const linhasCartoes = criarLinhasConsolidadasCartoes(itensSemReserva);

    const linhasEntradas = linhasNormais.filter(linha => linha.natureza === "entrada");
    const linhasSaidas = [
        ...linhasNormais.filter(linha => linha.natureza === "saida"),
        ...linhasCartoes
    ];

    const grid = document.getElementById("plannerGrid");
    if (!grid) return;

    grid.innerHTML = "";
    grid.style.setProperty(
        "grid-template-columns",
        `46px 62px 110px 165px 68px repeat(${estado.meses.length}, 126px)`,
        "important"
    );

    [
        ["Venc.", "fixed header-cell c0"],
        ["Tipo", "fixed header-cell c1"],
        ["Categoria", "fixed header-cell c2"],
        ["Descrição", "fixed header-cell c3"],
        ["Cartão", "fixed header-cell c4"]
    ].forEach(([texto, classe]) => addCell(grid, texto, classe));

    estado.meses.forEach(mes => addCell(grid, nomeMes(mes), "header-cell"));

    function renderizarGrupo(titulo, linhasGrupo, classeGrupo) {
        if (!linhasGrupo.length) return;

        addCell(grid, titulo, `grupo-planejamento ${classeGrupo}`);

        linhasGrupo.forEach(linha => {
            addCell(grid, escapeHtml(linha.vencimento), "fixed row-fixed c0");
            addCell(
                grid,
                linha.tipo === "fixo" ? "Fixo" : "Variável",
                "fixed row-fixed c1"
            );
            addCell(
                grid,
                `<span class="category-chip">
                    <span class="category-dot" style="background:${escapeHtml(linha.categoriaCor)}"></span>
                    ${escapeHtml(linha.categoria)}
                </span>`,
                "fixed row-fixed c2"
            );
            addCell(
                grid,
                `<span class="descricao-linha">
                    ${linha.recorrente ? '<span class="badge-recorrencia" title="Recorrência">↻</span>' : ""}
                    ${escapeHtml(linha.descricao)}
                </span>`,
                "fixed row-fixed c3"
            );
            addCell(grid, escapeHtml(linha.cartao), "fixed row-fixed c4");

            estado.meses.forEach(mes => {
                const item = linha.meses[mes];

                if (!item) {
                    addCell(grid, "—", "empty-month");
                    return;
                }

                const status = normalizarStatus(item);
                const valor = item.consolidadoCartao
                    ? item.valor_previsto
                    : (item.valor_realizado ?? item.valor_previsto);

                let atributoClique = "";
                if (item.consolidadoCartao) {
                    atributoClique = `data-cartao-id="${item.cartao_id}" data-competencia="${mes}"`;
                } else if (item.virtual) {
                    atributoClique = `data-recorrencia-id="${item.recorrencia_id}" data-competencia="${mes}"`;
                } else {
                    atributoClique = `data-id="${item.id}"`;
                }

                addCell(
                    grid,
                    `<div class="month-box ${status}" ${atributoClique}>
                        <strong>${moeda(valor)}</strong>
                        <small>${item.consolidadoCartao ? "fatura" : item.virtual ? "previsto" : status}</small>
                    </div>`
                );
            });
        });
    }

    renderizarGrupo("ENTRADAS", linhasEntradas, "grupo-entradas");
    renderizarGrupo("SAÍDAS", linhasSaidas, "grupo-saidas");

    if (!linhasEntradas.length && !linhasSaidas.length) {
        addCell(grid, "Nenhum lançamento encontrado.", "empty-state-grid");
    }

    const totais = estado.meses.map(mes => totalMes(lista, mes));

    [
        ["Entradas previstas", "entradas"],
        ["Despesas previstas", "saidas"],
        ["Saldo previsto", "saldo"],
        ["Saldo realizado", "saldoRealizado"]
    ].forEach(([rotulo, chave]) => {
        addCell(grid, rotulo, "fixed total-label-wide");
        totais.forEach(total => addCell(grid, moeda(total[chave]), "total-cell"));
    });

    const reservas = calcularReservasPorMes(lista);
    addCell(grid, "Reserva acumulada", "fixed total-label-wide linha-reserva");
    reservas.forEach(reserva => {
        addCell(
            grid,
            moeda(reserva.acumuladaProjetada),
            "total-cell linha-reserva"
        );
    });

    document.querySelectorAll(".month-box[data-id]").forEach(elemento => {
        elemento.addEventListener("click", () => {
            abrirModalLancamento(Number(elemento.dataset.id));
        });
    });

    document.querySelectorAll(".month-box[data-recorrencia-id]").forEach(elemento => {
        elemento.addEventListener("click", () => {
            abrirOcorrenciaRecorrente(
                Number(elemento.dataset.recorrenciaId),
                elemento.dataset.competencia
            );
        });
    });

    document.querySelectorAll(".month-box[data-cartao-id]").forEach(elemento => {
        elemento.addEventListener("click", () => {
            window.cartaoDetalheInicial = {
                cartaoId: Number(elemento.dataset.cartaoId),
                competencia: elemento.dataset.competencia
            };
            navegar("cartoes");
        });
    });

    renderResumoPlanejamento(lista);

    if (typeof atualizarResumoSalarioLateral === "function") {
        atualizarResumoSalarioLateral(estado.meses[0], estado.salarios, estado.valorHoraTrabalho);
    }
}

function preencherFiltrosPlanejamento() {
    const filtroCategoria = document.getElementById("filtroCategoria");
    const filtroCartao = document.getElementById("filtroCartao");

    filtroCategoria.innerHTML = '<option value="">Todas as categorias</option>';
    filtroCartao.innerHTML = '<option value="">Todos os cartões</option>';

    estado.categorias
        .filter(item => item.ativo !== false)
        .forEach(categoria => {
            filtroCategoria.insertAdjacentHTML(
                "beforeend",
                `<option value="${categoria.id}">${escapeHtml(categoria.nome)}</option>`
            );
        });

    estado.cartoes
        .filter(item => item.ativo !== false)
        .forEach(cartao => {
            filtroCartao.insertAdjacentHTML(
                "beforeend",
                `<option value="${cartao.id}">${escapeHtml(cartao.nome)}</option>`
            );
        });
}

async function paginaPlanejamento() {
    setTitulo(
        "Planejamento Financeiro Pessoal",
        "Controle de caixa e planejamento dos próximos meses"
    );

    setAcaoPrincipal("+ Novo lançamento", () => abrirModalLancamento());

    document.getElementById("app").innerHTML = `
        <section class="toolbar">
            <input id="filtroBusca" type="search" placeholder="Pesquisar descrição...">
            <select id="filtroCategoria"></select>
            <select id="filtroCartao"></select>
            <select id="filtroNatureza">
                <option value="">Entradas e saídas</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
            </select>
            <select id="filtroTipo">
                <option value="">Fixo e variável</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
            </select>
            <select id="filtroStatus">
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="recebido">Recebido</option>
                <option value="atrasado">Atrasado</option>
                <option value="cancelado">Cancelado</option>
            </select>
            <button id="btnLimparFiltros" class="btn secondary" type="button">Limpar</button>
        </section>

        <section id="resumoGeral" class="summary-grid planning-summary-grid"></section>

        <section class="panel">
            <div class="panel-header">
                <div>
                    <h2>Planejamento mensal</h2>
                    <p>Previsão do mês atual até dezembro de 2032</p>
                </div>
            </div>
            <div class="planner-viewport">
                <div id="plannerGrid" class="planner-grid"></div>
            </div>
        </section>
    `;

    estado.meses = mesesAteDezembro2032();

    const [
        categorias,
        cartoes,
        lancamentos,
        recorrencias,
        reservaInicialRaw,
        dadosSalarioRaw,
        valorHoraRaw
    ] = await Promise.all([
        buscarCategorias(),
        buscarCartoes(),
        buscarLancamentos(estado.meses),
        buscarRecorrencias(),
        buscarConfiguracao("reservaInicial"),
        buscarConfiguracao("dadosSalarioMensal"),
        buscarConfiguracao("valorHoraTrabalho")
    ]);

    estado.categorias = categorias;
    estado.cartoes = cartoes;
    estado.lancamentos = lancamentos;
    estado.recorrencias = recorrencias;
    estado.reservaInicial = Number(reservaInicialRaw || 0);
    estado.valorHoraTrabalho = Number(valorHoraRaw || 110);
    try {
        estado.salarios = dadosSalarioRaw ? JSON.parse(dadosSalarioRaw) : {};
    } catch (erro) {
        console.warn("Não foi possível ler os dados mensais do salário.", erro);
        estado.salarios = {};
    }

    gerarItensDoPlanejamento();
    preencherFiltrosPlanejamento();
    renderPlanejamento();

    document
        .querySelectorAll(
            "#filtroBusca,#filtroCategoria,#filtroCartao,#filtroNatureza,#filtroTipo,#filtroStatus"
        )
        .forEach(campo => {
            campo.addEventListener(
                campo.id === "filtroBusca" ? "input" : "change",
                renderPlanejamento
            );
        });

    document.getElementById("btnLimparFiltros").addEventListener("click", () => {
        [
            "filtroBusca",
            "filtroCategoria",
            "filtroCartao",
            "filtroNatureza",
            "filtroTipo",
            "filtroStatus"
        ].forEach(id => {
            document.getElementById(id).value = "";
        });
        renderPlanejamento();
    });
}
