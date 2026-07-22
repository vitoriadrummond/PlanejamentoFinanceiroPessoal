let salarioEstado = {
    dados: {},
    valorHoraPadrao: 110,
    percentualDas: 7.08
};

function competenciaAtualSalario() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function competenciasJanelaSalario(quantidade = 12) {
    const atual = competenciaAtualSalario();
    const [ano, mes] = atual.split("-").map(Number);
    return Array.from({ length: quantidade }, (_, indice) => {
        const data = new Date(ano, mes - 1 + indice, 1);
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    });
}

function calcularDadosSalario(competencia, dados = salarioEstado.dados, valorHoraPadrao = salarioEstado.valorHoraPadrao) {
    const registro = dados?.[competencia] || {};
    const diasTrabalhados = Number(registro.diasTrabalhados || 0);
    const horasExtras = Number(registro.horasExtras || 0);
    const valorHora = Number(registro.valorHora || valorHoraPadrao || 110);
    const horasTotais = (diasTrabalhados * 8) + horasExtras;
    const salarioBruto = horasTotais * valorHora;
    return { diasTrabalhados, horasExtras, valorHora, horasTotais, salarioBruto };
}

function normalizarNumeroSalarioLateral(valor) {
    return Number(String(valor ?? "0").replace(",", ".")) || 0;
}

function proximaCompetencia(competencia) {
    const [ano, mes] = competencia.split("-").map(Number);
    const data = new Date(ano, mes, 1);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function statusCompetenciaSalario(competencia) {
    const atual = competenciaAtualSalario();
    if (competencia < atual) return { texto: "Concluído", classe: "done" };
    if (competencia === atual) return { texto: "Em andamento", classe: "current" };
    return { texto: "Previsto", classe: "planned" };
}

async function obterCategoriaDasSimples() {
    const categorias = await buscarCategorias();
    let categoria = categorias.find(item => normalizarTexto(item.nome) === "das simples");
    if (!categoria) {
        categoria = await inserirCategoria({ nome: "DAS Simples", cor: "#94a3b8", ativo: true });
    }
    return categoria;
}

async function sincronizarDasSimples(competenciaSalario) {
    const calculado = calcularDadosSalario(competenciaSalario);
    const competenciaDas = proximaCompetencia(competenciaSalario);
    const descricao = `DAS Simples automático — salário ${competenciaSalario}`;
    const aliquota = Number(salarioEstado.percentualDas || 7.08) / 100;
    const valorDas = Number((calculado.salarioBruto * aliquota).toFixed(2));
    const categoria = await obterCategoriaDasSimples();

    const { data: existentes, error: erroBusca } = await supabaseClient
        .from("lancamentos").select("id").eq("descricao", descricao).limit(1);
    if (erroBusca) throw erroBusca;
    const existente = existentes?.[0];

    if (valorDas <= 0) {
        if (existente) await excluirLancamento(existente.id);
        return;
    }

    const objeto = {
        natureza: "saida", tipo: "fixa", categoria_id: categoria.id,
        cartao_id: null, recorrencia_id: null, descricao,
        competencia: `${competenciaDas}-01`, vencimento: `${competenciaDas}-20`,
        valor_previsto: valorDas, valor_realizado: null, status: "previsto",
        data_realizacao: null, parcela_atual: null, total_parcelas: null,
        observacao: `Calculado automaticamente: ${Number(salarioEstado.percentualDas || 7.08).toLocaleString("pt-BR")}% do salário bruto de ${competenciaSalario}.`
    };
    if (existente) await atualizarLancamento(existente.id, objeto);
    else await inserirLancamento(objeto);
}

function atualizarPreviaSalarioLateral() {
    const dias = normalizarNumeroSalarioLateral(document.getElementById("salarioLateralDias")?.value);
    const extras = normalizarNumeroSalarioLateral(document.getElementById("salarioLateralExtras")?.value);
    const horas = (dias * 8) + extras;
    const bruto = horas * Number(salarioEstado.valorHoraPadrao || 110);
    const horasEl = document.getElementById("salarioLateralHorasTotais");
    const brutoEl = document.getElementById("salarioLateralBruto");
    if (horasEl) horasEl.textContent = `${horas.toLocaleString("pt-BR")} h`;
    if (brutoEl) brutoEl.textContent = moeda(bruto);
}

async function persistirDadosSalario(competencia, registro) {
    salarioEstado.dados[competencia] = registro;
    if (typeof estado !== "undefined") {
        estado.salarios = estado.salarios || {};
        estado.salarios[competencia] = { ...registro };
        estado.valorHoraTrabalho = salarioEstado.valorHoraPadrao;
    }
    await salvarConfiguracao("dadosSalarioMensal", JSON.stringify(salarioEstado.dados));
    await sincronizarDasSimples(competencia);
}

async function salvarDadosSalarioLateral(competencia) {
    const botao = document.getElementById("btnSalvarSalarioLateral");
    if (botao) botao.disabled = true;
    try {
        await persistirDadosSalario(competencia, {
            diasTrabalhados: normalizarNumeroSalarioLateral(document.getElementById("salarioLateralDias")?.value),
            horasExtras: normalizarNumeroSalarioLateral(document.getElementById("salarioLateralExtras")?.value),
            valorHora: Number(salarioEstado.valorHoraPadrao || 110)
        });
        if (paginaAtual === "planejamento" && typeof paginaPlanejamento === "function") await paginaPlanejamento();
        else atualizarResumoSalarioLateral(competencia);
    } catch (erro) {
        console.error(erro);
        alert(`Não foi possível salvar o salário: ${erro.message}`);
    } finally {
        const novoBotao = document.getElementById("btnSalvarSalarioLateral");
        if (novoBotao) novoBotao.disabled = false;
    }
}

function atualizarResumoSalarioLateral(competencia = competenciaAtualSalario(), dados = salarioEstado.dados, valorHoraPadrao = salarioEstado.valorHoraPadrao) {
    const painel = document.getElementById("resumoSalarioLateral");
    if (!painel) return;
    salarioEstado.dados = dados || salarioEstado.dados || {};
    salarioEstado.valorHoraPadrao = Number(valorHoraPadrao || salarioEstado.valorHoraPadrao || 110);
    const calculado = calcularDadosSalario(competencia, salarioEstado.dados, salarioEstado.valorHoraPadrao);
    painel.innerHTML = `
        <div class="salary-sidebar-title">💼 Salário</div>
        <div class="salary-sidebar-month">${nomeMes(competencia)}</div>
        <div class="salary-sidebar-fields">
            <label>Dias trabalhados<input id="salarioLateralDias" type="number" min="0" step="1" value="${calculado.diasTrabalhados}"></label>
            <label>Horas extras<input id="salarioLateralExtras" type="number" min="0" step="0.01" value="${calculado.horasExtras}"></label>
        </div>
        <div class="salary-sidebar-results">
            <div class="salary-result-card"><span>Horas totais</span><strong id="salarioLateralHorasTotais">${calculado.horasTotais.toLocaleString("pt-BR")} h</strong></div>
            <div class="salary-result-card"><span>Salário bruto</span><strong id="salarioLateralBruto">${moeda(calculado.salarioBruto)}</strong></div>
        </div>
        <button id="btnSalvarSalarioLateral" type="button" class="salary-sidebar-save">Salvar</button>`;
    ["salarioLateralDias", "salarioLateralExtras"].forEach(id => document.getElementById(id)?.addEventListener("input", atualizarPreviaSalarioLateral));
    document.getElementById("btnSalvarSalarioLateral")?.addEventListener("click", () => salvarDadosSalarioLateral(competencia));
}

async function carregarDadosSalario() {
    const [dadosRaw, valorHoraRaw, percentualRaw] = await Promise.all([
        buscarConfiguracao("dadosSalarioMensal"),
        buscarConfiguracao("valorHoraTrabalho"),
        buscarConfiguracao("percentualDas")
    ]);
    try { salarioEstado.dados = dadosRaw ? JSON.parse(dadosRaw) : {}; } catch { salarioEstado.dados = {}; }
    salarioEstado.valorHoraPadrao = Number(valorHoraRaw || 110);
    salarioEstado.percentualDas = Number(percentualRaw || 7.08);
}

function atualizarPreviaFormularioSalario() {
    const dias = Number(document.getElementById("salarioDias")?.value || 0);
    const extras = Number(document.getElementById("salarioHorasExtras")?.value || 0);
    const horas = (dias * 8) + extras;
    document.getElementById("previaHorasTotais").textContent = `${horas.toLocaleString("pt-BR")} h`;
    document.getElementById("previaSalarioBruto").textContent = moeda(horas * Number(salarioEstado.valorHoraPadrao || 110));
}

function abrirFormularioSalario(competencia = competenciaAtualSalario()) {
    const dados = calcularDadosSalario(competencia);
    const futuro = competencia > competenciaAtualSalario();
    abrirModal(`${futuro ? "Planejar" : "Salário"} — ${nomeMes(competencia)}`, `
        <form id="formDadosSalario" class="form-grid salary-form">
            <label class="span-2">Competência<input id="salarioCompetencia" type="month" value="${competencia}" required></label>
            <label>Dias trabalhados<input id="salarioDias" type="number" min="0" step="1" value="${dados.diasTrabalhados}" required></label>
            <label>Horas extras<input id="salarioHorasExtras" type="number" min="0" step="0.01" value="${dados.horasExtras}" required></label>
            <div class="salary-preview span-2">
                <div><span>Horas totais</span><strong id="previaHorasTotais">${dados.horasTotais.toLocaleString("pt-BR")} h</strong></div>
                <div><span>Salário bruto</span><strong id="previaSalarioBruto">${moeda(dados.salarioBruto)}</strong></div>
            </div>
            <p class="form-help span-2">Valor da hora atual: <strong>${moeda(salarioEstado.valorHoraPadrao)}</strong>. Altere em Configurações.</p>
            <div class="form-actions span-2"><button class="btn secondary" type="button" onclick="fecharModal()">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
        </form>`);
    ["salarioDias", "salarioHorasExtras"].forEach(id => document.getElementById(id).addEventListener("input", atualizarPreviaFormularioSalario));
    document.getElementById("salarioCompetencia").addEventListener("change", evento => abrirFormularioSalario(evento.target.value));
    document.getElementById("formDadosSalario").addEventListener("submit", async evento => {
        evento.preventDefault();
        const comp = document.getElementById("salarioCompetencia").value;
        await persistirDadosSalario(comp, {
            diasTrabalhados: Number(document.getElementById("salarioDias").value || 0),
            horasExtras: Number(document.getElementById("salarioHorasExtras").value || 0),
            valorHora: Number(salarioEstado.valorHoraPadrao || 110)
        });
        fecharModal();
        atualizarResumoSalarioLateral();
        await paginaSalario();
    });
}

async function excluirDadosSalario(competencia) {
    const deveConfirmar = (await buscarConfiguracao("confirmarExclusao")) !== "false";
    if (deveConfirmar && !confirm(`Excluir os dados de ${nomeMes(competencia)}?`)) return;
    delete salarioEstado.dados[competencia];
    if (typeof estado !== "undefined" && estado.salarios) delete estado.salarios[competencia];
    await salvarConfiguracao("dadosSalarioMensal", JSON.stringify(salarioEstado.dados));
    await sincronizarDasSimples(competencia);
    atualizarResumoSalarioLateral();
    await paginaSalario();
}

function resumoAnualSalario(ano) {
    const atual = competenciaAtualSalario();
    return Object.keys(salarioEstado.dados)
        .filter(chave => chave.startsWith(`${ano}-`) && chave <= atual)
        .reduce((total, competencia) => {
            const dados = calcularDadosSalario(competencia);
            total.bruto += dados.salarioBruto; total.horas += dados.horasTotais; total.meses += 1;
            return total;
        }, { bruto: 0, horas: 0, meses: 0 });
}

async function paginaSalario() {
    setTitulo("Salário", "Planejamento contínuo do mês atual e dos próximos 11 meses");
    setAcaoPrincipal("+ Dados do mês", () => abrirFormularioSalario());
    await carregarDadosSalario();
    atualizarResumoSalarioLateral();

    const janela = competenciasJanelaSalario(12);
    const atual = competenciaAtualSalario();
    const historico = Object.keys(salarioEstado.dados || {}).filter(c => c < atual).sort().reverse();
    const resumo = resumoAnualSalario(String(new Date().getFullYear()));

    document.getElementById("app").innerHTML = `
        <div class="summary-grid salary-summary-grid">
            <div class="summary-card"><span>Bruto no ano</span><strong>${moeda(resumo.bruto)}</strong></div>
            <div class="summary-card"><span>Horas no ano</span><strong>${resumo.horas.toLocaleString("pt-BR")} h</strong></div>
            <div class="summary-card"><span>Meses concluídos</span><strong>${resumo.meses}</strong></div>
        </div>
        <section class="panel">
            <div class="panel-header"><div><h2>Planejamento de 12 meses</h2><p>A janela se renova automaticamente: o mês atual sai depois de concluído e um novo mês entra no final.</p></div></div>
            <div class="table-wrap"><table><thead><tr><th>Mês</th><th>Status</th><th>Dias</th><th>Horas extras</th><th>Horas totais</th><th>Bruto</th><th>Ações</th></tr></thead>
            <tbody>${janela.map(competencia => {
                const dados = calcularDadosSalario(competencia);
                const temRegistro = Boolean(salarioEstado.dados[competencia]);
                const status = statusCompetenciaSalario(competencia);
                return `<tr><td><strong>${nomeMes(competencia)}</strong></td><td><span class="salary-status ${status.classe}">${status.texto}</span></td><td>${dados.diasTrabalhados}</td><td>${dados.horasExtras}</td><td>${dados.horasTotais.toLocaleString("pt-BR")} h</td><td>${moeda(dados.salarioBruto)}</td><td><button class="btn small secondary" type="button" data-editar-salario="${competencia}">${temRegistro ? "Editar" : competencia === atual ? "Cadastrar" : "Planejar"}</button>${temRegistro ? `<button class="btn small danger" type="button" data-excluir-salario="${competencia}">Excluir</button>` : ""}</td></tr>`;
            }).join("")}</tbody></table></div>
        </section>
        ${historico.length ? `<details class="panel salary-history-panel"><summary>Ver meses anteriores (${historico.length})</summary><div class="table-wrap"><table><thead><tr><th>Mês</th><th>Dias</th><th>Horas extras</th><th>Horas totais</th><th>Bruto</th><th>Ações</th></tr></thead><tbody>${historico.map(competencia => { const d=calcularDadosSalario(competencia); return `<tr><td>${nomeMes(competencia)}</td><td>${d.diasTrabalhados}</td><td>${d.horasExtras}</td><td>${d.horasTotais.toLocaleString("pt-BR")} h</td><td>${moeda(d.salarioBruto)}</td><td><button class="btn small secondary" data-editar-salario="${competencia}">Editar</button><button class="btn small danger" data-excluir-salario="${competencia}">Excluir</button></td></tr>`; }).join("")}</tbody></table></div></details>` : ""}`;

    document.querySelectorAll("[data-editar-salario]").forEach(botao => botao.addEventListener("click", () => abrirFormularioSalario(botao.dataset.editarSalario)));
    document.querySelectorAll("[data-excluir-salario]").forEach(botao => botao.addEventListener("click", () => excluirDadosSalario(botao.dataset.excluirSalario)));
}
