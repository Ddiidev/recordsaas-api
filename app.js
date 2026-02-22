// ======================== CONFIG ========================
const API_BASE = window.location.origin;
const GOOGLE_CLIENT_ID = '358891470255-7h1kggp8d1io8947nll6kq51815nbpgp.apps.googleusercontent.com'; // Will be set via env or directly

// ======================== STATE ========================
let currentRegion = 'global';
let currentUser = null;
let sessionToken = null;

const PRICES = {
  pro: { global: 10, br: 5 },
  lifetime: { global: 87, br: 35 },
};

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
}

// ======================== GOOGLE AUTH ========================
function handleGoogleLogin() {
  const clientId = GOOGLE_CLIENT_ID || document.querySelector('meta[name="google-client-id"]')?.content;

  if (!clientId) {
    console.error('Google Client ID not configured');
    alert('Google login is being configured. Please try again later.');
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
    auto_select: false,
  });

  google.accounts.id.prompt();
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
    authContainer.innerHTML = `
      <button class="btn btn-google" id="btn-google-login" onclick="handleGoogleLogin()">
        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Login with Google
      </button>
    `;
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

  initScrollAnimations();
});
