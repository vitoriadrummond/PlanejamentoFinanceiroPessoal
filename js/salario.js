let salarioEstado = {
    dados: {},
    valorHoraPadrao: 110
};

function competenciaAtualSalario() {
    return new Date().toISOString().slice(0, 7);
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

async function obterCategoriaDasSimples() {
    const categorias = await buscarCategorias();
    let categoria = categorias.find(item => normalizarTexto(item.nome) === "das simples");

    if (!categoria) {
        categoria = await inserirCategoria({
            nome: "DAS Simples",
            cor: "#94a3b8",
            ativo: true
        });
    }

    return categoria;
}

async function sincronizarDasSimples(competenciaSalario) {
    const calculado = calcularDadosSalario(competenciaSalario);
    const competenciaDas = proximaCompetencia(competenciaSalario);
    const descricao = `DAS Simples automático — salário ${competenciaSalario}`;
    const valorDas = Number((calculado.salarioBruto * 0.0708).toFixed(2));
    const categoria = await obterCategoriaDasSimples();

    const { data: existentes, error: erroBusca } = await supabaseClient
        .from("lancamentos")
        .select("id")
        .eq("descricao", descricao)
        .limit(1);

    if (erroBusca) throw erroBusca;

    const existente = existentes?.[0];

    if (valorDas <= 0) {
        if (existente) await excluirLancamento(existente.id);
        return;
    }

    const objeto = {
        natureza: "saida",
        tipo: "fixa",
        categoria_id: categoria.id,
        cartao_id: null,
        recorrencia_id: null,
        descricao,
        competencia: `${competenciaDas}-01`,
        vencimento: `${competenciaDas}-20`,
        valor_previsto: valorDas,
        valor_realizado: null,
        status: "previsto",
        data_realizacao: null,
        parcela_atual: null,
        total_parcelas: null,
        observacao: `Calculado automaticamente: 7,08% do salário bruto de ${competenciaSalario}.`
    };

    if (existente) {
        await atualizarLancamento(existente.id, objeto);
    } else {
        await inserirLancamento(objeto);
    }
}

function atualizarPreviaSalarioLateral() {
    const dias = normalizarNumeroSalarioLateral(document.getElementById("salarioLateralDias")?.value);
    const extras = normalizarNumeroSalarioLateral(document.getElementById("salarioLateralExtras")?.value);
    const valorHora = Number(salarioEstado.valorHoraPadrao || 110);
    const horas = (dias * 8) + extras;
    const bruto = horas * valorHora;

    const horasEl = document.getElementById("salarioLateralHorasTotais");
    const brutoEl = document.getElementById("salarioLateralBruto");
    if (horasEl) horasEl.textContent = `${horas.toLocaleString("pt-BR")} h`;
    if (brutoEl) brutoEl.textContent = moeda(bruto);
}

async function salvarDadosSalarioLateral(competencia) {
    const botao = document.getElementById("btnSalvarSalarioLateral");
    if (botao) botao.disabled = true;

    try {
        salarioEstado.dados[competencia] = {
            diasTrabalhados: normalizarNumeroSalarioLateral(document.getElementById("salarioLateralDias")?.value),
            horasExtras: normalizarNumeroSalarioLateral(document.getElementById("salarioLateralExtras")?.value),
            valorHora: Number(salarioEstado.valorHoraPadrao || 110)
        };

        if (typeof estado !== "undefined") {
            estado.salarios = estado.salarios || {};
            estado.salarios[competencia] = { ...salarioEstado.dados[competencia] };
        }

        await salvarConfiguracao("dadosSalarioMensal", JSON.stringify(salarioEstado.dados));
        await sincronizarDasSimples(competencia);

        if (paginaAtual === "planejamento" && typeof paginaPlanejamento === "function") {
            await paginaPlanejamento();
        } else {
            atualizarResumoSalarioLateral(competencia);
        }
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
            <div><span>Horas totais</span><strong id="salarioLateralHorasTotais">${calculado.horasTotais.toLocaleString("pt-BR")} h</strong></div>
            <div><span>Salário bruto</span><strong id="salarioLateralBruto">${moeda(calculado.salarioBruto)}</strong></div>
        </div>
        <button id="btnSalvarSalarioLateral" type="button" class="salary-sidebar-save">Salvar</button>
        <button type="button" class="salary-sidebar-link" onclick="navegar('salario')">Histórico</button>
    `;

    ["salarioLateralDias", "salarioLateralExtras"].forEach(id =>
        document.getElementById(id)?.addEventListener("input", atualizarPreviaSalarioLateral)
    );
    document.getElementById("btnSalvarSalarioLateral")?.addEventListener("click", () => salvarDadosSalarioLateral(competencia));
}

async function carregarDadosSalario() {
    const [dadosRaw, valorHoraRaw] = await Promise.all([
        buscarConfiguracao("dadosSalarioMensal"),
        buscarConfiguracao("valorHoraTrabalho")
    ]);

    try { salarioEstado.dados = dadosRaw ? JSON.parse(dadosRaw) : {}; }
    catch { salarioEstado.dados = {}; }
    salarioEstado.valorHoraPadrao = Number(valorHoraRaw || 110);
}

function mesesHistoricoSalario() {
    const meses = new Set(Object.keys(salarioEstado.dados || {}));
    meses.add(competenciaAtualSalario());
    return [...meses].sort().reverse();
}

function atualizarPreviaFormularioSalario() {
    const dias = Number(document.getElementById("salarioDias")?.value || 0);
    const extras = Number(document.getElementById("salarioHorasExtras")?.value || 0);
    const valorHora = Number(document.getElementById("salarioValorHora")?.value || 0);
    const horas = (dias * 8) + extras;
    const bruto = horas * valorHora;
    document.getElementById("previaHorasTotais").textContent = `${horas.toLocaleString("pt-BR")} h`;
    document.getElementById("previaSalarioBruto").textContent = moeda(bruto);
}

function abrirFormularioSalario(competencia = competenciaAtualSalario()) {
    const dados = calcularDadosSalario(competencia);
    abrirModal(`Salário — ${nomeMes(competencia)}`, `
        <form id="formDadosSalario" class="form-grid salary-form">
            <label>Competência<input id="salarioCompetencia" type="month" value="${competencia}" required></label>
            <label>Dias trabalhados<input id="salarioDias" type="number" min="0" step="1" value="${dados.diasTrabalhados}" required></label>
            <label>Horas extras<input id="salarioHorasExtras" type="number" min="0" step="0.01" value="${dados.horasExtras}" required></label>
            <label>Valor da hora<input id="salarioValorHora" type="number" min="0" step="0.01" value="${dados.valorHora}" required></label>
            <div class="salary-preview span-2">
                <div><span>Horas totais</span><strong id="previaHorasTotais">${dados.horasTotais.toLocaleString("pt-BR")} h</strong></div>
                <div><span>Salário bruto</span><strong id="previaSalarioBruto">${moeda(dados.salarioBruto)}</strong></div>
            </div>
            <div class="form-actions span-2"><button class="btn secondary" type="button" onclick="fecharModal()">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
        </form>
    `);

    ["salarioDias", "salarioHorasExtras", "salarioValorHora"].forEach(id => document.getElementById(id).addEventListener("input", atualizarPreviaFormularioSalario));
    document.getElementById("salarioCompetencia").addEventListener("change", evento => abrirFormularioSalario(evento.target.value));
    document.getElementById("formDadosSalario").addEventListener("submit", async evento => {
        evento.preventDefault();
        const comp = document.getElementById("salarioCompetencia").value;
        const valorHora = Number(document.getElementById("salarioValorHora").value || 110);
        salarioEstado.dados[comp] = {
            diasTrabalhados: Number(document.getElementById("salarioDias").value || 0),
            horasExtras: Number(document.getElementById("salarioHorasExtras").value || 0),
            valorHora
        };
        salarioEstado.valorHoraPadrao = valorHora;
        if (typeof estado !== "undefined") {
            estado.salarios = estado.salarios || {};
            estado.salarios[comp] = { ...salarioEstado.dados[comp] };
            estado.valorHoraTrabalho = valorHora;
        }
        await Promise.all([
            salvarConfiguracao("dadosSalarioMensal", JSON.stringify(salarioEstado.dados)),
            salvarConfiguracao("valorHoraTrabalho", valorHora)
        ]);
        await sincronizarDasSimples(comp);
        fecharModal();
        atualizarResumoSalarioLateral(comp);
        await paginaSalario();
    });
}

async function excluirDadosSalario(competencia) {
    if (!confirm(`Excluir os dados de ${nomeMes(competencia)}?`)) return;
    delete salarioEstado.dados[competencia];
    if (typeof estado !== "undefined" && estado.salarios) delete estado.salarios[competencia];
    await salvarConfiguracao("dadosSalarioMensal", JSON.stringify(salarioEstado.dados));
    await sincronizarDasSimples(competencia);
    atualizarResumoSalarioLateral();
    await paginaSalario();
}

function resumoAnualSalario(ano) {
    return Object.keys(salarioEstado.dados)
        .filter(chave => chave.startsWith(`${ano}-`))
        .reduce((total, competencia) => {
            const dados = calcularDadosSalario(competencia);
            total.bruto += dados.salarioBruto;
            total.horas += dados.horasTotais;
            total.meses += 1;
            return total;
        }, { bruto: 0, horas: 0, meses: 0 });
}

async function paginaSalario() {
    setTitulo("Salário", "Histórico mensal e cálculo do salário bruto");
    setAcaoPrincipal("+ Dados do mês", () => abrirFormularioSalario());
    await carregarDadosSalario();
    atualizarResumoSalarioLateral();

    const meses = mesesHistoricoSalario();
    const anoAtual = String(new Date().getFullYear());
    const resumo = resumoAnualSalario(anoAtual);

    document.getElementById("app").innerHTML = `
        <div class="summary-grid salary-summary-grid">
            <div class="summary-card"><span>Bruto no ano</span><strong>${moeda(resumo.bruto)}</strong></div>
            <div class="summary-card"><span>Horas no ano</span><strong>${resumo.horas.toLocaleString("pt-BR")} h</strong></div>
            <div class="summary-card"><span>Meses cadastrados</span><strong>${resumo.meses}</strong></div>
        </div>
        <section class="panel">
            <div class="panel-header"><div><h2>Histórico salarial</h2><p>O DAS Simples do mês seguinte é criado automaticamente como saída.</p></div></div>
            <div class="table-wrap"><table><thead><tr><th>Mês</th><th>Dias</th><th>Horas extras</th><th>Valor/hora</th><th>Horas totais</th><th>Bruto</th><th>Ações</th></tr></thead>
            <tbody>${meses.map(competencia => {
                const dados = calcularDadosSalario(competencia);
                const temRegistro = Boolean(salarioEstado.dados[competencia]);
                return `<tr><td>${nomeMes(competencia)}</td><td>${dados.diasTrabalhados}</td><td>${dados.horasExtras}</td><td>${moeda(dados.valorHora)}</td><td>${dados.horasTotais.toLocaleString("pt-BR")} h</td><td>${moeda(dados.salarioBruto)}</td><td><button class="btn small secondary" type="button" data-editar-salario="${competencia}">${temRegistro ? "Editar" : "Cadastrar"}</button>${temRegistro ? `<button class="btn small danger" type="button" data-excluir-salario="${competencia}">Excluir</button>` : ""}</td></tr>`;
            }).join("")}</tbody></table></div>
        </section>
    `;

    document.querySelectorAll("[data-editar-salario]").forEach(botao => botao.addEventListener("click", () => abrirFormularioSalario(botao.dataset.editarSalario)));
    document.querySelectorAll("[data-excluir-salario]").forEach(botao => botao.addEventListener("click", () => excluirDadosSalario(botao.dataset.excluirSalario)));
}
