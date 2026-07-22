async function carregarConfiguracoesSistema() {
    const [valorHora, percentualDas, saldoInicial, reservaInicial, confirmar] = await Promise.all([
        buscarConfiguracao("valorHoraTrabalho"), buscarConfiguracao("percentualDas"),
        buscarConfiguracao("saldoInicial"), buscarConfiguracao("reservaInicial"),
        buscarConfiguracao("confirmarExclusao")
    ]);
    return {
        valorHora: Number(valorHora || 110), percentualDas: Number(percentualDas || 7.08),
        saldoInicial: Number(saldoInicial || 0), reservaInicial: Number(reservaInicial || 0),
        confirmarExclusao: confirmar !== "false"
    };
}

function calcularDataLimpeza(opcao) {
    const hoje = new Date();
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    if (opcao === "1") data.setFullYear(data.getFullYear() - 1);
    if (opcao === "2") data.setFullYear(data.getFullYear() - 2);
    if (opcao === "3") data.setFullYear(data.getFullYear() - 3);
    return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}-01`;
}

async function paginaConfiguracoes() {
    setTitulo("Configurações", "Parâmetros financeiros e manutenção do sistema");
    setAcaoPrincipal("Salvar configurações", () => document.getElementById("formConfiguracoes")?.requestSubmit());
    const cfg = await carregarConfiguracoesSistema();
    document.getElementById("app").innerHTML = `
      <div class="settings-layout">
        <section class="panel settings-panel">
          <div class="panel-header"><div><h2>Financeiro</h2><p>Valores usados nos cálculos do sistema.</p></div></div>
          <form id="formConfiguracoes" class="settings-form">
            <label>Valor da hora<input id="cfgValorHora" type="number" min="0" step="0.01" value="${cfg.valorHora}"></label>
            <label>Percentual do DAS (%)<input id="cfgPercentualDas" type="number" min="0" step="0.01" value="${cfg.percentualDas}"></label>
            <label>Saldo inicial<input id="cfgSaldoInicial" type="number" step="0.01" value="${cfg.saldoInicial}"></label>
            <label>Reserva inicial<input id="cfgReservaInicial" type="number" min="0" step="0.01" value="${cfg.reservaInicial}"></label>
            <label class="settings-check span-2"><input id="cfgConfirmarExclusao" type="checkbox" ${cfg.confirmarExclusao ? "checked" : ""}><span>Confirmar antes de excluir registros</span></label>
            <div class="form-actions span-2"><button class="btn primary" type="submit">Salvar configurações</button></div>
          </form>
        </section>
        <section class="panel settings-panel danger-zone">
          <div class="panel-header"><div><h2>Manutenção</h2><p>Exclui somente lançamentos antigos. Cartões, categorias, recorrências, salários e configurações permanecem.</p></div></div>
          <form id="formLimpeza" class="settings-form">
            <label>Excluir lançamentos anteriores a
              <select id="limpezaPeriodo"><option value="1">1 ano</option><option value="2">2 anos</option><option value="3">3 anos</option><option value="data">Escolher uma data</option></select>
            </label>
            <label id="campoDataLimpeza" hidden>Data limite<input id="limpezaData" type="date"></label>
            <div class="settings-warning span-2">Esta exclusão é definitiva e não pode ser desfeita.</div>
            <div class="form-actions span-2"><button class="btn danger" type="submit">Excluir dados antigos</button></div>
          </form>
        </section>
      </div>`;

    document.getElementById("formConfiguracoes").addEventListener("submit", async evento => {
      evento.preventDefault();
      const valorHora = Number(document.getElementById("cfgValorHora").value || 0);
      const percentualDas = Number(document.getElementById("cfgPercentualDas").value || 0);
      await Promise.all([
        salvarConfiguracao("valorHoraTrabalho", valorHora),
        salvarConfiguracao("percentualDas", percentualDas),
        salvarConfiguracao("saldoInicial", Number(document.getElementById("cfgSaldoInicial").value || 0)),
        salvarConfiguracao("reservaInicial", Number(document.getElementById("cfgReservaInicial").value || 0)),
        salvarConfiguracao("confirmarExclusao", document.getElementById("cfgConfirmarExclusao").checked)
      ]);
      salarioEstado.valorHoraPadrao = valorHora;
      salarioEstado.percentualDas = percentualDas;
      alert("Configurações salvas.");
    });

    document.getElementById("limpezaPeriodo").addEventListener("change", evento => {
      document.getElementById("campoDataLimpeza").hidden = evento.target.value !== "data";
    });

    document.getElementById("formLimpeza").addEventListener("submit", async evento => {
      evento.preventDefault();
      const opcao = document.getElementById("limpezaPeriodo").value;
      const dataLimite = opcao === "data" ? document.getElementById("limpezaData").value : calcularDataLimpeza(opcao);
      if (!dataLimite) return alert("Escolha a data limite.");
      if (!confirm(`Excluir definitivamente todos os lançamentos anteriores a ${formatarData(dataLimite)}?`)) return;
      await excluirLancamentosAnteriores(dataLimite);
      alert("Dados antigos excluídos.");
    });
}
