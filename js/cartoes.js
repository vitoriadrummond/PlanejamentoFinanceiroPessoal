function abrirModalCartao(id=null){
  const i=id?estado.cartoes.find(x=>x.id===id):null;
  abrirModal(i?'Editar cartão':'Novo cartão',`
    <form id="formCartao" class="form-grid">
      <label class="span-2">Nome<input id="cNome" required></label>
      <label>Dia de fechamento<input id="cFechamento" type="number" min="1" max="31"></label>
      <label>Dia de vencimento<input id="cVencimento" type="number" min="1" max="31"></label>
      <label>Ativo<select id="cAtivo"><option value="true">Sim</option><option value="false">Não</option></select></label>
      <div class="form-actions span-2">${i?'<button id="btnExcluirCartao" class="btn danger" type="button">Excluir</button>':''}<div class="spacer"></div><button class="btn secondary" type="button" onclick="fecharModal()">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </form>`);
  document.getElementById('cNome').value=i?.nome||'';document.getElementById('cFechamento').value=i?.dia_fechamento??'';document.getElementById('cVencimento').value=i?.dia_vencimento??'';document.getElementById('cAtivo').value=String(i?.ativo??true);
  document.getElementById('formCartao').addEventListener('submit',async e=>{e.preventDefault();const o={nome:document.getElementById('cNome').value.trim(),dia_fechamento:document.getElementById('cFechamento').value?Number(document.getElementById('cFechamento').value):null,dia_vencimento:document.getElementById('cVencimento').value?Number(document.getElementById('cVencimento').value):null,ativo:document.getElementById('cAtivo').value==='true'};if(i)await atualizarCartao(i.id,o);else await inserirCartao(o);fecharModal();await paginaCartoes()});
  document.getElementById('btnExcluirCartao')?.addEventListener('click',async()=>{if(confirm('Excluir este cartão?')){await excluirCartao(i.id);fecharModal();await paginaCartoes()}});
}

function somarMesCompetencia(competencia, quantidade) {
  const [ano, mes] = competencia.split('-').map(Number);
  const data = new Date(ano, mes - 1 + quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

async function abrirFaturaCartao(cartaoId, competencia = new Date().toISOString().slice(0,7)) {
  const cartao = estado.cartoes.find(item => String(item.id) === String(cartaoId));
  if (!cartao) return;

  abrirModal(`Fatura — ${cartao.nome}`, `<p class="msg">Carregando fatura...</p>`);

  try {
    const lancamentos = await buscarLancamentos([competencia]);
    const itens = lancamentos.filter(item =>
      String(item.cartao_id) === String(cartaoId) &&
      item.natureza === 'saida' &&
      item.status !== 'cancelado'
    );
    const total = itens.reduce((soma, item) => soma + Number(item.valor_previsto || 0), 0);

    document.getElementById('modalConteudo').innerHTML = `
      <div class="invoice-toolbar">
        <button class="btn secondary small" type="button" id="faturaAnterior">←</button>
        <label>Competência<input id="faturaCompetencia" type="month" value="${competencia}"></label>
        <button class="btn secondary small" type="button" id="faturaProxima">→</button>
      </div>
      <div class="summary-card invoice-total"><span>Total da fatura</span><strong>${moeda(total)}</strong></div>
      ${itens.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Parcela</th><th>Valor</th></tr></thead><tbody>${itens.map(item => `<tr><td>${formatarData(item.vencimento || item.data_realizacao)}</td><td>${escapeHtml(item.descricao || item.categorias?.nome || 'Compra')}</td><td>${item.total_parcelas ? `${item.parcela_atual || 1}/${item.total_parcelas}` : '—'}</td><td>${moeda(item.valor_previsto || 0)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="msg">Nenhuma compra encontrada nesta fatura.</p>'}
      <div class="form-actions"><button class="btn secondary" type="button" onclick="fecharModal()">Fechar</button></div>
    `;

    document.getElementById('faturaCompetencia').addEventListener('change', e => abrirFaturaCartao(cartaoId, e.target.value));
    document.getElementById('faturaAnterior').addEventListener('click', () => abrirFaturaCartao(cartaoId, somarMesCompetencia(competencia, -1)));
    document.getElementById('faturaProxima').addEventListener('click', () => abrirFaturaCartao(cartaoId, somarMesCompetencia(competencia, 1)));
  } catch (erro) {
    console.error(erro);
    document.getElementById('modalConteudo').innerHTML = `<p class="msg">Não foi possível carregar a fatura: ${escapeHtml(erro.message)}</p>`;
  }
}

async function paginaCartoes(){
  setTitulo('Cartões','Nubank, Itaú e outros cartões');
  setAcaoPrincipal('+ Novo cartão',()=>abrirModalCartao());
  estado.cartoes=await buscarCartoes();
  document.getElementById('app').innerHTML=`<section class="panel"><div class="panel-header"><div><h2>Cartões</h2><p>${estado.cartoes.length} cartão(ões)</p></div></div>${estado.cartoes.length?`<div class="card-list">${estado.cartoes.map(i=>`<article class="info-card"><h3>💳 ${escapeHtml(i.nome)}</h3><p>Fechamento: ${i.dia_fechamento||'-'}</p><p>Vencimento: ${i.dia_vencimento||'-'}</p><p>Status: ${i.ativo?'Ativo':'Inativo'}</p><div class="card-actions"><button class="mini-btn" onclick="abrirFaturaCartao(${i.id})">Ver fatura</button><button class="mini-btn edit" onclick="abrirModalCartao(${i.id})">Editar</button></div></article>`).join('')}</div>`:'<p class="msg">Nenhum cartão cadastrado.</p>'}</section>`;
}
