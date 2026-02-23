// ======================== CONFIG ========================
const API_BASE = window.location.origin;
const GOOGLE_CLIENT_ID = '358891470255-7h1kggp8d1io8947nll6kq51815nbpgp.apps.googleusercontent.com'; // Will be set via env or directly

// ======================== STATE ========================
let currentRegion = 'global';
let currentUser = null;
let sessionToken = null;

const PRICES = {
  pro: { global: 10, br: 27 },
  lifetime: { global: 87, br: 177 },
};

const CURRENCY = { global: '$', br: 'R$' };

// ======================== REGION TOGGLE ========================
function setRegion(region) {
  currentRegion = region;
  updatePricingUI();
}

function toggleRegion() {
  currentRegion = currentRegion === 'global' ? 'br' : 'global';
  updatePricingUI();
}

function updatePricingUI() {
  const toggle = document.getElementById('region-toggle');
  const labelGlobal = document.getElementById('label-global');
  const labelBr = document.getElementById('label-br');
  const pricePro = document.getElementById('price-pro');
  const priceLifetime = document.getElementById('price-lifetime');

  if (currentRegion === 'br') {
    toggle.classList.add('active');
    labelGlobal.classList.remove('active');
    labelBr.classList.add('active');
  } else {
    toggle.classList.remove('active');
    labelGlobal.classList.add('active');
    labelBr.classList.remove('active');
  }

  pricePro.textContent = PRICES.pro[currentRegion];
  priceLifetime.textContent = PRICES.lifetime[currentRegion];

  // Update currency symbols
  document.querySelectorAll('.pricing-currency').forEach(el => {
    el.textContent = CURRENCY[currentRegion];
  });
}

// ======================== GOOGLE AUTH ========================
function initGoogleSignIn() {
  const clientId = GOOGLE_CLIENT_ID;
  if (!clientId || typeof google === 'undefined') return;

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
    auto_select: false,
  });

  // Render Google's official button into the navbar container
  const container = document.getElementById('g-btn-container');
  if (container) {
    google.accounts.id.renderButton(container, {
      type: 'standard',
      shape: 'pill',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      logo_alignment: 'left',
    });
  }
}

async function handleGoogleCredential(response) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await res.json();
    currentUser = data.user;
    sessionToken = data.sessionToken;

    // Save to localStorage
    localStorage.setItem('recordsaas_session', sessionToken);
    localStorage.setItem('recordsaas_user', JSON.stringify(currentUser));

    updateAuthUI();

    // If user has a license, show a notification
    if (data.license.active) {
      showNotification(`Welcome back! Your ${data.license.plan} plan is active.`, 'success');
    }
  } catch (error) {
    console.error('Google auth error:', error);
    showNotification('Login failed. Please try again.', 'error');
  }
}

function logout() {
  currentUser = null;
  sessionToken = null;
  localStorage.removeItem('recordsaas_session');
  localStorage.removeItem('recordsaas_user');
  updateAuthUI();
}

function updateAuthUI() {
  const authContainer = document.getElementById('navbar-auth');

  if (currentUser) {
    authContainer.innerHTML = `
      <div class="user-menu">
        <img src="${currentUser.picture || ''}" alt="${currentUser.name}" class="user-avatar" referrerpolicy="no-referrer">
        <span class="user-name">${currentUser.name}</span>
        <button class="btn btn-ghost" onclick="logout()" style="padding: 6px 12px; font-size: 0.8rem;">Logout</button>
      </div>
    `;
  } else {
    // Show Google's rendered button
    authContainer.innerHTML = `<div id="g-btn-container"></div>`;
    // Re-render the Google button after DOM update
    setTimeout(() => initGoogleSignIn(), 50);
  }
}

// ======================== CHECKOUT ========================
async function checkout(plan) {
  const email = currentUser?.email;

  if (!email) {
    // If not logged in, prompt login first
    showNotification('Please login with Google first to purchase.', 'info');
    handleGoogleLogin();
    return;
  }

  try {
    const locale = currentRegion === 'br' ? 'pt-BR' : 'en-US';

    const res = await fetch(`${API_BASE}/api/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify({ email, plan, locale }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Checkout failed');
    }

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    showNotification('Failed to start checkout. Please try again.', 'error');
  }
}

// ======================== NOTIFICATIONS ========================
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const colors = {
    success: 'hsl(154, 60%, 42%)',
    error: 'hsl(0, 72%, 58%)',
    info: 'hsl(215, 60%, 50%)',
  };

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: ${colors[type]};
    color: #fff;
    padding: 14px 24px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 1000;
    animation: fadeInUp 0.3s ease-out;
    max-width: 360px;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ======================== SCROLL ANIMATIONS ========================
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.feature-card, .pricing-card').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
}

// ======================== INIT ========================
document.addEventListener('DOMContentLoaded', () => {
  // Restore session from localStorage
  const savedToken = localStorage.getItem('recordsaas_session');
  const savedUser = localStorage.getItem('recordsaas_user');

  if (savedToken && savedUser) {
    sessionToken = savedToken;
    currentUser = JSON.parse(savedUser);
    updateAuthUI();

    // Verify session is still valid
    fetch(`${API_BASE}/api/auth/status`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          logout(); // Session expired
        }
      })
      .catch(() => {
        // Silently fail — user stays logged in with cached data
      });
  }

  // Auto-detect region by browser language
  const lang = navigator.language || navigator.userLanguage || '';
  if (lang.toLowerCase().includes('pt')) {
    setRegion('br');
  }

  // Initialize Google Sign-In button (if not already logged in)
  if (!currentUser) {
    initGoogleSignIn();
  }

  initScrollAnimations();
});
