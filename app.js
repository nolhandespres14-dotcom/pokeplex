import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const SUPABASE_READY = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('https://')
);

const supabase = SUPABASE_READY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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

if (year) {
  year.textContent = new Date().getFullYear();
}

let products = [];
let customerSession = null;

/* =========================================================
   PANIER
========================================================= */

let cart = [];

try {
  cart = JSON.parse(localStorage.getItem('pokeplex-cart') || '[]');
  if (!Array.isArray(cart)) cart = [];
} catch {
  cart = [];
}

function saveCart() {
  localStorage.setItem('pokeplex-cart', JSON.stringify(cart));
}

function getCartProducts() {
  return cart
    .map(id => products.find(product => String(product.id) === String(id)))
    .filter(Boolean)
    .filter(product => product.status === 'available');
}

function getCartTotal() {
  return getCartProducts().reduce(
    (total, product) => total + Number(product.price || 0),
    0
  );
}

function getCartCount() {
  return getCartProducts().length;
}

function showToast(message) {
  let toast = document.getElementById('pokeplexToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pokeplexToast';

    toast.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 90px;
      transform: translateX(-50%);
      z-index: 10000;
      background: #111827;
      color: white;
      padding: 12px 18px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0,0,0,.25);
      font-weight: 700;
    `;

    document.body.appendChild(toast);
  }

  toast.textContent = '✓ ' + message;

  clearTimeout(window.__pokeplexToastTimer);

  window.__pokeplexToastTimer = setTimeout(() => {
    toast.remove();
  }, 2200);
}

function addToCart(productId) {
  const id = String(productId);

  const product = products.find(
    item => String(item.id) === id
  );

  if (!product) return;

  if (product.status !== 'available') {
    showToast('Cette carte n’est plus disponible.');
    return;
  }

  if (!cart.includes(id)) {
    cart.push(id);
    saveCart();
    showToast(`${product.name} a été ajouté au panier.`);
  } else {
    showToast(`${product.name} est déjà dans le panier.`);
  }

  render();
}

function removeFromCart(productId) {
  const id = String(productId);

  cart = cart.filter(item => String(item) !== id);

  saveCart();

  render();
  openCart();
}

function updateCartBar() {
  let cartBar = document.getElementById('pokeplexCartBar');

  if (!cartBar) {
    cartBar = document.createElement('div');
    cartBar.id = 'pokeplexCartBar';

    cartBar.style.cssText = `
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #111827;
      color: white;
      padding: 12px 16px;
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,.25);
      font-weight: 600;
    `;

    document.body.appendChild(cartBar);
  }

  const count = getCartCount();
  const total = getCartTotal();

  cartBar.innerHTML = `
    <span>
      🛒 ${count} carte${count > 1 ? 's' : ''}
      · ${total.toFixed(2)} $ CAD
    </span>

    <button
      type="button"
      id="pokeplexOpenCart"
      style="
        border: 0;
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
        font-weight: 700;
      "
    >
      Voir le panier
    </button>
  `;

  cartBar
    .querySelector('#pokeplexOpenCart')
    ?.addEventListener('click', openCart);
}

function createCartDialog() {
  if (document.getElementById('pokeplexCartDialog')) return;

  const dialog = document.createElement('dialog');

  dialog.id = 'pokeplexCartDialog';
  dialog.className = 'buy-dialog';

  dialog.innerHTML = `
    <div class="dialog-card">

      <button
        type="button"
        class="close-btn"
        id="pokeplexCartClose"
        aria-label="Fermer"
      >
        ×
      </button>

      <p class="eyebrow">🛒 PANIER</p>

      <h2>Mon panier</h2>

      <div id="pokeplexCartItems"></div>

      <div class="account-info">
        <strong>Total :
          <span id="pokeplexCartTotal">0.00 $ CAD</span>
        </strong>

        <span>
          📍 Achat et récupération sur place :
          <strong>966 rue Lapalme</strong>
        </span>

        <span>
          💵 Paiement en argent comptant sur place.
          Aucun paiement en ligne.
        </span>
      </div>

      <button
        type="button"
        class="primary-btn"
        id="pokeplexCheckoutBtn"
      >
        Je veux acheter
      </button>

    </div>
  `;

  document.body.appendChild(dialog);

  dialog
    .querySelector('#pokeplexCartClose')
    ?.addEventListener('click', () => dialog.close());

  dialog
    .querySelector('#pokeplexCheckoutBtn')
    ?.addEventListener('click', () => {
      dialog.close();
      openCheckout();
    });
}

function openCart() {
  createCartDialog();

  const dialog = document.getElementById('pokeplexCartDialog');
  const items = document.getElementById('pokeplexCartItems');
  const total = document.getElementById('pokeplexCartTotal');
  const checkoutBtn = document.getElementById('pokeplexCheckoutBtn');

  const cartProducts = getCartProducts();

  if (!cartProducts.length) {
    items.innerHTML = `
      <p class="small-note">
        Ton panier est vide.
      </p>
    `;

    total.textContent = '0.00 $ CAD';
    checkoutBtn.disabled = true;
  } else {
    items.innerHTML = cartProducts
      .map(product => `
        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            padding:12px 0;
            border-bottom:1px solid rgba(0,0,0,.1);
          "
        >
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <div class="small-note">
              ${Number(product.price).toFixed(2)} $ CAD
            </div>
          </div>

          <button
            type="button"
            data-remove-cart="${escapeHtml(String(product.id))}"
            style="
              border:0;
              background:none;
              cursor:pointer;
              font-size:20px;
            "
            aria-label="Retirer"
          >
            🗑️
          </button>
        </div>
      `)
      .join('');

    items.querySelectorAll('[data-remove-cart]')
      .forEach(button => {
        button.addEventListener('click', () => {
          removeFromCart(button.dataset.removeCart);
        });
      });

    total.textContent =
      `${getCartTotal().toFixed(2)} $ CAD`;

    checkoutBtn.disabled = false;
  }

  dialog.showModal();
}

/* =========================================================
   COMPTE CLIENT
========================================================= */

function setMessage(element, message, isError = false) {
  if (!element) return;

  element.textContent = message || '';
  element.classList.toggle('error-text', isError);
}

function updateCustomerUI(session) {
  customerSession = session || null;

  const user = customerSession?.user;

  if (user) {
    const name =
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'client';

    if (customerDisplayName) {
      customerDisplayName.textContent = name;
    }

    if (customerEmailDisplay) {
      customerEmailDisplay.textContent =
        user.email || '';
    }

    accountLoggedOut?.classList.add('hidden');
    accountLoggedIn?.classList.remove('hidden');

    if (accountBtn) {
      accountBtn.textContent = '👤 ' + name;
    }
  } else {
    accountLoggedIn?.classList.add('hidden');
    accountLoggedOut?.classList.remove('hidden');

    if (accountBtn) {
      accountBtn.textContent = '👤 Mon compte';
    }
  }
}

async function initCustomerAuth() {
  if (!SUPABASE_READY) {
    updateCustomerUI(null);
    return;
  }

  const { data } =
    await supabase.auth.getSession();

  updateCustomerUI(data.session);

  supabase.auth.onAuthStateChange(
    (_event, session) => {
      updateCustomerUI(session);
    }
  );
}

accountBtn?.addEventListener('click', event => {
  event.preventDefault();
  accountDialog?.showModal();
});

closeAccountBtn?.addEventListener('click', () => {
  accountDialog?.close();
});

document
  .querySelectorAll('[data-account-tab]')
  .forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.accountTab;

      document
        .querySelectorAll('[data-account-tab]')
        .forEach(item => {
          item.classList.toggle(
            'active',
            item === button
          );
        });

      loginForm?.classList.toggle(
        'hidden',
        tab !== 'login'
      );

      signupForm?.classList.toggle(
        'hidden',
        tab !== 'signup'
      );

      setMessage(loginMessage, '');
      setMessage(signupMessage, '');
    });
  });

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!SUPABASE_READY) {
    setMessage(
      loginMessage,
      'Supabase n’est pas configuré.',
      true
    );
    return;
  }

  setMessage(
    loginMessage,
    'Connexion en cours…'
  );

  const email =
    document.getElementById(
      'customerLoginEmail'
    )?.value.trim();

  const password =
    document.getElementById(
      'customerLoginPassword'
    )?.value || '';

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    setMessage(
      loginMessage,
      error.message,
      true
    );
    return;
  }

  setMessage(
    loginMessage,
    'Connexion réussie.'
  );

  setTimeout(() => {
    accountDialog?.close();
  }, 500);
});

signupForm?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!SUPABASE_READY) {
    setMessage(
      signupMessage,
      'Supabase n’est pas configuré.',
      true
    );
    return;
  }

  setMessage(
    signupMessage,
    'Création du compte…'
  );

  const full_name =
    document.getElementById(
      'customerSignupName'
    )?.value.trim();

  const email =
    document.getElementById(
      'customerSignupEmail'
    )?.value.trim();

  const password =
    document.getElementById(
      'customerSignupPassword'
    )?.value || '';

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

  if (error) {
    setMessage(
      signupMessage,
      error.message,
      true
    );
    return;
  }

  if (!data.session) {
    setMessage(
      signupMessage,
      'Compte créé. Vérifie ton courriel pour confirmer ton adresse.'
    );
  } else {
    setMessage(
      signupMessage,
      'Compte créé et connexion réussie.'
    );

    setTimeout(() => {
      accountDialog?.close();
    }, 700);
  }
});

customerLogoutBtn?.addEventListener(
  'click',
  async () => {
    if (!SUPABASE_READY) return;

    await supabase.auth.signOut();

    accountDialog?.close();
  }
);

/* =========================================================
   CATALOGUE
========================================================= */

async function loadProducts() {
  if (!SUPABASE_READY) {
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state">
          Le catalogue sera disponible après la configuration Supabase.
        </div>
      `;
    }

    return;
  }

  const { data, error } =
    await supabase
      .from('products')
      .select('*')
      .order('created_at', {
        ascending: false
      });

  if (error) {
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state">
          Impossible de charger les cartes.
        </div>
      `;
    }

    return;
  }

  products = data || [];

  cart = cart.filter(id =>
    products.some(
      product =>
        String(product.id) === String(id) &&
        product.status === 'available'
    )
  );

  saveCart();

  render();
}

function render() {
  const query =
    search?.value.trim().toLowerCase() || '';

  const status =
    filter?.value || 'available';

  const visible =
    products.filter(product => {
      const matchesSearch =
        !query ||
        `${product.name} ${product.description || ''}`
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === 'all' ||
        product.status === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  if (empty) {
    empty.classList.toggle(
      'hidden',
      visible.length > 0
    );
  }

  if (grid) {
    grid.innerHTML =
      visible
        .map(cardHtml)
        .join('');

    grid
      .querySelectorAll('[data-cart-add]')
      .forEach(button => {
        button.addEventListener(
          'click',
          () => {
            addToCart(button.dataset.cartAdd);
          }
        );
      });

    grid
      .querySelectorAll('[data-buy-now]')
      .forEach(button => {
        button.addEventListener(
          'click',
          () => {
            addToCart(button.dataset.buyNow);
            openCheckout();
          }
        );
      });
  }

  updateCartBar();
}

function cardHtml(product) {
  const unavailable =
    product.status !== 'available';

  const badge =
    product.status === 'reserved'
      ? 'Réservée'
      : product.status === 'sold'
        ? 'Vendue'
        : 'Disponible';

  const inCart =
    cart.includes(String(product.id));

  return `
    <article class="product-card">

      <div class="product-image-wrap">

        <img
          class="product-image"
          src="${escapeHtml(product.image_url || '')}"
          alt="${escapeHtml(product.name)}"
          loading="lazy"
        />

        <span class="status-badge">
          ${badge}
        </span>

      </div>

      <div class="product-body">

        <div class="product-name">
          ${escapeHtml(product.name)}
        </div>

        <div class="product-description">
          ${escapeHtml(product.description || '')}
        </div>

        <div class="price">
          ${Number(product.price).toFixed(2)} $ CAD
        </div>

        <button
          class="primary-btn"
          type="button"
          data-cart-add="${escapeHtml(String(product.id))}"
          ${unavailable ? 'disabled' : ''}
        >
          ${
            unavailable
              ? 'Indisponible'
              : inCart
                ? '✓ Dans le panier'
                : '🛒 Mettre dans le panier'
          }
        </button>

        ${
          !unavailable
            ? `
              <button
                class="secondary-btn"
                type="button"
                data-buy-now="${escapeHtml(String(product.id))}"
              >
                Acheter maintenant
              </button>
            `
            : ''
        }

      </div>

    </article>
  `;
}

/* =========================================================
   ACHAT / RESERVATION
========================================================= */

function createCheckoutDialog() {
  if (
    document.getElementById(
      'pokeplexCheckoutDialog'
    )
  ) {
    return;
  }

  const dialog =
    document.createElement('dialog');

  dialog.id =
    'pokeplexCheckoutDialog';

  dialog.className =
    'buy-dialog';

  dialog.innerHTML = `
    <form
      id="pokeplexCheckoutForm"
      class="dialog-card"
    >

      <button
        type="button"
        class="close-btn"
        id="pokeplexCheckoutClose"
        aria-label="Fermer"
      >
        ×
      </button>

      <p class="eyebrow">
        ACHAT SUR PLACE
      </p>

      <h2>
        Je veux acheter 🛒
      </h2>

      <p class="small-note">
        Tes cartes seront réservées pour toi.
      </p>

      <div class="account-info">

        <strong>
          Total :
          <span id="pokeplexCheckoutTotal">
            0.00 $ CAD
          </span>
        </strong>

        <span>
          📍 <strong>966 rue Lapalme</strong>
        </span>

        <span>
          💵 Paiement sur place.
          Aucun paiement en ligne.
        </span>

      </div>

      <p>
        Compte :
        <strong id="pokeplexBuyerEmail"></strong>
      </p>

      <label>
        Ton nom

        <input
          id="pokeplexBuyerName"
          type="text"
          required
          maxlength="80"
          placeholder="Ex. Alex"
        />
      </label>

      <label>
        Ton numéro de téléphone

        <input
          id="pokeplexBuyerPhone"
          type="tel"
          required
          maxlength="40"
          placeholder="Ex. 514-555-1234"
        />
      </label>

      <button
        id="pokeplexConfirmCheckout"
        class="primary-btn"
        type="submit"
      >
        Confirmer ma réservation
      </button>

      <p
        id="pokeplexCheckoutMessage"
        class="small-note"
      ></p>

    </form>
  `;

  document.body.appendChild(dialog);

  dialog
    .querySelector('#pokeplexCheckoutClose')
    ?.addEventListener(
      'click',
      () => dialog.close()
    );

  dialog
    .querySelector('#pokeplexCheckoutForm')
    ?.addEventListener(
      'submit',
      reserveCart
    );
}

function openCheckout() {
  if (!getCartProducts().length) {
    showToast('Ton panier est vide.');
    return;
  }

  if (!customerSession?.user) {
    accountDialog?.showModal();

    setMessage(
      loginMessage,
      'Connecte-toi ou crée ton compte avant de réserver.'
    );

    return;
  }

  createCheckoutDialog();

  const dialog =
    document.getElementById(
      'pokeplexCheckoutDialog'
    );

  const nameInput =
    document.getElementById(
      'pokeplexBuyerName'
    );

  const email =
    document.getElementById(
      'pokeplexBuyerEmail'
    );

  const total =
    document.getElementById(
      'pokeplexCheckoutTotal'
    );

  const message =
    document.getElementById(
      'pokeplexCheckoutMessage'
    );

  nameInput.value =
    customerSession.user.user_metadata
      ?.full_name || '';

  email.textContent =
    customerSession.user.email || '';

  total.textContent =
    `${getCartTotal().toFixed(2)} $ CAD`;

  message.textContent = '';

  dialog.showModal();
}

async function reserveCart(event) {
  event.preventDefault();

  if (!customerSession?.user) {
    return;
  }

  const button =
    document.getElementById(
      'pokeplexConfirmCheckout'
    );

  const message =
    document.getElementById(
      'pokeplexCheckoutMessage'
    );

  const name =
    document.getElementById(
      'pokeplexBuyerName'
    )?.value.trim();

  const phone =
    document.getElementById(
      'pokeplexBuyerPhone'
    )?.value.trim();

  if (!name || !phone) {
    message.textContent =
      'Entre ton nom et ton téléphone.';
    return;
  }

  if (!SUPABASE_READY) {
    message.textContent =
      'Supabase n’est pas configuré.';
    return;
  }

  const cartProducts =
    getCartProducts();

  if (!cartProducts.length) {
    message.textContent =
      'Ton panier est vide.';
    return;
  }

  button.disabled = true;

  message.textContent =
    'Réservation en cours…';

  const reservedProducts = [];

  for (const product of cartProducts) {
    const { error } =
      await supabase.rpc(
        'reserve_product',
        {
          p_product_id: product.id,
          p_buyer_name: name,
          p_buyer_phone: phone
        }
      );

    if (error) {
      button.disabled = false;

      message.textContent =
        `Impossible de réserver ${product.name}. ` +
        `La carte a peut-être déjà été réservée.`;

      await loadProducts();

      return;
    }

    reservedProducts.push(product);
  }

  const total =
    reservedProducts.reduce(
      (sum, product) =>
        sum + Number(product.price || 0),
      0
    );

  const names =
    reservedProducts
      .map(product =>
        escapeHtml(product.name)
      )
      .join(', ');

  cart = [];

  saveCart();

  document
    .getElementById(
      'pokeplexCheckoutDialog'
    )
    ?.close();

  const successText =
    document.getElementById(
      'successText'
    );

  if (successText) {
    successText.innerHTML = `
      Ta réservation est enregistrée ! 🎉

      <br><br>

      <strong>
        ${names}
      </strong>

      <br><br>

      Total :
      <strong>
        ${total.toFixed(2)} $ CAD
      </strong>

      <br><br>

      📍 Achat et récupération sur place :
      <strong>
        966 rue Lapalme
      </strong>

      <br><br>

      💵 Paiement en argent comptant sur place.

      <br><br>

      Compte :
      ${escapeHtml(
        customerSession.user.email || ''
      )}
    `;
  }

  successDialog?.showModal();

  button.disabled = false;

  await loadProducts();
}

/* =========================================================
   RECHERCHE / COMPATIBILITE
========================================================= */

search?.addEventListener(
  'input',
  render
);

filter?.addEventListener(
  'change',
  render
);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
}

/* =========================================================
   LANCEMENT
========================================================= */

createCartDialog();
initCustomerAuth();
loadProducts();
updateCartBar();
      
