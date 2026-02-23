// ======================== CONFIG ========================
const API_BASE = window.location.origin;
const GOOGLE_CLIENT_ID = '358891470255-7h1kggp8d1io8947nll6kq51815nbpgp.apps.googleusercontent.com';

// ======================== STATE ========================
let currentRegion = 'global';
let currentLang = 'en';
let currentTheme = 'system';
let currentUser = null;
let sessionToken = null;

const PRICES = {
  pro: { global: 10, br: 27 },
  lifetime: { global: 87, br: 177 },
};

const CURRENCY = { global: '$', br: 'R$' };

// ======================== I18N ========================
const I18N = {
  en: {
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.account': 'Account',
    'hero.badge': 'Product Demo Video Engine',
    'hero.title': 'Record. Explain.<br><span class="highlight">Convert Faster.</span>',
    'hero.subtitle': 'RecordSaaS turns complex SaaS workflows into clear, interactive videos that increase engagement and improve conversion.',
    'hero.cta': 'Create a SaaS Demo',
    'features.title': 'Resources that sell your SaaS',
    'features.subtitle': 'Everything you need to create product videos that are easy to follow, hard to ignore, and focused on results.',
    'features.capture.title': 'Focused Capture',
    'features.capture.desc': 'Capture full screen, a window, or a custom area with multi-monitor support to show exactly what matters.',
    'features.webcam.title': 'Human Connection',
    'features.webcam.desc': 'Add webcam presence to build trust and guide prospects through the product in a direct, credible way.',
    'features.tracking.title': 'Guided Attention',
    'features.tracking.desc': 'Keep viewers focused on key actions and interface areas to explain complex flows with clarity.',
    'features.timeline.title': 'Multi-Track Storytelling',
    'features.timeline.desc': 'Combine screen, webcam, and assets in a multi-lane timeline to build interactive, high-impact demos.',
    'features.blur.title': 'Data-Safe Demos',
    'features.blur.desc': 'Blur sensitive details instantly to demo real environments without exposing customer data.',
    'features.export.title': 'Fast Publishing',
    'features.export.desc': 'Export in MP4 or GIF with hardware acceleration so your sales and marketing teams move faster.',
    'pricing.title': 'Simple, transparent pricing',
    'pricing.subtitle': 'Choose the plan that fits your workflow. Cancel anytime if you change your mind.',
    'pricing.pro.name': 'Pro Monthly',
    'pricing.pro.desc': 'Full access to all Pro features, billed monthly.',
    'pricing.pro.period': '/month',
    'pricing.pro.note': 'Cancel anytime, no questions asked.',
    'pricing.pro.f1': 'All recording features + Presets',
    'pricing.pro.f2': 'Multi-lane timeline editor',
    'pricing.pro.f3': 'GPU-accelerated export up to 4K',
    'pricing.pro.f4': 'Priority support',
    'pricing.pro.cta': 'Subscribe',
    'pricing.lifetime.name': 'Lifetime',
    'pricing.lifetime.desc': 'One-time payment, all Pro features forever.',
    'pricing.lifetime.period': 'one-time payment',
    'pricing.lifetime.note': 'Pay once, use forever. Free updates included.',
    'pricing.lifetime.f1': 'Everything in Pro Monthly',
    'pricing.lifetime.f2': 'Lifetime license — no renewals',
    'pricing.lifetime.f3': 'Current version + 5 major updates',
    'pricing.lifetime.tooltip': 'Includes current version and next 5 major updates. Subsequent versions are optional and will cost just $1.00.',
    'pricing.lifetime.f4': 'Priority support forever',
    'pricing.lifetime.cta': 'Buy Lifetime',
    'cta.title': 'Ready to <span class="highlight">increase conversion</span> with product demos?',
    'cta.subtitle': 'Turn complex SaaS features into engaging videos that shorten sales cycles.',
    'cta.btn': 'Start Your Demo',
  },
  'pt-BR': {
    'nav.features': 'Recursos',
    'nav.pricing': 'Preços',
    'nav.account': 'Conta',
    'hero.badge': 'Motor de Vídeos para Demo de SaaS',
    'hero.title': 'Grave. Explique.<br><span class="highlight">Converta Mais.</span>',
    'hero.subtitle': 'O RecordSaaS transforma fluxos complexos de SaaS em vídeos claros e interativos que aumentam o engajamento e a conversão.',
    'hero.cta': 'Criar uma Demo',
    'features.title': 'Recursos que vendem seu SaaS',
    'features.subtitle': 'Tudo o que você precisa para criar vídeos de produto fáceis de entender, difíceis de ignorar e focados em resultado.',
    'features.capture.title': 'Captura Objetiva',
    'features.capture.desc': 'Grave tela inteira, janela ou área personalizada com múltiplos monitores para mostrar o que realmente importa.',
    'features.webcam.title': 'Conexão Humana',
    'features.webcam.desc': 'Adicione presença da câmera para gerar confiança e conduzir o prospect de forma direta.',
    'features.tracking.title': 'Atenção Guiada',
    'features.tracking.desc': 'Direcione o olhar do público para ações-chave e áreas críticas da interface.',
    'features.timeline.title': 'Narrativa em Múltiplas Camadas',
    'features.timeline.desc': 'Combine tela, webcam e materiais em uma timeline multi-faixa para demos mais envolventes.',
    'features.blur.title': 'Demos com Dados Protegidos',
    'features.blur.desc': 'Desfoque informações sensíveis na hora e apresente ambientes reais com segurança.',
    'features.export.title': 'Publicação Rápida',
    'features.export.desc': 'Exporte em MP4 ou GIF com aceleração por hardware e acelere o ciclo comercial.',
    'pricing.title': 'Preços simples e transparentes',
    'pricing.subtitle': 'Escolha o plano que se encaixa no seu fluxo. Cancele quando quiser.',
    'pricing.pro.name': 'Pro Mensal',
    'pricing.pro.desc': 'Acesso total a todos os recursos Pro, cobrado mensalmente.',
    'pricing.pro.period': '/mês',
    'pricing.pro.note': 'Cancele quando quiser, sem perguntas.',
    'pricing.pro.f1': 'Todos os recursos + Presets',
    'pricing.pro.f2': 'Editor com timeline multi-faixa',
    'pricing.pro.f3': 'Exportação com GPU até 4K',
    'pricing.pro.f4': 'Suporte prioritário',
    'pricing.pro.cta': 'Assinar',
    'pricing.lifetime.name': 'Vitalício',
    'pricing.lifetime.desc': 'Pagamento único, todos os recursos Pro para sempre.',
    'pricing.lifetime.period': 'pagamento único',
    'pricing.lifetime.note': 'Pague uma vez, use para sempre. Atualizações inclusas.',
    'pricing.lifetime.f1': 'Tudo do Pro Mensal',
    'pricing.lifetime.f2': 'Licença vitalícia — sem renovações',
    'pricing.lifetime.f3': 'Versão atual + 5 grandes atualizações',
    'pricing.lifetime.tooltip': 'Inclui a versão atual e as próximas 5 atualizações principais. Versões subsequentes são opcionais por R$ 1,00.',
    'pricing.lifetime.f4': 'Suporte prioritário para sempre',
    'pricing.lifetime.cta': 'Comprar Vitalício',
    'cta.title': 'Pronto para <span class="highlight">aumentar conversão</span> com demos de produto?',
    'cta.subtitle': 'Transforme funcionalidades complexas em vídeos que encurtam o ciclo de vendas.',
    'cta.btn': 'Começar a Demo',
  },
};

function t(key) {
  return I18N[currentLang]?.[key] || I18N['en'][key] || key;
}

function applyI18n() {
  // Text content elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // HTML content elements (for titles with <span> tags)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });

  // Update lang attr on html
  document.documentElement.lang = currentLang === 'pt-BR' ? 'pt-BR' : 'en';

  // Update language switch display
  const langFlag = document.getElementById('lang-flag');
  const langCode = document.getElementById('lang-code');
  if (langFlag) {
    langFlag.innerHTML = currentLang === 'pt-BR' 
      ? '<img src="https://flagcdn.com/w20/br.png" alt="BR">' 
      : '<img src="https://flagcdn.com/w20/us.png" alt="EN">';
  }
  if (langCode) langCode.textContent = currentLang === 'pt-BR' ? 'PT' : 'EN';

  // Update dropdown active states
  document.querySelectorAll('.lang-option').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById(currentLang === 'pt-BR' ? 'btn-lang-pt' : 'btn-lang-en');
  if (activeBtn) activeBtn.classList.add('active');
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('recordsaas_lang', lang);
  // Auto-sync region to language
  currentRegion = lang === 'pt-BR' ? 'br' : 'global';
  applyI18n();
  updatePricingUI();
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) langSwitch.classList.remove('open');
}

function toggleLangMenu(event) {
  if (event) event.preventDefault();
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) langSwitch.classList.toggle('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch && !langSwitch.contains(e.target)) {
    langSwitch.classList.remove('open');
  }
  const themeSwitch = document.getElementById('theme-switch');
  if (themeSwitch && !themeSwitch.contains(e.target)) {
    themeSwitch.classList.remove('open');
  }
});

// ======================== THEMES ========================
function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  // Show/hide the correct SVG icon in the theme button
  const icons = ['light', 'dark', 'system'];
  icons.forEach(name => {
    const el = document.getElementById('icon-' + name);
    if (el) el.style.display = name === currentTheme ? 'block' : 'none';
  });

  document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById('btn-theme-' + currentTheme);
  if (activeBtn) activeBtn.classList.add('active');
}

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('recordsaas_theme', theme);
  applyTheme();
  const themeSwitch = document.getElementById('theme-switch');
  if (themeSwitch) themeSwitch.classList.remove('open');
}

function toggleThemeMenu(event) {
  if (event) event.preventDefault();
  const themeSwitch = document.getElementById('theme-switch');
  if (themeSwitch) themeSwitch.classList.toggle('open');
}

function detectTheme() {
  const saved = localStorage.getItem('recordsaas_theme');
  return saved || 'system';
}

function detectLang() {
  // 1. Check saved preference
  const saved = localStorage.getItem('recordsaas_lang');
  if (saved && (saved === 'en' || saved === 'pt-BR')) {
    return saved;
  }

  // 2. Auto-detect from browser
  const browserLang = navigator.language || navigator.userLanguage || '';
  if (browserLang.toLowerCase().startsWith('pt')) {
    return 'pt-BR';
  }

  return 'en';
}

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

  if (toggle) {
    if (currentRegion === 'br') {
      toggle.classList.add('active');
      if (labelGlobal) labelGlobal.classList.remove('active');
      if (labelBr) labelBr.classList.add('active');
    } else {
      toggle.classList.remove('active');
      if (labelGlobal) labelGlobal.classList.add('active');
      if (labelBr) labelBr.classList.remove('active');
    }
  }

  if (pricePro) pricePro.textContent = PRICES.pro[currentRegion];
  if (priceLifetime) priceLifetime.textContent = PRICES.lifetime[currentRegion];

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

  const container = document.getElementById('g-btn-container');
  if (container && !container.dataset.rendered) {
    google.accounts.id.renderButton(container, {
      type: 'standard',
      shape: 'pill',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      logo_alignment: 'left',
    });
    container.dataset.rendered = 'true';
  }
}

function generateLoginToken() {
  if (window.crypto?.getRandomValues) {
    const buf = new Uint8Array(16);
    window.crypto.getRandomValues(buf);
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function startGoogleRedirectLogin() {
  if (!GOOGLE_CLIENT_ID) {
    showNotification(
      currentLang === 'pt-BR'
        ? 'Login do Google indisponível no momento.'
        : 'Google login is unavailable right now.',
      'error'
    );
    return;
  }

  const host = window.location.hostname || '';
  const protocol = host.endsWith('netlify.app') ? 'https:' : window.location.protocol;
  const origin = `${protocol}//${host}${window.location.port ? `:${window.location.port}` : ''}`;
  const redirectUri = `${origin}/auth/google/`;
  const state = generateLoginToken();
  const nonce = generateLoginToken();
  localStorage.setItem('recordsaas_oauth_state', state);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('response_mode', 'fragment');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('state', state);

  window.location.assign(url.toString());
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

    const pendingPlan = localStorage.getItem('recordsaas_pending_checkout');
    if (pendingPlan) {
      localStorage.removeItem('recordsaas_pending_checkout');
      await checkout(pendingPlan);
      return;
    }

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
  const navAccount = document.getElementById('nav-account');

  if (currentUser) {
    if (navAccount) navAccount.style.display = 'inline-flex';
    authContainer.innerHTML = `
      <div class="user-menu">
        <a href="/account/" style="display: flex;">
          <img src="${currentUser.picture || ''}" alt="${currentUser.name}" class="user-avatar" referrerpolicy="no-referrer" style="cursor: pointer;">
        </a>
        <span class="user-name">${currentUser.name}</span>
        <button class="btn btn-ghost" onclick="logout()" style="padding: 6px 12px; font-size: 0.8rem;">Logout</button>
      </div>
    `;
  } else {
    if (navAccount) navAccount.style.display = 'none';
    const label = currentLang === 'pt-BR' ? 'Entrar com Google' : 'Sign in with Google';
    authContainer.innerHTML = `
      <button class="btn btn-ghost btn-google" onclick="openGoogleLogin()">
        <svg class="google-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.4 1.2 8.7 3.2l6.5-6.5C35.7 2.8 30.3 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.6 5.9C12.1 12.9 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.7c-.6 3.1-2.3 5.7-4.9 7.5l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17.7z"/>
          <path fill="#FBBC05" d="M10.1 28.7c-.6-1.8-1-3.8-1-5.8s.4-4 1-5.8l-7.6-5.9C.9 14.7 0 19.2 0 24c0 4.8.9 9.3 2.5 13.8l7.6-5.9z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.5-5.8c-2.1 1.4-4.7 2.2-8.1 2.2-6.4 0-11.9-3.4-13.9-8.2l-7.6 5.9C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        ${label}
      </button>
    `;
  }
}

function openGoogleLogin() {
  startGoogleRedirectLogin();
}

function startCheckoutLogin(plan) {
  localStorage.setItem('recordsaas_pending_checkout', plan);
  openGoogleLogin();
}

// ======================== CHECKOUT ========================
async function checkout(plan) {
  const email = currentUser?.email;

  if (!email) {
    startCheckoutLogin(plan);
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
    showNotification(currentLang === 'pt-BR' ? 'Falha ao iniciar o checkout. Tente novamente.' : 'Failed to start checkout. Please try again.', 'error');
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
  // Detect and apply theme
  currentTheme = detectTheme();
  applyTheme();

  // Detect and apply language
  currentLang = detectLang();

  // Auto-detect region by language
  if (currentLang === 'pt-BR') {
    currentRegion = 'br';
  }

  applyI18n();
  updatePricingUI();
  updateAuthUI();

  // Restore session from localStorage
  const savedToken = localStorage.getItem('recordsaas_session');
  const savedUser = localStorage.getItem('recordsaas_user');

  if (savedToken && savedUser) {
    sessionToken = savedToken;
    currentUser = JSON.parse(savedUser);
    updateAuthUI();

    const pendingPlan = localStorage.getItem('recordsaas_pending_checkout');
    if (pendingPlan) {
      localStorage.removeItem('recordsaas_pending_checkout');
      checkout(pendingPlan);
    }

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

  initScrollAnimations();

  const loginError = localStorage.getItem('recordsaas_login_error');
  if (loginError) {
    localStorage.removeItem('recordsaas_login_error');
    showNotification(
      currentLang === 'pt-BR'
        ? 'Não foi possível concluir o login do Google.'
        : 'Unable to complete Google login.',
      'error'
    );
  }
});
