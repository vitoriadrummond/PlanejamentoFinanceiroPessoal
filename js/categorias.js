function abrirModalCategoria(id=null){
  const i=id?estado.categorias.find(x=>x.id===id):null;
  abrirModal(i?'Editar categoria':'Nova categoria',`
    <form id="formCategoria" class="form-grid">
      <label class="span-2">Nome<input id="catNome" required></label>
      <label>Cor<input id="catCor" type="color"></label>
      <label>Ativa<select id="catAtivo"><option value="true">Sim</option><option value="false">Não</option></select></label>
      <div class="form-actions span-2">${i?'<button id="btnExcluirCategoria" class="btn danger" type="button">Excluir</button>':''}<div class="spacer"></div><button class="btn secondary" type="button" onclick="fecharModal()">Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </form>`);
  document.getElementById('catNome').value=i?.nome||'';document.getElementById('catCor').value=i?.cor||'#94a3b8';document.getElementById('catAtivo').value=String(i?.ativo??true);
  document.getElementById('formCategoria').addEventListener('submit',async e=>{e.preventDefault();const o={nome:document.getElementById('catNome').value.trim(),cor:document.getElementById('catCor').value,ativo:document.getElementById('catAtivo').value==='true'};if(i)await atualizarCategoria(i.id,o);else await inserirCategoria(o);fecharModal();await paginaCategorias()});
  document.getElementById('btnExcluirCategoria')?.addEventListener('click',async()=>{if(confirm('Excluir esta categoria?')){await excluirCategoria(i.id);fecharModal();await paginaCategorias()}});
}
async function paginaCategorias(){
  setTitulo('Categorias','Organização das entradas, despesas e cartões');
  setAcaoPrincipal('+ Nova categoria',()=>abrirModalCategoria());
  estado.categorias=await buscarCategorias();
  document.getElementById('app').innerHTML=`<section class="panel"><div class="panel-header"><div><h2>Categorias</h2><p>${estado.categorias.length} categoria(s)</p></div></div>${estado.categorias.length?`<div class="card-list">${estado.categorias.map(i=>`<article class="info-card"><h3><span class="category-dot" style="display:inline-block;background:${escapeHtml(i.cor||'#94a3b8')}"></span> ${escapeHtml(i.nome)}</h3><p>Status: ${i.ativo?'Ativa':'Inativa'}</p><button class="mini-btn edit" onclick="abrirModalCategoria(${i.id})">Editar</button></article>`).join('')}</div>`:'<p class="msg">Nenhuma categoria cadastrada.</p>'}</section>`;
}
