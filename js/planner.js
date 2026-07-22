let estado={meses:[],categorias:[],cartoes:[],lancamentos:[]};

function lerFiltros(){
  return {
    busca:document.getElementById('filtroBusca').value.trim().toLowerCase(),
    categoria:document.getElementById('filtroCategoria').value,
    cartao:document.getElementById('filtroCartao').value,
    natureza:document.getElementById('filtroNatureza').value,
    tipo:document.getElementById('filtroTipo').value,
    status:document.getElementById('filtroStatus').value
  };
}

function aplicarFiltros(lista){
  const f=lerFiltros();
  return lista.filter(i=>{
    const s=normalizarStatus(i);
    return (!f.busca||String(i.descricao||'').toLowerCase().includes(f.busca))
      &&(!f.categoria||String(i.categoria_id||'')===f.categoria)
      &&(!f.cartao||String(i.cartao_id||'')===f.cartao)
      &&(!f.natureza||i.natureza===f.natureza)
      &&(!f.tipo||i.tipo===f.tipo)
      &&(!f.status||s===f.status);
  });
}

function agrupar(lista){
  const mapa=new Map();
  for(const i of lista){
    const k=[i.natureza,i.tipo,i.categoria_id||'',i.descricao,i.cartao_id||'',i.vencimento?i.vencimento.slice(8,10):''].join('|');
    if(!mapa.has(k)) mapa.set(k,{
      venc:i.vencimento?i.vencimento.slice(8,10):'-',
      natureza:i.natureza,
      tipo:i.tipo,
      categoria:i.categorias?.nome||'Sem categoria',
      categoriaCor:i.categorias?.cor||'#94a3b8',
      descricao:i.descricao,
      cartao:i.cartoes?.nome||'-',
      meses:{}
    });
    mapa.get(k).meses[chaveMes(i.competencia)]=i;
  }
  return [...mapa.values()];
}

function totalMes(lista,mes){
  const itens=lista.filter(i=>chaveMes(i.competencia)===mes&&i.status!=='cancelado');
  const entradas=itens.filter(i=>i.natureza==='entrada').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  const saidas=itens.filter(i=>i.natureza==='saida').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  const nubank=itens.filter(i=>i.cartoes?.nome==='Nubank').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  const itau=itens.filter(i=>i.cartoes?.nome==='Itaú').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  return {entradas,saidas,nubank,itau,saldo:entradas-saidas};
}

function renderResumo(lista){
  const ePrev=lista.filter(i=>i.natureza==='entrada'&&i.status!=='cancelado').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  const sPrev=lista.filter(i=>i.natureza==='saida'&&i.status!=='cancelado').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  const eReal=lista.filter(i=>i.natureza==='entrada').reduce((s,i)=>s+Number(i.valor_realizado||0),0);
  const sReal=lista.filter(i=>i.natureza==='saida').reduce((s,i)=>s+Number(i.valor_realizado||0),0);
  const nubank=lista.filter(i=>i.cartoes?.nome==='Nubank'&&i.status!=='cancelado').reduce((s,i)=>s+Number(i.valor_previsto||0),0);
  const itau=lista.filter(i=>i.cartoes?.nome==='Itaú'&&i.status!=='cancelado').reduce((s,i)=>s+Number(i.valor_previsto||0),0);

  document.getElementById('resumoGeral').innerHTML=`
    <div class="summary-card entrada"><span>Entradas previstas</span><strong>${moeda(ePrev)}</strong></div>
    <div class="summary-card saida"><span>Despesas previstas</span><strong>${moeda(sPrev)}</strong></div>
    <div class="summary-card realizado"><span>Saldo realizado</span><strong>${moeda(eReal-sReal)}</strong></div>
    <div class="summary-card saldo"><span>Saldo previsto</span><strong>${moeda(ePrev-sPrev)}</strong></div>
    <div class="summary-card nubank"><span>Total Nubank</span><strong>${moeda(nubank)}</strong></div>
    <div class="summary-card itau"><span>Total Itaú</span><strong>${moeda(itau)}</strong></div>`;
}

function addCell(grid,html,classes=''){
  const el=document.createElement('div');
  el.className=`cell ${classes}`.trim();
  el.innerHTML=html;
  grid.appendChild(el);
}

function renderPlanner(){
  const lista=aplicarFiltros(estado.lancamentos);
  const linhas=agrupar(lista);
  const grid=document.getElementById('plannerGrid');
  grid.innerHTML='';

  const headers=[
    ['Venc.','fixed header-cell c0'],
    ['Natureza','fixed header-cell c1'],
    ['Tipo','fixed header-cell c2'],
    ['Categoria','fixed header-cell c3'],
    ['Descrição','fixed header-cell c4'],
    ['Cartão','fixed header-cell c5']
  ];

  headers.forEach(([t,c])=>addCell(grid,t,c));
  estado.meses.forEach(m=>addCell(grid,nomeMes(m),'header-cell'));

  if(!linhas.length){
    addCell(grid,'Nenhum lançamento encontrado.','empty-month');
    for(let i=1;i<6+estado.meses.length;i++) addCell(grid,'','');
  } else {
    linhas.forEach(l=>{
      addCell(grid,escapeHtml(l.venc),'fixed row-fixed c0');
      addCell(grid,l.natureza==='entrada'?'Entrada':'Saída','fixed row-fixed c1');
      addCell(grid,l.tipo==='fixo'?'Fixo':'Variável','fixed row-fixed c2');
      addCell(grid,`<span class="category-chip"><span class="category-dot" style="background:${escapeHtml(l.categoriaCor)}"></span>${escapeHtml(l.categoria)}</span>`,'fixed row-fixed c3');
      addCell(grid,escapeHtml(l.descricao),'fixed row-fixed c4');
      addCell(grid,escapeHtml(l.cartao),'fixed row-fixed c5');

      estado.meses.forEach(m=>{
        const i=l.meses[m];
        if(!i){
          addCell(grid,'—','empty-month');
          return;
        }
        const s=normalizarStatus(i);
        const v=i.valor_realizado??i.valor_previsto;
        addCell(grid,`<div class="month-box ${s}" data-id="${i.id}"><strong>${moeda(v)}</strong><small>${s}</small></div>`);
      });
    });
  }

  const totais=estado.meses.map(m=>totalMes(lista,m));
  [['Entradas previstas','entradas'],['Despesas previstas','saidas'],['Total Nubank','nubank'],['Total Itaú','itau'],['Saldo previsto','saldo']]
    .forEach(([rotulo,chave])=>{
      addCell(grid,rotulo,'fixed total-label total-sticky c0');
      addCell(grid,'','fixed total-cell total-sticky c1');
      addCell(grid,'','fixed total-cell total-sticky c2');
      addCell(grid,'','fixed total-cell total-sticky c3');
      addCell(grid,'','fixed total-cell total-sticky c4');
      addCell(grid,'','fixed total-cell total-sticky c5');
      totais.forEach(t=>addCell(grid,moeda(t[chave]),'total-cell total-sticky'));
    });

  document.querySelectorAll('.month-box[data-id]').forEach(el=>{
    el.addEventListener('click',()=>abrirEdicao(Number(el.dataset.id)));
  });

  renderResumo(lista);
}

function preencherSelects(){
  const cf=document.getElementById('filtroCategoria');
  const cform=document.getElementById('categoriaId');
  const tf=document.getElementById('filtroCartao');
  const tform=document.getElementById('cartaoId');

  cf.innerHTML='<option value="">Todas as categorias</option>';
  cform.innerHTML='<option value="">Sem categoria</option>';
  tf.innerHTML='<option value="">Todos os cartões</option>';
  tform.innerHTML='<option value="">Sem cartão</option>';

  estado.categorias.forEach(c=>{
    const o=`<option value="${c.id}">${escapeHtml(c.nome)}</option>`;
    cf.insertAdjacentHTML('beforeend',o);
    cform.insertAdjacentHTML('beforeend',o);
  });

  estado.cartoes.forEach(c=>{
    const o=`<option value="${c.id}">${escapeHtml(c.nome)}</option>`;
    tf.insertAdjacentHTML('beforeend',o);
    tform.insertAdjacentHTML('beforeend',o);
  });
}

async function carregarPlanejamento(){
  estado.meses=mesesAPartirDoAtual(12);
  [estado.categorias,estado.cartoes,estado.lancamentos]=await Promise.all([
    buscarCategorias(),
    buscarCartoes(),
    buscarLancamentos(estado.meses)
  ]);
  preencherSelects();
  renderPlanner();
}

function abrirEdicao(id){
  const i=estado.lancamentos.find(x=>x.id===id);
  if(!i)return;

  document.getElementById('modalTitulo').textContent='Editar lançamento';
  document.getElementById('lancamentoId').value=i.id;
  document.getElementById('natureza').value=i.natureza;
  document.getElementById('tipo').value=i.tipo;
  document.getElementById('categoriaId').value=i.categoria_id||'';
  document.getElementById('cartaoId').value=i.cartao_id||'';
  document.getElementById('descricao').value=i.descricao||'';
  document.getElementById('competencia').value=chaveMes(i.competencia);
  document.getElementById('vencimento').value=i.vencimento||'';
  document.getElementById('valorPrevisto').value=i.valor_previsto||0;
  document.getElementById('status').value=i.status||'pendente';
  document.getElementById('valorRealizado').value=i.valor_realizado??'';
  document.getElementById('dataRealizacao').value=i.data_realizacao||'';
  document.getElementById('parcelaAtual').value=i.parcela_atual??'';
  document.getElementById('totalParcelas').value=i.total_parcelas??'';
  document.getElementById('observacao').value=i.observacao||'';
  document.getElementById('btnExcluir').hidden=false;
  document.getElementById('modalLancamento').hidden=false;
}
