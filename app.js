// ============================================================
// SISTEMA AÇAÍ — lógica principal
// ============================================================

// ---------- estado em memória ----------
let funcionarios = [];
let materiais = [];
let movimentacoes = [];
let produtos = [];
let produtoInsumosMap = {}; // produto_id -> [{id, material_id, qtd_consumida, material_nome, unidade}]
let clientes = [];
let vendas = [];
let financeiro = [];

let pedidoAtual = [];           // [{produto_id, nome, categoria, preco, qtd}]
let clienteSelecionadoId = null;
let clienteSelecionadoNome = null;

// ============================================================
// HELPERS
// ============================================================
function val(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function formatMoney(v){
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDateTime(iso){
  if(!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function formatDate(iso){
  if(!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}
function daysSince(iso){
  if(!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
}
function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toast(msg, tipo){
  const el = document.createElement('div');
  el.className = 'toast' + (tipo === 'erro' ? ' erro' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
function mesAtualISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function isMesAtual(iso){
  return (iso || '').slice(0,7) === mesAtualISO();
}

// modal genérico
function showModal(title, innerHtml){
  fecharModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box">
      <div class="modal-head"><h3>${title}</h3><button class="modal-close" onclick="fecharModal()">✕</button></div>
      ${innerHtml}
    </div>`;
  overlay.addEventListener('click', (e) => { if(e.target === overlay) fecharModal(); });
  document.body.appendChild(overlay);
}
function fecharModal(){
  const el = document.getElementById('modal-overlay');
  if(el) el.remove();
}
window.fecharModal = fecharModal;

function funcionarioAtivoAtual(){
  const id = document.getElementById('select-funcionario-ativo').value;
  const f = funcionarios.find(x => x.id === id);
  return { id: id || null, nome: f ? f.nome : null };
}

function emojiForProduto(nome, categoria){
  const n = (nome || '').toLowerCase();
  if(categoria === 'acai') return '🍧';
  if(n.includes('morango')) return '🍓';
  if(n.includes('banana')) return '🍌';
  if(n.includes('granola')) return '🥣';
  if(n.includes('condensado')) return '🥛';
  if(n.includes('leite em p')) return '🥛';
  if(n.includes('chocolate') || n.includes('nutella')) return '🍫';
  if(n.includes('paçoca') || n.includes('pacoca')) return '🥜';
  if(n.includes('kiwi')) return '🥝';
  if(n.includes('uva')) return '🍇';
  if(n.includes('mel')) return '🍯';
  if(n.includes('amendoim')) return '🥜';
  return '➕';
}
function iconeProduto(p){
  return (p.icone && p.icone.trim()) ? p.icone.trim() : emojiForProduto(p.nome, p.categoria);
}
const EMOJIS_SUGERIDOS = ['🍧','🍨','🍇','🍓','🍌','🥝','🍍','🥭','🍒','🥣','🥛','🍫','🍯','🥜','🍪','🌰','🍬','🧁','🍦','➕'];
function renderIconPicker(containerId, inputId){
  const cont = document.getElementById(containerId);
  if(!cont) return;
  cont.innerHTML = EMOJIS_SUGERIDOS.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
  cont.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(inputId).value = btn.dataset.emoji;
      cont.querySelectorAll('button').forEach(b => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');
    });
  });
}

function normalizarWhatsapp(numero){
  let n = (numero || '').replace(/\D/g, '');
  if(!n) return null;
  if(!n.startsWith('55')) n = '55' + n;
  return n;
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
const TITULOS = {
  dashboard:   ['Visão geral', 'Resumo do dia, do mês e do que precisa de atenção.'],
  pdv:         ['Vender (PDV)', 'Monte o pedido do cliente e finalize a venda.'],
  estoque:     ['Estoque', 'Cadastre materiais, registre entradas/saídas e acompanhe o estoque mínimo.'],
  produtos:    ['Produtos & preços', 'Cadastre os produtos vendidos no PDV e o que cada um consome do estoque.'],
  financeiro:  ['Financeiro', 'Controle as entradas e saídas de dinheiro do caixa.'],
  clientes:    ['Clientes', 'Cadastre clientes e acompanhe quem não compra há alguns dias.'],
  relatorios:  ['Relatórios', 'Faturamento mensal, estoque baixo e exportação em PDF.'],
  funcionarios:['Funcionários', 'Cadastre quem trabalha no caixa.'],
};

function setupNav(){
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const secao = btn.dataset.section;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-' + secao).classList.add('active');
      const [titulo, sub] = TITULOS[secao];
      document.getElementById('page-title').textContent = titulo;
      document.getElementById('page-subtitle').textContent = sub;
      if(secao === 'relatorios') renderRelatorios();
      if(window.innerWidth <= 760) fecharSidebar();
    });
  });
}
function abrirSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function fecharSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}
function setupHamburger(){
  document.getElementById('btn-hamburger').addEventListener('click', abrirSidebar);
  document.getElementById('overlay').addEventListener('click', fecharSidebar);
}

// ============================================================
// FUNCIONÁRIOS
// ============================================================
async function loadFuncionarios(){
  const { data, error } = await supabaseClient.from('funcionarios').select('*').order('nome');
  if(error){ toast('Erro ao carregar funcionários: ' + error.message, 'erro'); return; }
  funcionarios = data || [];
  renderFuncionarios();
  renderSelectFuncionarioAtivo();
}
function renderSelectFuncionarioAtivo(){
  const sel = document.getElementById('select-funcionario-ativo');
  const salvo = localStorage.getItem('funcionarioAtivoId') || '';
  sel.innerHTML = '<option value="">Selecione...</option>' +
    funcionarios.filter(f => f.ativo).map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
  if(salvo && funcionarios.some(f => f.id === salvo && f.ativo)) sel.value = salvo;
  sel.onchange = () => localStorage.setItem('funcionarioAtivoId', sel.value);
}
function renderFuncionarios(){
  document.getElementById('count-funcionarios').textContent = funcionarios.length;
  const tbody = document.getElementById('tbody-funcionarios');
  if(!funcionarios.length){
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state">Nenhum funcionário cadastrado ainda.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = funcionarios.map(f => `
    <tr>
      <td>${escapeHtml(f.nome)}</td>
      <td><span class="badge ${f.ativo ? 'badge-ativo' : 'badge-inativo'}">${f.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td class="row-actions">
        <button class="btn-small" onclick="toggleFuncionarioAtivo('${f.id}', ${f.ativo})">${f.ativo ? 'Desativar' : 'Ativar'}</button>
        <button class="btn-danger" onclick="excluirFuncionario('${f.id}')">Excluir</button>
      </td>
    </tr>`).join('');
}
async function toggleFuncionarioAtivo(id, ativoAtual){
  const { error } = await supabaseClient.from('funcionarios').update({ ativo: !ativoAtual }).eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  await loadFuncionarios();
}
window.toggleFuncionarioAtivo = toggleFuncionarioAtivo;
async function excluirFuncionario(id){
  if(!confirm('Excluir este funcionário?')) return;
  const { error } = await supabaseClient.from('funcionarios').delete().eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  toast('Funcionário excluído.');
  await loadFuncionarios();
}
window.excluirFuncionario = excluirFuncionario;

// ============================================================
// MATERIAIS (estoque)
// ============================================================
async function loadMateriais(){
  const { data, error } = await supabaseClient.from('materiais').select('*').order('nome');
  if(error){ toast('Erro ao carregar materiais: ' + error.message, 'erro'); return; }
  materiais = data || [];
  renderMateriais();
  populateMovMaterialSelect();
}
function statusMaterial(m){
  const atual = Number(m.qtd_atual), min = Number(m.estoque_minimo);
  if(atual <= 0) return { classe: 'badge-zerado', texto: 'Zerado' };
  if(atual <= min) return { classe: 'badge-baixo', texto: 'Baixo' };
  return { classe: 'badge-ok', texto: 'OK' };
}
function renderMateriais(filtro){
  filtro = (filtro || val('busca-materiais') || '').toLowerCase();
  document.getElementById('count-materiais').textContent = materiais.length;
  const filtrados = materiais.filter(m => {
    const st = statusMaterial(m).texto.toLowerCase();
    return !filtro || m.nome.toLowerCase().includes(filtro) || (m.categoria || '').toLowerCase().includes(filtro) || st.includes(filtro);
  });
  const tbody = document.getElementById('tbody-materiais');
  if(!filtrados.length){
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Nenhum material encontrado.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtrados.map(m => {
    const st = statusMaterial(m);
    return `<tr>
      <td>${escapeHtml(m.nome)}</td>
      <td>${escapeHtml(m.categoria || '-')}</td>
      <td>${Number(m.qtd_atual)} ${escapeHtml(m.unidade || '')}</td>
      <td>${Number(m.estoque_minimo)} ${escapeHtml(m.unidade || '')}</td>
      <td><span class="badge ${st.classe}">${st.texto}</span></td>
      <td class="row-actions">
        <button class="btn-small" onclick="editarMaterial('${m.id}')">Editar</button>
        <button class="btn-danger" onclick="excluirMaterial('${m.id}')">Excluir</button>
      </td>
    </tr>`;
  }).join('');
}
function editarMaterial(id){
  const m = materiais.find(x => x.id === id); if(!m) return;
  showModal('Editar material', `
    <div class="field"><label>Nome</label><input id="edit-mat-nome" value="${escapeHtml(m.nome)}"></div>
    <div class="field-row">
      <div class="field"><label>Categoria</label><input id="edit-mat-categoria" value="${escapeHtml(m.categoria || '')}"></div>
      <div class="field"><label>Unidade</label><input id="edit-mat-unidade" value="${escapeHtml(m.unidade || '')}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Qtd. atual</label><input type="number" step="0.01" id="edit-mat-qtd" value="${m.qtd_atual}"></div>
      <div class="field"><label>Estoque mínimo</label><input type="number" step="0.01" id="edit-mat-min" value="${m.estoque_minimo}"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="salvarEdicaoMaterial('${id}')">Salvar</button>
  `);
}
window.editarMaterial = editarMaterial;
async function salvarEdicaoMaterial(id){
  const payload = {
    nome: val('edit-mat-nome'),
    categoria: val('edit-mat-categoria'),
    unidade: val('edit-mat-unidade'),
    qtd_atual: parseFloat(val('edit-mat-qtd')) || 0,
    estoque_minimo: parseFloat(val('edit-mat-min')) || 0,
  };
  const { error } = await supabaseClient.from('materiais').update(payload).eq('id', id);
  if(error){ toast('Erro ao salvar: ' + error.message, 'erro'); return; }
  fecharModal(); toast('Material atualizado!');
  await loadMateriais(); recalcDashboard();
}
window.salvarEdicaoMaterial = salvarEdicaoMaterial;
async function excluirMaterial(id){
  if(!confirm('Excluir este material? Isso também remove vínculos de ficha técnica que o usam.')) return;
  const { error } = await supabaseClient.from('materiais').delete().eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  toast('Material excluído.');
  await loadMateriais(); await loadProdutoInsumos(); recalcDashboard();
}
window.excluirMaterial = excluirMaterial;

function populateMovMaterialSelect(){
  const sel = document.getElementById('mov-material');
  const atual = sel.value;
  sel.innerHTML = '<option value="">Selecione...</option>' +
    materiais.map(m => `<option value="${m.id}">${escapeHtml(m.nome)} (${escapeHtml(m.unidade)})</option>`).join('');
  if(atual) sel.value = atual;
}

// ---------- movimentações de estoque ----------
async function loadMovimentacoes(){
  const { data, error } = await supabaseClient.from('movimentacoes_estoque').select('*').order('created_at', { ascending: false }).limit(200);
  if(error){ toast('Erro ao carregar movimentações: ' + error.message, 'erro'); return; }
  movimentacoes = data || [];
  renderMovimentacoes();
}
function renderMovimentacoes(){
  document.getElementById('count-movimentacoes').textContent = movimentacoes.length;
  const tbody = document.getElementById('tbody-movimentacoes');
  if(!movimentacoes.length){
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Nenhuma movimentação registrada ainda.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = movimentacoes.map(m => `
    <tr>
      <td>${formatDateTime(m.created_at)}</td>
      <td>${escapeHtml(m.material_nome || '-')}</td>
      <td><span class="badge ${m.tipo === 'entrada' ? 'badge-ok' : 'badge-inativo'}">${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td>${Number(m.qtd)}</td>
      <td>${escapeHtml(m.funcionario_nome || '-')}</td>
      <td>${escapeHtml(m.observacao || '-')}</td>
      <td class="row-actions"><button class="btn-danger" onclick="excluirMovimentacao('${m.id}')">Excluir</button></td>
    </tr>`).join('');
}
async function excluirMovimentacao(id){
  const m = movimentacoes.find(x => x.id === id); if(!m) return;
  if(!confirm('Excluir esta movimentação? A quantidade em estoque será revertida.')) return;
  if(m.material_id){
    const material = materiais.find(x => x.id === m.material_id);
    if(material){
      const ajuste = m.tipo === 'entrada' ? -Number(m.qtd) : Number(m.qtd);
      const novaQtd = Number(material.qtd_atual) + ajuste;
      await supabaseClient.from('materiais').update({ qtd_atual: novaQtd }).eq('id', material.id);
    }
  }
  const { error } = await supabaseClient.from('movimentacoes_estoque').delete().eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  toast('Movimentação excluída e estoque revertido.');
  await Promise.all([loadMateriais(), loadMovimentacoes()]);
  recalcDashboard();
}
window.excluirMovimentacao = excluirMovimentacao;

// ============================================================
// PRODUTOS DE VENDA + FICHA TÉCNICA
// ============================================================
async function loadProdutos(){
  const { data, error } = await supabaseClient.from('produtos_venda').select('*').order('ordem').order('nome');
  if(error){ toast('Erro ao carregar produtos: ' + error.message, 'erro'); return; }
  produtos = data || [];
  renderProdutos();
  renderPDVGrids();
}
async function loadProdutoInsumos(){
  const { data, error } = await supabaseClient.from('produto_insumos').select('*, materiais(nome, unidade)');
  if(error){ toast('Erro ao carregar fichas técnicas: ' + error.message, 'erro'); return; }
  produtoInsumosMap = {};
  (data || []).forEach(row => {
    if(!produtoInsumosMap[row.produto_id]) produtoInsumosMap[row.produto_id] = [];
    produtoInsumosMap[row.produto_id].push({
      id: row.id,
      material_id: row.material_id,
      qtd_consumida: row.qtd_consumida,
      material_nome: row.materiais ? row.materiais.nome : '(material removido)',
      unidade: row.materiais ? row.materiais.unidade : '',
    });
  });
}
function renderProdutos(){
  document.getElementById('count-produtos').textContent = produtos.length;
  const tbody = document.getElementById('tbody-produtos');
  if(!produtos.length){
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">Nenhum produto cadastrado ainda.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td>${iconeProduto(p)} ${escapeHtml(p.nome)}</td>
      <td><span class="badge badge-neutro">${p.categoria === 'acai' ? 'Tamanho de açaí' : 'Complemento'}</span></td>
      <td>${formatMoney(p.preco)}</td>
      <td class="row-actions">
        <button class="btn-small" onclick="abrirFichaTecnica('${p.id}')">Ficha técnica</button>
        <button class="btn-small" onclick="editarProduto('${p.id}')">Editar</button>
        <button class="btn-danger" onclick="excluirProduto('${p.id}')">Excluir</button>
      </td>
    </tr>`).join('');
}
function editarProduto(id){
  const p = produtos.find(x => x.id === id); if(!p) return;
  showModal('Editar produto', `
    <div class="field"><label>Nome</label><input id="edit-prod-nome" value="${escapeHtml(p.nome)}"></div>
    <div class="field-row">
      <div class="field"><label>Categoria</label>
        <select id="edit-prod-categoria">
          <option value="acai" ${p.categoria === 'acai' ? 'selected' : ''}>Tamanho de açaí</option>
          <option value="complemento" ${p.categoria === 'complemento' ? 'selected' : ''}>Complemento</option>
        </select>
      </div>
      <div class="field"><label>Preço (R$)</label><input type="number" step="0.01" id="edit-prod-preco" value="${p.preco}"></div>
    </div>
    <div class="field">
      <label>Ícone</label>
      <input type="text" id="edit-prod-icone" value="${escapeHtml(p.icone || '')}" maxlength="4">
      <div class="icon-picker" id="icon-picker-editar"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="salvarEdicaoProduto('${id}')">Salvar</button>
  `);
  renderIconPicker('icon-picker-editar', 'edit-prod-icone');
}
window.editarProduto = editarProduto;
async function salvarEdicaoProduto(id){
  const payload = {
    nome: val('edit-prod-nome'),
    categoria: val('edit-prod-categoria'),
    preco: parseFloat(val('edit-prod-preco')) || 0,
    icone: val('edit-prod-icone') || null,
  };
  const { error } = await supabaseClient.from('produtos_venda').update(payload).eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  fecharModal(); toast('Produto atualizado!');
  await loadProdutos();
}
window.salvarEdicaoProduto = salvarEdicaoProduto;
async function excluirProduto(id){
  if(!confirm('Excluir este produto? A ficha técnica dele também será removida.')) return;
  const { error } = await supabaseClient.from('produtos_venda').delete().eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  toast('Produto excluído.');
  await Promise.all([loadProdutos(), loadProdutoInsumos()]);
}
window.excluirProduto = excluirProduto;

function abrirFichaTecnica(produtoId){
  const p = produtos.find(x => x.id === produtoId); if(!p) return;
  const insumos = produtoInsumosMap[produtoId] || [];
  const linhas = insumos.length
    ? insumos.map(i => `
        <div class="insumo-row">
          <span>${escapeHtml(i.material_nome)} — ${Number(i.qtd_consumida)} ${escapeHtml(i.unidade || '')}</span>
          <button class="btn-danger" onclick="removerInsumo('${i.id}','${produtoId}')">Remover</button>
        </div>`).join('')
    : '<p style="font-size:13px;color:var(--texto-suave);">Nenhum material vinculado ainda.</p>';

  const opcoesMateriais = materiais.length
    ? materiais.map(m => `<option value="${m.id}">${escapeHtml(m.nome)} (${escapeHtml(m.unidade)})</option>`).join('')
    : '<option value="">Cadastre um material primeiro</option>';

  showModal(`Ficha técnica — ${escapeHtml(p.nome)}`, `
    <p style="font-size:12.5px;color:var(--texto-suave); margin-bottom:12px;">O que este produto consome do estoque a cada unidade vendida:</p>
    <div id="lista-insumos-modal">${linhas}</div>
    <hr style="border:none;border-top:1px solid var(--card-border); margin:16px 0;">
    <div class="field-row">
      <div class="field"><label>Material</label><select id="novo-insumo-material">${opcoesMateriais}</select></div>
      <div class="field"><label>Qtd. consumida</label><input type="number" step="0.01" id="novo-insumo-qtd" value="1"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="adicionarInsumo('${produtoId}')">Adicionar material</button>
  `);
}
window.abrirFichaTecnica = abrirFichaTecnica;
async function adicionarInsumo(produtoId){
  const materialId = val('novo-insumo-material');
  const qtd = parseFloat(val('novo-insumo-qtd')) || 1;
  if(!materialId){ toast('Selecione um material', 'erro'); return; }
  const { error } = await supabaseClient.from('produto_insumos').insert({ produto_id: produtoId, material_id: materialId, qtd_consumida: qtd });
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  await loadProdutoInsumos();
  abrirFichaTecnica(produtoId);
  toast('Material vinculado ao produto!');
}
window.adicionarInsumo = adicionarInsumo;
async function removerInsumo(insumoId, produtoId){
  await supabaseClient.from('produto_insumos').delete().eq('id', insumoId);
  await loadProdutoInsumos();
  abrirFichaTecnica(produtoId);
}
window.removerInsumo = removerInsumo;

// ============================================================
// PDV
// ============================================================
function temFichaTecnica(produtoId){
  return !!(produtoInsumosMap[produtoId] && produtoInsumosMap[produtoId].length);
}
function renderPDVGrids(){
  const gridAcai = document.getElementById('grid-acai');
  const gridComp = document.getElementById('grid-complemento');
  const acais = produtos.filter(p => p.categoria === 'acai' && p.ativo !== false);
  const complementos = produtos.filter(p => p.categoria === 'complemento' && p.ativo !== false);

  const botaoProduto = (p, classeExtra) => `
    <button type="button" class="produto-btn ${classeExtra || ''}" data-id="${p.id}" title="${temFichaTecnica(p.id) ? '' : 'Este produto não desconta estoque — configure a ficha técnica em Produtos & preços'}">
      ${temFichaTecnica(p.id) ? '' : '<span class="sem-ficha-badge">⚠</span>'}
      <span class="emoji">${iconeProduto(p)}</span>
      <span class="nome">${escapeHtml(p.nome)}</span>
      <span class="preco">${formatMoney(p.preco)}</span>
    </button>`;

  gridAcai.innerHTML = acais.length ? acais.map(p => botaoProduto(p)).join('')
    : '<div class="empty-state">Cadastre tamanhos de açaí na aba "Produtos &amp; preços".</div>';

  gridComp.innerHTML = complementos.length ? complementos.map(p => botaoProduto(p, 'tipo-complemento')).join('')
    : '<div class="empty-state">Cadastre complementos na aba "Produtos &amp; preços".</div>';
}
function setupPDV(){
  document.getElementById('grid-acai').addEventListener('click', (e) => {
    const btn = e.target.closest('.produto-btn'); if(btn) adicionarAoPedido(btn.dataset.id);
  });
  document.getElementById('grid-complemento').addEventListener('click', (e) => {
    const btn = e.target.closest('.produto-btn'); if(btn) adicionarAoPedido(btn.dataset.id);
  });
  document.getElementById('ticket-items').addEventListener('click', (e) => {
    const idx = e.target.dataset.idx;
    if(idx === undefined) return;
    if(e.target.classList.contains('qtd-mais')) alterarQtdPedido(Number(idx), 1);
    if(e.target.classList.contains('qtd-menos')) alterarQtdPedido(Number(idx), -1);
    if(e.target.classList.contains('qtd-remover')) removerDoPedido(Number(idx));
  });

  const buscaCliente = document.getElementById('pdv-cliente-busca');
  buscaCliente.addEventListener('input', () => buscarClientePDV(buscaCliente.value));

  document.getElementById('btn-finalizar-venda').addEventListener('click', finalizarVenda);
  document.getElementById('btn-limpar-venda').addEventListener('click', () => {
    pedidoAtual = []; clienteSelecionadoId = null; clienteSelecionadoNome = null;
    buscaCliente.value = ''; document.getElementById('pdv-cliente-resultados').innerHTML = '';
    renderTicket();
  });
}
function adicionarAoPedido(produtoId){
  const p = produtos.find(x => x.id === produtoId); if(!p) return;
  const existente = pedidoAtual.find(i => i.produto_id === produtoId);
  if(existente) existente.qtd += 1;
  else pedidoAtual.push({ produto_id: p.id, nome: p.nome, categoria: p.categoria, preco: Number(p.preco), qtd: 1 });
  renderTicket();
}
function alterarQtdPedido(idx, delta){
  const item = pedidoAtual[idx]; if(!item) return;
  item.qtd += delta;
  if(item.qtd <= 0) pedidoAtual.splice(idx, 1);
  renderTicket();
}
function removerDoPedido(idx){
  pedidoAtual.splice(idx, 1);
  renderTicket();
}
function calcularTotalPedido(){
  return pedidoAtual.reduce((s, i) => s + i.preco * i.qtd, 0);
}
function renderTicket(){
  const cont = document.getElementById('ticket-items');
  if(!pedidoAtual.length){
    cont.innerHTML = '<div class="ticket-empty">Toque em um produto para começar o pedido</div>';
  } else {
    cont.innerHTML = pedidoAtual.map((i, idx) => `
      <div class="ticket-item">
        <span>${escapeHtml(i.nome)}</span>
        <span class="qty-controls">
          <button type="button" class="qty-btn qtd-menos" data-idx="${idx}">−</button>
          <span data-idx="${idx}">${i.qtd}</span>
          <button type="button" class="qty-btn qtd-mais" data-idx="${idx}">+</button>
          <b style="min-width:64px;text-align:right;display:inline-block;">${formatMoney(i.preco * i.qtd)}</b>
          <button type="button" class="qty-btn qtd-remover" data-idx="${idx}" title="Remover">✕</button>
        </span>
      </div>`).join('');
  }
  document.getElementById('ticket-total').textContent = formatMoney(calcularTotalPedido());
  document.getElementById('ticket-cliente-label').textContent = clienteSelecionadoNome
    ? `Cliente: ${clienteSelecionadoNome}` : 'Sem cliente identificado';
}
function buscarClientePDV(texto){
  const cont = document.getElementById('pdv-cliente-resultados');
  if(!texto || texto.length < 2){ cont.innerHTML = ''; return; }
  const termo = texto.toLowerCase();
  const encontrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(termo) || (c.whatsapp || '').includes(termo)
  ).slice(0, 5);
  if(!encontrados.length){ cont.innerHTML = '<div class="autocomplete-list"><div class="autocomplete-item">Nenhum cliente encontrado</div></div>'; return; }
  cont.innerHTML = `<div class="autocomplete-list">${encontrados.map(c => `
    <div class="autocomplete-item" data-id="${c.id}" data-nome="${escapeHtml(c.nome)}">
      ${escapeHtml(c.nome)} <small>${escapeHtml(c.whatsapp || 'sem WhatsApp')}</small>
    </div>`).join('')}</div>`;
  cont.querySelectorAll('.autocomplete-item[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      clienteSelecionadoId = el.dataset.id;
      clienteSelecionadoNome = el.dataset.nome;
      document.getElementById('pdv-cliente-busca').value = el.dataset.nome;
      cont.innerHTML = '';
      renderTicket();
    });
  });
}
async function finalizarVenda(){
  if(!pedidoAtual.length){ toast('Adicione ao menos um produto ao pedido.', 'erro'); return; }
  const func = funcionarioAtivoAtual();
  if(!func.id){ toast('Selecione quem está no caixa antes de vender.', 'erro'); return; }

  const btn = document.getElementById('btn-finalizar-venda');
  btn.disabled = true; btn.textContent = 'Registrando...';

  try{
    const total = calcularTotalPedido();
    const pagamento = val('pdv-pagamento') || 'Não informado';

    const { data: vendaData, error: vendaError } = await supabaseClient.from('vendas').insert({
      cliente_id: clienteSelecionadoId, cliente_nome: clienteSelecionadoNome,
      funcionario_id: func.id, funcionario_nome: func.nome,
      total, forma_pagamento: pagamento,
    }).select().single();
    if(vendaError) throw vendaError;

    const itensPayload = pedidoAtual.map(i => ({
      venda_id: vendaData.id, produto_id: i.produto_id, produto_nome: i.nome,
      categoria: i.categoria, qtd: i.qtd, preco_unit: i.preco, subtotal: i.preco * i.qtd,
    }));
    const { error: itensError } = await supabaseClient.from('venda_itens').insert(itensPayload);
    if(itensError) throw itensError;

    const { error: finError } = await supabaseClient.from('financeiro').insert({
      tipo: 'entrada', valor: total, categoria: 'Venda PDV',
      descricao: `Venda no PDV (${pagamento})`, venda_id: vendaData.id,
      funcionario_id: func.id, funcionario_nome: func.nome,
    });
    if(finError) throw finError;

    // baixa automática de estoque conforme ficha técnica
    const semFicha = [];
    for(const item of pedidoAtual){
      const insumos = produtoInsumosMap[item.produto_id] || [];
      if(!insumos.length) semFicha.push(item.nome);
      for(const insumo of insumos){
        const material = materiais.find(m => m.id === insumo.material_id);
        if(!material) continue;
        const consumoTotal = Number(insumo.qtd_consumida) * item.qtd;
        const novaQtd = Number(material.qtd_atual) - consumoTotal;
        await supabaseClient.from('materiais').update({ qtd_atual: novaQtd }).eq('id', material.id);
        await supabaseClient.from('movimentacoes_estoque').insert({
          material_id: material.id, material_nome: material.nome, tipo: 'saida', qtd: consumoTotal,
          funcionario_id: func.id, funcionario_nome: func.nome,
          observacao: 'Baixa automática de venda', venda_id: vendaData.id,
        });
        material.qtd_atual = novaQtd;
      }
    }

    if(clienteSelecionadoId){
      await supabaseClient.from('clientes').update({ ultima_compra_at: new Date().toISOString() }).eq('id', clienteSelecionadoId);
    }

    toast('Venda registrada! Total ' + formatMoney(total));
    if(semFicha.length){
      setTimeout(() => toast('⚠ Sem ficha técnica, não descontou estoque: ' + semFicha.join(', '), 'erro'), 600);
    }
    pedidoAtual = []; clienteSelecionadoId = null; clienteSelecionadoNome = null;
    document.getElementById('pdv-cliente-busca').value = '';
    document.getElementById('pdv-cliente-resultados').innerHTML = '';
    renderTicket();

    await Promise.all([loadMateriais(), loadMovimentacoes(), loadFinanceiro(), loadClientes(), loadVendas()]);
    recalcDashboard();
  }catch(err){
    toast('Erro ao registrar venda: ' + err.message, 'erro');
  }finally{
    btn.disabled = false; btn.textContent = 'Finalizar venda';
  }
}

// ============================================================
// CLIENTES
// ============================================================
async function loadClientes(){
  const { data, error } = await supabaseClient.from('clientes').select('*').order('nome');
  if(error){ toast('Erro ao carregar clientes: ' + error.message, 'erro'); return; }
  clientes = data || [];
  renderClientes();
}
function renderClientes(filtro){
  filtro = (filtro || val('busca-clientes') || '').toLowerCase();
  document.getElementById('count-clientes').textContent = clientes.length;
  const filtrados = clientes.filter(c => !filtro || c.nome.toLowerCase().includes(filtro));
  const tbody = document.getElementById('tbody-clientes');
  if(!filtrados.length){
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Nenhum cliente encontrado.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtrados.map(c => {
    let statusHtml;
    if(!c.ultima_compra_at){
      statusHtml = `<span class="badge badge-neutro">Sem compras</span>`;
    } else {
      const dias = daysSince(c.ultima_compra_at);
      statusHtml = dias >= 5
        ? `<span class="badge badge-inativo">Sem comprar há ${dias} dias</span>`
        : `<span class="badge badge-ativo">Ativo (${dias === 0 ? 'hoje' : dias + ' dias atrás'})</span>`;
    }
    return `<tr>
      <td>${escapeHtml(c.nome)}</td>
      <td>${escapeHtml(c.whatsapp || '-')}</td>
      <td>${formatDate(c.ultima_compra_at)}</td>
      <td>${statusHtml}</td>
      <td class="row-actions">
        ${c.whatsapp ? `<button class="btn-wa" onclick="abrirWhatsapp('${c.id}')">💬 WhatsApp</button>` : ''}
        <button class="btn-small" onclick="editarCliente('${c.id}')">Editar</button>
        <button class="btn-danger" onclick="excluirCliente('${c.id}')">Excluir</button>
      </td>
    </tr>`;
  }).join('');
}
function editarCliente(id){
  const c = clientes.find(x => x.id === id); if(!c) return;
  showModal('Editar cliente', `
    <div class="field"><label>Nome</label><input id="edit-cli-nome" value="${escapeHtml(c.nome)}"></div>
    <div class="field"><label>WhatsApp</label><input id="edit-cli-whatsapp" value="${escapeHtml(c.whatsapp || '')}"></div>
    <button class="btn btn-primary btn-block" onclick="salvarEdicaoCliente('${id}')">Salvar</button>
  `);
}
window.editarCliente = editarCliente;
async function salvarEdicaoCliente(id){
  const payload = { nome: val('edit-cli-nome'), whatsapp: val('edit-cli-whatsapp') };
  const { error } = await supabaseClient.from('clientes').update(payload).eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  fecharModal(); toast('Cliente atualizado!');
  await loadClientes();
}
window.salvarEdicaoCliente = salvarEdicaoCliente;
async function excluirCliente(id){
  if(!confirm('Excluir este cliente?')) return;
  const { error } = await supabaseClient.from('clientes').delete().eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  toast('Cliente excluído.');
  await loadClientes(); recalcDashboard();
}
window.excluirCliente = excluirCliente;
function abrirWhatsapp(clienteId){
  const c = clientes.find(x => x.id === clienteId); if(!c || !c.whatsapp) return;
  const numero = normalizarWhatsapp(c.whatsapp);
  const dias = c.ultima_compra_at ? daysSince(c.ultima_compra_at) : null;
  const msg = dias === null
    ? `Oi ${c.nome}! Tudo bem? Passando pra te contar as novidades do nosso açaí 🍇`
    : `Oi ${c.nome}! Sentimos sua falta por aqui, já faz ${dias} dias desde sua última compra 🍇 Que tal vir tomar um açaízinho hoje?`;
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
}
window.abrirWhatsapp = abrirWhatsapp;

// ============================================================
// FINANCEIRO
// ============================================================
async function loadFinanceiro(){
  const { data, error } = await supabaseClient.from('financeiro').select('*').order('created_at', { ascending: false }).limit(300);
  if(error){ toast('Erro ao carregar financeiro: ' + error.message, 'erro'); return; }
  financeiro = data || [];
  renderFinanceiro();
}
function renderFinanceiro(){
  const tipoFiltro = val('fin-filtro-tipo');
  const mesFiltro = document.getElementById('fin-filtro-mes').value; // yyyy-mm
  const filtrados = financeiro.filter(f => {
    if(tipoFiltro && f.tipo !== tipoFiltro) return false;
    if(mesFiltro && (f.created_at || '').slice(0,7) !== mesFiltro) return false;
    return true;
  });
  document.getElementById('count-financeiro').textContent = filtrados.length;
  const tbody = document.getElementById('tbody-financeiro');
  if(!filtrados.length){
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Nenhum lançamento encontrado.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtrados.map(f => `
    <tr>
      <td>${formatDateTime(f.created_at)}</td>
      <td><span class="badge ${f.tipo === 'entrada' ? 'badge-ok' : 'badge-inativo'}">${f.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td>${escapeHtml(f.categoria || '-')}</td>
      <td>${escapeHtml(f.descricao || '-')}</td>
      <td style="color:${f.tipo === 'entrada' ? 'var(--verde)' : 'var(--vermelho)'}; font-weight:700;">
        ${f.tipo === 'entrada' ? '+' : '−'} ${formatMoney(f.valor)}
      </td>
      <td>${escapeHtml(f.funcionario_nome || '-')}</td>
      <td class="row-actions"><button class="btn-danger" onclick="excluirFinanceiro('${f.id}')">Excluir</button></td>
    </tr>`).join('');

  // KPIs do mês
  const doMes = financeiro.filter(f => isMesAtual(f.created_at));
  const entradasMes = doMes.filter(f => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0);
  const saidasMes = doMes.filter(f => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0);
  const saldoTotal = financeiro.reduce((s, f) => s + (f.tipo === 'entrada' ? Number(f.valor) : -Number(f.valor)), 0);
  document.getElementById('fin-entradas-mes').textContent = formatMoney(entradasMes);
  document.getElementById('fin-saidas-mes').textContent = formatMoney(saidasMes);
  document.getElementById('fin-saldo-total').textContent = formatMoney(saldoTotal);
}
async function excluirFinanceiro(id){
  if(!confirm('Excluir este lançamento financeiro?')) return;
  const { error } = await supabaseClient.from('financeiro').delete().eq('id', id);
  if(error){ toast('Erro: ' + error.message, 'erro'); return; }
  toast('Lançamento excluído.');
  await loadFinanceiro(); recalcDashboard();
}
window.excluirFinanceiro = excluirFinanceiro;

// ============================================================
// VENDAS (para dashboard e relatórios)
// ============================================================
async function loadVendas(){
  const { data, error } = await supabaseClient
    .from('vendas')
    .select('*, venda_itens(count)')
    .order('created_at', { ascending: false })
    .limit(500);
  if(error){ toast('Erro ao carregar vendas: ' + error.message, 'erro'); return; }
  vendas = data || [];
}

// ============================================================
// DASHBOARD
// ============================================================
function recalcDashboard(){
  const faturamentoMes = vendas.filter(v => isMesAtual(v.created_at)).reduce((s, v) => s + Number(v.total), 0);
  const saldo = financeiro.reduce((s, f) => s + (f.tipo === 'entrada' ? Number(f.valor) : -Number(f.valor)), 0);
  const estoqueBaixo = materiais.filter(m => Number(m.qtd_atual) <= Number(m.estoque_minimo)).length;
  const clientesInativos = clientes.filter(c => c.ultima_compra_at && daysSince(c.ultima_compra_at) >= 5).length;

  document.getElementById('kpi-faturamento-mes').textContent = formatMoney(faturamentoMes);
  document.getElementById('kpi-saldo').textContent = formatMoney(saldo);
  document.getElementById('kpi-estoque-baixo').textContent = estoqueBaixo;
  document.getElementById('kpi-clientes-inativos').textContent = clientesInativos;

  renderUltimasVendas();
  renderListaAtencao();
}
function renderUltimasVendas(){
  const tbody = document.getElementById('tbody-ultimas-vendas');
  const top = vendas.slice(0, 8);
  if(!top.length){
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Nenhuma venda registrada ainda.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = top.map(v => {
    const itens = v.venda_itens && v.venda_itens[0] ? v.venda_itens[0].count : '-';
    return `<tr>
      <td>${formatDateTime(v.created_at)}</td>
      <td>${escapeHtml(v.cliente_nome || 'Não identificado')}</td>
      <td>${itens}</td>
      <td>${formatMoney(v.total)}</td>
      <td class="row-actions"><button class="btn-danger" onclick="cancelarVenda('${v.id}')">Cancelar venda</button></td>
    </tr>`;
  }).join('');
}
async function cancelarVenda(vendaId){
  const venda = vendas.find(v => v.id === vendaId);
  if(!venda) return;
  if(!confirm(`Cancelar a venda de ${formatMoney(venda.total)} feita em ${formatDateTime(venda.created_at)}?\n\nIsso vai: remover o valor do financeiro, devolver os materiais consumidos ao estoque e apagar a venda. Essa ação não pode ser desfeita.`)) return;

  try{
    // 1. buscar os itens da venda
    const { data: itens, error: itensErr } = await supabaseClient.from('venda_itens').select('*').eq('venda_id', vendaId);
    if(itensErr) throw itensErr;

    const func = funcionarioAtivoAtual();

    // 2. devolver ao estoque o que foi consumido pela ficha técnica de cada item
    for(const item of (itens || [])){
      const insumos = produtoInsumosMap[item.produto_id] || [];
      for(const insumo of insumos){
        const material = materiais.find(m => m.id === insumo.material_id);
        if(!material) continue;
        const consumoTotal = Number(insumo.qtd_consumida) * Number(item.qtd);
        const novaQtd = Number(material.qtd_atual) + consumoTotal;
        await supabaseClient.from('materiais').update({ qtd_atual: novaQtd }).eq('id', material.id);
        await supabaseClient.from('movimentacoes_estoque').insert({
          material_id: material.id, material_nome: material.nome, tipo: 'entrada', qtd: consumoTotal,
          funcionario_id: func.id, funcionario_nome: func.nome,
          observacao: 'Estorno por cancelamento de venda', venda_id: vendaId,
        });
        material.qtd_atual = novaQtd;
      }
    }

    // 3. remover o lançamento financeiro dessa venda
    await supabaseClient.from('financeiro').delete().eq('venda_id', vendaId);

    // 4. remover os itens e a venda
    await supabaseClient.from('venda_itens').delete().eq('venda_id', vendaId);
    const { error: delErr } = await supabaseClient.from('vendas').delete().eq('id', vendaId);
    if(delErr) throw delErr;

    // 5. se a venda tinha cliente, recalcular a última compra dele
    if(venda.cliente_id){
      const { data: ultimaRestante } = await supabaseClient
        .from('vendas').select('created_at').eq('cliente_id', venda.cliente_id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      await supabaseClient.from('clientes')
        .update({ ultima_compra_at: ultimaRestante ? ultimaRestante.created_at : null })
        .eq('id', venda.cliente_id);
    }

    toast('Venda cancelada e estoque estornado.');
    await Promise.all([loadMateriais(), loadMovimentacoes(), loadFinanceiro(), loadClientes(), loadVendas()]);
    recalcDashboard();
    if(document.getElementById('section-relatorios').classList.contains('active')) renderRelatorios();
  }catch(err){
    toast('Erro ao cancelar venda: ' + err.message, 'erro');
  }
}
window.cancelarVenda = cancelarVenda;
function renderListaAtencao(){
  const baixos = materiais.filter(m => Number(m.qtd_atual) <= Number(m.estoque_minimo)).slice(0, 5);
  const inativos = clientes.filter(c => c.ultima_compra_at && daysSince(c.ultima_compra_at) >= 5).slice(0, 5);
  let html = '';
  if(baixos.length){
    html += `<p style="font-size:12px;font-weight:700;color:var(--texto-suave);margin-bottom:4px;">📦 ESTOQUE BAIXO</p>`;
    html += baixos.map(m => `<div class="insumo-row"><span>${escapeHtml(m.nome)} — ${Number(m.qtd_atual)} ${escapeHtml(m.unidade)}</span><span class="badge ${Number(m.qtd_atual) <= 0 ? 'badge-zerado' : 'badge-baixo'}">${Number(m.qtd_atual) <= 0 ? 'Zerado' : 'Baixo'}</span></div>`).join('');
  }
  if(inativos.length){
    html += `<p style="font-size:12px;font-weight:700;color:var(--texto-suave);margin:14px 0 4px;">👤 CLIENTES SEM COMPRAR</p>`;
    html += inativos.map(c => `<div class="insumo-row"><span>${escapeHtml(c.nome)} — ${daysSince(c.ultima_compra_at)} dias</span>${c.whatsapp ? `<button class="btn-wa" onclick="abrirWhatsapp('${c.id}')">💬 Chamar</button>` : ''}</div>`).join('');
  }
  document.getElementById('lista-atencao').innerHTML = html || '<div class="empty-state">Tudo certo por aqui! Nenhum alerta no momento. 🎉</div>';
}

// ============================================================
// RELATÓRIOS
// ============================================================
function agruparFaturamentoPorMes(){
  const grupos = {};
  vendas.forEach(v => {
    const chave = (v.created_at || '').slice(0,7);
    if(!chave) return;
    if(!grupos[chave]) grupos[chave] = { count: 0, total: 0 };
    grupos[chave].count += 1;
    grupos[chave].total += Number(v.total);
  });
  return Object.entries(grupos).sort((a,b) => b[0].localeCompare(a[0]));
}
function nomeMes(chave){
  const [ano, mes] = chave.split('-');
  const nomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return `${nomes[Number(mes)-1]} de ${ano}`;
}
function renderRelatorios(){
  const grupos = agruparFaturamentoPorMes();
  const tbody = document.getElementById('tbody-faturamento-mensal');
  tbody.innerHTML = grupos.length ? grupos.map(([chave, v]) => `
    <tr><td>${nomeMes(chave)}</td><td>${v.count}</td><td>${formatMoney(v.total)}</td></tr>
  `).join('') : `<tr><td colspan="3"><div class="empty-state">Nenhuma venda registrada ainda.</div></td></tr>`;

  const baixos = materiais.filter(m => Number(m.qtd_atual) <= Number(m.estoque_minimo));
  document.getElementById('lista-relatorio-estoque').innerHTML = baixos.length
    ? baixos.map(m => `<div class="insumo-row"><span>${escapeHtml(m.nome)}</span><span class="badge ${Number(m.qtd_atual) <= 0 ? 'badge-zerado' : 'badge-baixo'}">${Number(m.qtd_atual)} ${escapeHtml(m.unidade)}</span></div>`).join('')
    : '<div class="empty-state">Nenhum material em estoque baixo. 🎉</div>';

  const inativos = clientes.filter(c => c.ultima_compra_at && daysSince(c.ultima_compra_at) >= 5);
  document.getElementById('lista-relatorio-clientes').innerHTML = inativos.length
    ? inativos.map(c => `<div class="insumo-row"><span>${escapeHtml(c.nome)}</span><span class="badge badge-inativo">${daysSince(c.ultima_compra_at)} dias</span></div>`).join('')
    : '<div class="empty-state">Nenhum cliente inativo no momento. 🎉</div>';
}
function gerarRelatorioPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const hoje = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18);
  doc.text('Relatório — Açaí Chega na Moral', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Gerado em ${hoje}`, 14, 25);

  const doMes = financeiro.filter(f => isMesAtual(f.created_at));
  const entradasMes = doMes.filter(f => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor), 0);
  const saidasMes = doMes.filter(f => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor), 0);
  const saldoTotal = financeiro.reduce((s, f) => s + (f.tipo === 'entrada' ? Number(f.valor) : -Number(f.valor)), 0);
  const faturamentoMes = vendas.filter(v => isMesAtual(v.created_at)).reduce((s, v) => s + Number(v.total), 0);

  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text('Resumo financeiro do mês atual', 14, 36);
  doc.autoTable({
    startY: 40,
    head: [['Faturamento (vendas)', 'Entradas', 'Saídas', 'Saldo total em caixa']],
    body: [[formatMoney(faturamentoMes), formatMoney(entradasMes), formatMoney(saidasMes), formatMoney(saldoTotal)]],
    theme: 'grid', headStyles: { fillColor: [124, 58, 237] },
  });

  const grupos = agruparFaturamentoPorMes();
  doc.text('Faturamento por mês', 14, doc.lastAutoTable.finalY + 12);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Mês', 'Nº de vendas', 'Faturamento']],
    body: grupos.length ? grupos.map(([chave, v]) => [nomeMes(chave), String(v.count), formatMoney(v.total)]) : [['Sem dados', '-', '-']],
    theme: 'grid', headStyles: { fillColor: [124, 58, 237] },
  });

  const baixos = materiais.filter(m => Number(m.qtd_atual) <= Number(m.estoque_minimo));
  doc.text('Materiais com estoque baixo', 14, doc.lastAutoTable.finalY + 12);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Material', 'Qtd. atual', 'Estoque mínimo']],
    body: baixos.length ? baixos.map(m => [m.nome, `${m.qtd_atual} ${m.unidade}`, `${m.estoque_minimo} ${m.unidade}`]) : [['Nenhum material em estoque baixo', '-', '-']],
    theme: 'grid', headStyles: { fillColor: [245, 158, 11] },
  });

  const inativos = clientes.filter(c => c.ultima_compra_at && daysSince(c.ultima_compra_at) >= 5);
  doc.text('Clientes sem comprar há 5+ dias', 14, doc.lastAutoTable.finalY + 12);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Cliente', 'WhatsApp', 'Dias sem comprar']],
    body: inativos.length ? inativos.map(c => [c.nome, c.whatsapp || '-', String(daysSince(c.ultima_compra_at))]) : [['Nenhum cliente inativo', '-', '-']],
    theme: 'grid', headStyles: { fillColor: [239, 68, 68] },
  });

  doc.save(`relatorio-acai-${new Date().toISOString().slice(0,10)}.pdf`);
}

// ============================================================
// FORMULÁRIOS
// ============================================================
function setupForms(){
  renderIconPicker('icon-picker-novo', 'prod-icone');

  document.getElementById('form-funcionario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = val('func-nome');
    if(!nome) return;
    const { error } = await supabaseClient.from('funcionarios').insert({ nome });
    if(error){ toast('Erro: ' + error.message, 'erro'); return; }
    toast('Funcionário cadastrado!');
    e.target.reset();
    await loadFuncionarios();
  });

  document.getElementById('form-material').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nome: val('mat-nome'),
      categoria: val('mat-categoria') || 'Geral',
      unidade: val('mat-unidade') || 'un',
      qtd_atual: parseFloat(val('mat-qtd-inicial')) || 0,
      estoque_minimo: parseFloat(val('mat-estoque-minimo')) || 0,
    };
    if(!payload.nome){ toast('Informe o nome do material.', 'erro'); return; }
    const { error } = await supabaseClient.from('materiais').insert(payload);
    if(error){ toast('Erro: ' + error.message, 'erro'); return; }
    toast('Material cadastrado!');
    e.target.reset(); document.getElementById('mat-unidade').value = 'un';
    await loadMateriais(); recalcDashboard();
  });

  document.getElementById('form-movimentacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const materialId = val('mov-material');
    const tipo = val('mov-tipo');
    const qtd = parseFloat(val('mov-qtd'));
    if(!materialId || !tipo || !qtd || qtd <= 0){ toast('Preencha material, tipo e uma quantidade válida.', 'erro'); return; }
    const func = funcionarioAtivoAtual();
    if(tipo === 'saida' && !func.id){ toast('Selecione quem está no caixa: funcionário é obrigatório em saídas.', 'erro'); return; }
    const material = materiais.find(m => m.id === materialId);
    if(!material) return;
    const novaQtd = tipo === 'entrada' ? Number(material.qtd_atual) + qtd : Number(material.qtd_atual) - qtd;

    const { error: e1 } = await supabaseClient.from('materiais').update({ qtd_atual: novaQtd }).eq('id', materialId);
    if(e1){ toast('Erro: ' + e1.message, 'erro'); return; }
    const { error: e2 } = await supabaseClient.from('movimentacoes_estoque').insert({
      material_id: materialId, material_nome: material.nome, tipo, qtd,
      funcionario_id: func.id, funcionario_nome: func.nome, observacao: val('mov-observacao') || null,
    });
    if(e2){ toast('Erro: ' + e2.message, 'erro'); return; }

    toast('Movimentação registrada!');
    e.target.reset();
    await Promise.all([loadMateriais(), loadMovimentacoes()]);
    recalcDashboard();
  });

  document.getElementById('form-produto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nome: val('prod-nome'), categoria: val('prod-categoria'),
      preco: parseFloat(val('prod-preco')) || 0,
      icone: val('prod-icone') || null,
    };
    if(!payload.nome){ toast('Informe o nome do produto.', 'erro'); return; }
    const { error } = await supabaseClient.from('produtos_venda').insert(payload);
    if(error){ toast('Erro: ' + error.message, 'erro'); return; }
    toast('Produto cadastrado!');
    e.target.reset();
    document.querySelectorAll('#icon-picker-novo button').forEach(b => b.classList.remove('selecionado'));
    await loadProdutos();
  });

  document.getElementById('form-financeiro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const func = funcionarioAtivoAtual();
    const payload = {
      tipo: val('fin-tipo'), valor: parseFloat(val('fin-valor')),
      categoria: val('fin-categoria') || 'Geral', descricao: val('fin-descricao') || null,
      funcionario_id: func.id, funcionario_nome: func.nome,
    };
    if(!payload.valor || payload.valor <= 0){ toast('Informe um valor válido.', 'erro'); return; }
    const { error } = await supabaseClient.from('financeiro').insert(payload);
    if(error){ toast('Erro: ' + error.message, 'erro'); return; }
    toast('Lançamento registrado!');
    e.target.reset();
    await loadFinanceiro(); recalcDashboard();
  });

  document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = { nome: val('cli-nome'), whatsapp: val('cli-whatsapp') || null };
    if(!payload.nome){ toast('Informe o nome do cliente.', 'erro'); return; }
    const { error } = await supabaseClient.from('clientes').insert(payload);
    if(error){ toast('Erro: ' + error.message, 'erro'); return; }
    toast('Cliente cadastrado!');
    e.target.reset();
    await loadClientes(); recalcDashboard();
  });

  document.getElementById('busca-materiais').addEventListener('input', (e) => renderMateriais(e.target.value));
  document.getElementById('busca-clientes').addEventListener('input', (e) => renderClientes(e.target.value));
  document.getElementById('fin-filtro-tipo').addEventListener('change', () => renderFinanceiro());
  document.getElementById('fin-filtro-mes').addEventListener('change', () => renderFinanceiro());

  document.getElementById('btn-gerar-pdf').addEventListener('click', gerarRelatorioPDF);
  document.getElementById('btn-relatorio-topo').addEventListener('click', gerarRelatorioPDF);
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
async function init(){
  setupNav();
  setupHamburger();
  setupForms();
  setupPDV();

  await Promise.all([
    loadFuncionarios(),
    loadMateriais(),
    loadMovimentacoes(),
    loadProdutos(),
    loadProdutoInsumos(),
    loadClientes(),
    loadFinanceiro(),
    loadVendas(),
  ]);

  renderPDVGrids(); // garante que os avisos de "sem ficha técnica" considerem os insumos já carregados
  recalcDashboard();
}
document.addEventListener('DOMContentLoaded', init);
