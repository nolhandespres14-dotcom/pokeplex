import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('https://'));
const supabase = SUPABASE_READY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const grid = document.getElementById('cardsGrid');
const search = document.getElementById('search');
const filter = document.getElementById('statusFilter');
const empty = document.getElementById('emptyState');
const buyDialog = document.getElementById('buyDialog');
const successDialog = document.getElementById('successDialog');
const accountDialog = document.getElementById('accountDialog');
const accountBtn = document.getElementById('accountBtn');
const closeAccountBtn = document.getElementById('closeAccountBtn');
const accountLoggedOut = document.getElementById('accountLoggedOut');
const accountLoggedIn = document.getElementById('accountLoggedIn');
const customerDisplayName = document.getElementById('customerDisplayName');
const customerEmailDisplay = document.getElementById('customerEmailDisplay');
const loginForm = document.getElementById('customerLoginForm');
const signupForm = document.getElementById('customerSignupForm');
const loginMessage = document.getElementById('customerLoginMessage');
const signupMessage = document.getElementById('customerSignupMessage');
const customerLogoutBtn = document.getElementById('customerLogoutBtn');
const year = document.getElementById('year');

year.textContent = new Date().getFullYear();

let products = [];
let customerSession = null;

function setMessage(el, message, isError = false) {
  el.textContent = message || '';
  el.classList.toggle('error-text', isError);
}

function updateCustomerUI(session) {
  customerSession = session || null;
  const user = customerSession?.user;

  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'client';
    customerDisplayName.textContent = name;
    customerEmailDisplay.textContent = user.email || '';
    accountLoggedOut.classList.add('hidden');
    accountLoggedIn.classList.remove('hidden');
    accountBtn.textContent = '👤 ' + name;
  } else {
    accountLoggedIn.classList.add('hidden');
    accountLoggedOut.classList.remove('hidden');
    accountBtn.textContent = '👤 Mon compte';
  }
}

async function initCustomerAuth() {
  if (!SUPABASE_READY) { updateCustomerUI(null); return; }
  const { data } = await supabase.auth.getSession();
  updateCustomerUI(data.session);

  supabase.auth.onAuthStateChange((_event, session) => {
    updateCustomerUI(session);
  });
}

accountBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  accountDialog.showModal();
});

closeAccountBtn?.addEventListener('click', () => accountDialog.close());

document.querySelectorAll('[data-account-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.accountTab;
    document.querySelectorAll('[data-account-tab]').forEach(x => x.classList.toggle('active', x === btn));
    loginForm.classList.toggle('hidden', tab !== 'login');
    signupForm.classList.toggle('hidden', tab !== 'signup');
    setMessage(loginMessage, '');
    setMessage(signupMessage, '');
  });
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!SUPABASE_READY) { setMessage(loginMessage, 'Les comptes clients seront activés après la configuration Supabase.', true); return; }
  setMessage(loginMessage, 'Connexion en cours…');

  const email = document.getElementById('customerLoginEmail').value.trim();
  const password = document.getElementById('customerLoginPassword').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setMessage(loginMessage, error.message, true);
    return;
  }

  setMessage(loginMessage, 'Connexion réussie.');
  setTimeout(() => accountDialog.close(), 500);
});

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!SUPABASE_READY) { setMessage(signupMessage, 'Les comptes clients seront activés après la configuration Supabase.', true); return; }
  setMessage(signupMessage, 'Création du compte…');

  const full_name = document.getElementById('customerSignupName').value.trim();
  const email = document.getElementById('customerSignupEmail').value.trim();
  const password = document.getElementById('customerSignupPassword').value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  });

  if (error) {
    setMessage(signupMessage, error.message, true);
    return;
  }

  if (!data.session) {
    setMessage(signupMessage, 'Compte créé. Vérifie maintenant ton courriel pour confirmer ton adresse.');
  } else {
    setMessage(signupMessage, 'Compte créé et connexion réussie.');
    setTimeout(() => accountDialog.close(), 700);
  }
});

customerLogoutBtn?.addEventListener('click', async () => {
  if (!SUPABASE_READY) return;
  await supabase.auth.signOut();
  accountDialog.close();
});

async function loadProducts(){
  if (!SUPABASE_READY) {
    grid.innerHTML = `<div class="empty-state">Le catalogue sera affiché ici après la connexion de Supabase. Le design Poképléx est prêt.</div>`;
    return;
  }
  const { data, error } = await supabase.from('products').select('*').order('created_at',{ascending:false});
  if(error){
    grid.innerHTML = `<div class="empty-state">Le catalogue n'est pas encore connecté. Termine la configuration Supabase dans le fichier de configuration.</div>`;
    return;
  }
  products = data || [];
  render();
}

function render(){
  const q = search.value.trim().toLowerCase();
  const status = filter.value;
  const visible = products.filter(p =>
    (!q || `${p.name} ${p.description||''}`.toLowerCase().includes(q)) &&
    (status==='all' || p.status===status)
  );

  empty.classList.toggle('hidden', visible.length>0);
  grid.innerHTML = visible.map(cardHtml).join('');
  grid.querySelectorAll('[data-buy]').forEach(btn =>
    btn.addEventListener('click',()=>openBuy(btn.dataset.buy))
  );
}

function cardHtml(p){
  const unavailable = p.status !== 'available';
  const badge = p.status==='reserved' ? 'Réservée' : p.status==='sold' ? 'Vendue' : 'Disponible';
  return `<article class="product-card">
    <div class="product-image-wrap">
      <img class="product-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <span class="status-badge">${badge}</span>
    </div>
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

  if(!customerSession?.user){
    accountDialog.showModal();
    setMessage(loginMessage, 'Connecte-toi ou crée ton compte avant de réserver une carte.');
    return;
  }

  document.getElementById('dialogProductId').value = id;
  document.getElementById('dialogTitle').textContent = `Je vais l’acheter : ${p.name}`;
  document.getElementById('dialogPrice').textContent = `${Number(p.price).toFixed(2)} $`;
  document.getElementById('buyerName').value = customerSession.user.user_metadata?.full_name || '';
  document.getElementById('buyerPhone').value='';
  buyDialog.showModal();
}

document.getElementById('buyForm').addEventListener('submit', async e=>{
  e.preventDefault();

  if(!customerSession?.user){
    buyDialog.close();
    accountDialog.showModal();
    return;
  }

  const productId=document.getElementById('dialogProductId').value;
  const name=document.getElementById('buyerName').value.trim();
  const phone=document.getElementById('buyerPhone').value.trim();
  const btn=document.getElementById('reserveBtn');

  btn.disabled=true;
  if (!SUPABASE_READY) { alert('La réservation sera activée après la configuration Supabase.'); btn.disabled=false; return; }
  const { error } = await supabase.rpc('reserve_product',{
    p_product_id:productId,
    p_buyer_name:name,
    p_buyer_phone:phone
  });
  btn.disabled=false;

  if(error){
    alert(error.message.includes('already')
      ? 'Cette carte vient d’être réservée. Recharge la page pour voir le statut.'
      : 'Une erreur est survenue. Réessaie.');
    return;
  }

  buyDialog.close();
  const p=products.find(x=>x.id===productId);
  document.getElementById('successText').innerHTML =
    `Ta réservation pour <strong>${escapeHtml(p?.name||'cette carte')}</strong> est enregistrée.<br><br>Compte : ${escapeHtml(customerSession.user.email||'')}<br>Viens avec l’argent comptant et présente ton nom ou ton numéro de téléphone.`;

  successDialog.showModal();
  await loadProducts();
});

search.addEventListener('input',render);
filter.addEventListener('change',render);

function escapeHtml(v){
  return String(v??'').replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
}

initCustomerAuth();
loadProducts();
