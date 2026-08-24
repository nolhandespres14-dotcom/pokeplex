import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const grid = document.getElementById('cardsGrid');
const search = document.getElementById('search');
const filter = document.getElementById('statusFilter');
const empty = document.getElementById('emptyState');
const buyDialog = document.getElementById('buyDialog');
const successDialog = document.getElementById('successDialog');
const year = document.getElementById('year');
year.textContent = new Date().getFullYear();
let products = [];

async function loadProducts(){
  const { data, error } = await supabase.from('products').select('*').order('created_at',{ascending:false});
  if(error){ grid.innerHTML = `<div class="empty-state">Le catalogue n'est pas encore connecté. Termine la configuration Supabase dans le fichier de configuration.</div>`; return; }
  products = data || [];
  render();
}

function render(){
  const q = search.value.trim().toLowerCase();
  const status = filter.value;
  const visible = products.filter(p => (!q || `${p.name} ${p.description||''}`.toLowerCase().includes(q)) && (status==='all' || p.status===status));
  empty.classList.toggle('hidden', visible.length>0);
  grid.innerHTML = visible.map(cardHtml).join('');
  grid.querySelectorAll('[data-buy]').forEach(btn=>btn.addEventListener('click',()=>openBuy(btn.dataset.buy)));
}

function cardHtml(p){
  const unavailable = p.status !== 'available';
  const badge = p.status==='reserved' ? 'Réservée' : p.status==='sold' ? 'Vendue' : 'Disponible';
  return `<article class="product-card">
    <div class="product-image-wrap"><img class="product-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" /><span class="status-badge">${badge}</span></div>
    <div class="product-body">
      <div class="product-name">${escapeHtml(p.name)}</div>
      <div class="product-description">${escapeHtml(p.description||'')}</div>
      <div class="price">${Number(p.price).toFixed(2)} $</div>
      <button class="primary-btn" data-buy="${p.id}" ${unavailable?'disabled':''}>${unavailable?'Indisponible':'Je vais l’acheter'}</button>
    </div>
  </article>`;
}

function openBuy(id){
  const p = products.find(x=>x.id===id);
  if(!p || p.status!=='available') return;
  document.getElementById('dialogProductId').value = id;
  document.getElementById('dialogTitle').textContent = `Je vais l’acheter : ${p.name}`;
  document.getElementById('dialogPrice').textContent = `${Number(p.price).toFixed(2)} $`;
  document.getElementById('buyerName').value='';
  document.getElementById('buyerPhone').value='';
  buyDialog.showModal();
}

document.getElementById('buyForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const productId=document.getElementById('dialogProductId').value;
  const name=document.getElementById('buyerName').value.trim();
  const phone=document.getElementById('buyerPhone').value.trim();
  const btn=document.getElementById('reserveBtn');
  btn.disabled=true;
  const { data, error } = await supabase.rpc('reserve_product',{p_product_id:productId,p_buyer_name:name,p_buyer_phone:phone});
  btn.disabled=false;
  if(error){ alert(error.message.includes('already')?'Cette carte vient d’être réservée. Recharge la page pour voir le statut.':'Une erreur est survenue. Réessaie.'); return; }
  buyDialog.close();
  const p=products.find(x=>x.id===productId);
  document.getElementById('successText').innerHTML = `Ta réservation pour <strong>${escapeHtml(p?.name||'cette carte')}</strong> est enregistrée.<br><br>Viens avec l’argent comptant et présente ton nom ou ton numéro de téléphone.`;
  successDialog.showModal();
  await loadProducts();
});

search.addEventListener('input',render); filter.addEventListener('change',render);
loadProducts();

function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
