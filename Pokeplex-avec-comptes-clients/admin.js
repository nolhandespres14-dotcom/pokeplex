import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const loginPanel=document.getElementById('loginPanel'), dashboard=document.getElementById('dashboard');
const loginForm=document.getElementById('loginForm'), loginError=document.getElementById('loginError');
const productsEl=document.getElementById('adminProducts'), reservationsEl=document.getElementById('reservations');
const form=document.getElementById('productForm'), formMessage=document.getElementById('formMessage');
const saveBtn=document.getElementById('saveBtn');
let products=[];

function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function init(){
  const {data:{session}}=await supabase.auth.getSession();
  updateAuth(session);
  supabase.auth.onAuthStateChange((_e,s)=>updateAuth(s));
}
async function updateAuth(session){
  const user=session?.user;
  document.getElementById('authState').textContent=user?`Connecté : ${user.email}`:'';
  loginPanel.classList.toggle('hidden',!!user); dashboard.classList.toggle('hidden',!user);
  if(user){ await loadProducts(); await loadReservations(); }
}
loginForm.addEventListener('submit',async e=>{e.preventDefault();loginError.textContent='';const {error}=await supabase.auth.signInWithPassword({email:document.getElementById('email').value,password:document.getElementById('password').value});if(error)loginError.textContent='Connexion impossible : '+error.message;});
document.getElementById('logoutBtn').addEventListener('click',()=>supabase.auth.signOut());

autoCancel();
document.getElementById('cancelEditBtn').addEventListener('click',resetForm);
form.addEventListener('submit',saveProduct);

async function loadProducts(){const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});if(error){formMessage.textContent=error.message;return;}products=data||[];productsEl.innerHTML=products.map(p=>`<div class="admin-row"><div class="admin-row-main"><img class="thumb" src="${escapeHtml(p.image_url)}" alt=""/><div><strong>${escapeHtml(p.name)}</strong><small>${Number(p.price).toFixed(2)} $ • ${escapeHtml(p.status)}</small></div></div><div class="admin-actions"><button class="secondary-btn" data-edit="${p.id}">Modifier</button><button class="secondary-btn" data-status="${p.id}" data-next="${p.status==='available'?'sold':'available'}">${p.status==='sold'?'Remettre disponible':'Marquer vendue'}</button><button class="secondary-btn" data-delete="${p.id}">Supprimer</button></div></div>`).join('');
productsEl.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>startEdit(b.dataset.edit));
productsEl.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
productsEl.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>setStatus(b.dataset.id,b.dataset.next));}

async function saveProduct(e){e.preventDefault();const id=document.getElementById('editingId').value;const name=document.getElementById('productName').value.trim();const price=Number(document.getElementById('productPrice').value);const description=document.getElementById('productDescription').value.trim();const file=document.getElementById('productImage').files[0];if(!name||!(price>=0)||(!id&&!file)){formMessage.textContent='Nom, prix et photo sont requis pour une nouvelle carte.';return;}saveBtn.disabled=true;formMessage.textContent='Enregistrement…';let image_url=id?products.find(p=>p.id===id)?.image_url:null;if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${crypto.randomUUID()}.${ext}`;const up=await supabase.storage.from('cards').upload(path,file,{upsert:false});if(up.error){formMessage.textContent=up.error.message;saveBtn.disabled=false;return;}image_url=supabase.storage.from('cards').getPublicUrl(path).data.publicUrl;}
const payload={name,price,description,image_url};let result=id?await supabase.from('products').update(payload).eq('id',id):await supabase.from('products').insert(payload);if(result.error){formMessage.textContent=result.error.message;}else{formMessage.textContent='Carte enregistrée.';resetForm();await loadProducts();}saveBtn.disabled=false;await loadReservations();}
function startEdit(id){const p=products.find(x=>x.id===id);if(!p)return;document.getElementById('editingId').value=id;document.getElementById('productName').value=p.name;document.getElementById('productPrice').value=p.price;document.getElementById('productDescription').value=p.description||'';document.getElementById('productImage').value='';saveBtn.textContent='Enregistrer les changements';window.scrollTo({top:0,behavior:'smooth'});}
function resetForm(){document.getElementById('editingId').value='';document.getElementById('productName').value='';document.getElementById('productPrice').value='';document.getElementById('productDescription').value='';document.getElementById('productImage').value='';saveBtn.textContent='Ajouter la carte';}
function autoCancel(){/* no-op for clarity */}
async function deleteProduct(id){if(!confirm('Supprimer cette carte ?'))return;const {error}=await supabase.from('products').delete().eq('id',id);if(error)alert(error.message);else{await loadProducts();await loadReservations();}}
async function setStatus(id,status){const {error}=await supabase.from('products').update({status}).eq('id',id);if(error)alert(error.message);else await loadProducts();}
async function loadReservations(){const {data,error}=await supabase.from('reservations').select('id,buyer_name,buyer_phone,status,created_at,products(name,price)').order('created_at',{ascending:false});if(error){reservationsEl.innerHTML='<div class="small-note">Impossible de charger les réservations.</div>';return;}reservationsEl.innerHTML=(data||[]).map(r=>`<div class="reservation-row"><div><strong>${escapeHtml(r.products?.name||'Carte')}</strong><div><small>${escapeHtml(r.buyer_name)} • ${escapeHtml(r.buyer_phone)} • ${new Date(r.created_at).toLocaleString('fr-CA')}</small></div></div><div class="reservation-status">${escapeHtml(r.status)}</div></div>`).join('')||'<div class="small-note">Aucune réservation.</div>';}
init();
