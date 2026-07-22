function moeda(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function dataISOHoje(){const h=new Date();return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`}
function competenciaAtual(){const h=new Date();return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`}
function competenciaParaData(c){return `${c}-01`}
function chaveMes(d){return String(d||'').slice(0,7)}
function nomeMes(c){const[a,m]=c.split('-').map(Number);return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'2-digit'}).format(new Date(a,m-1,1)).replace('.','')}
function mesesAPartirDoAtual(q=12){const h=new Date(),r=[];for(let i=0;i<q;i++){const d=new Date(h.getFullYear(),h.getMonth()+i,1);r.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}return r}
function escapeHtml(t){return String(t??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
function normalizarStatus(i){if(i.status==='pendente'&&i.vencimento&&i.vencimento<dataISOHoje())return'atrasado';return i.status||'pendente'}
