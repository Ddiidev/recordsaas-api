// ======================== CONFIG ========================
const API_BASE = window.location.origin;
const GOOGLE_CLIENT_ID = '358891470255-7h1kggp8d1io8947nll6kq51815nbpgp.apps.googleusercontent.com';

// ======================== STATE ========================
let currentRegion = 'global';
let currentLang = 'en';
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
    'hero.badge': 'Professional Screen Recording',
    'hero.title': 'Record. Edit.<br><span class="highlight">Export like a Pro.</span>',
    'hero.subtitle': 'Professional screen recording with multi-lane timeline, webcam overlay, cinematic mouse tracking, blur tools, and GPU‑accelerated export up to 2K.',
    'hero.cta': 'Get Started',
    'features.title': 'Everything you need to create stunning recordings',
    'features.subtitle': 'From capture to export, RecordSaaS covers every step of your workflow.',
    'features.capture.title': 'Flexible Capture',
    'features.capture.desc': 'Record full screen, a specific window, or custom area with multi-monitor support.',
    'features.webcam.title': 'Webcam Overlay',
    'features.webcam.desc': 'Add a personal touch with your camera feed overlaid on the recording.',
    'features.tracking.title': 'Cinematic Tracking',
    'features.tracking.desc': 'Smart zoom & pan that follows your mouse, keeping the action in focus.',
    'features.timeline.title': 'Multi-Lane Timeline',
    'features.timeline.desc': 'Professional editor with multiple lanes for advanced video compositions.',
    'features.blur.title': 'Blur & Privacy',
    'features.blur.desc': 'Native blur tool to hide sensitive content right in the editor timeline.',
    'features.export.title': 'GPU-Accelerated Export',
    'features.export.desc': 'Lightning-fast export to MP4 or GIF, up to 2K resolution with hardware acceleration.',
    'pricing.title': 'Simple, transparent pricing',
    'pricing.subtitle': 'Choose the plan that fits your workflow. Cancel anytime if you change your mind.',
    'pricing.pro.name': 'Pro Monthly',
    'pricing.pro.desc': 'Full access to all Pro features, billed monthly.',
    'pricing.pro.period': '/month',
    'pricing.pro.note': 'Cancel anytime, no questions asked.',
    'pricing.pro.f1': 'All recording features',
    'pricing.pro.f2': 'Multi-lane timeline editor',
    'pricing.pro.f3': 'GPU-accelerated export up to 2K',
    'pricing.pro.f4': 'Priority support',
    'pricing.pro.cta': 'Subscribe',
    'pricing.lifetime.name': 'Lifetime',
    'pricing.lifetime.desc': 'One-time payment, all Pro features forever.',
    'pricing.lifetime.period': 'one-time payment',
    'pricing.lifetime.note': 'Pay once, use forever. Free updates included.',
    'pricing.lifetime.f1': 'Everything in Pro Monthly',
    'pricing.lifetime.f2': 'Lifetime license — no renewals',
    'pricing.lifetime.f3': 'All future updates free',
    'pricing.lifetime.f4': 'Priority support forever',
    'pricing.lifetime.cta': 'Buy Lifetime',
    'cta.title': 'Ready to <span class="highlight">level up</span> your recordings?',
    'cta.subtitle': 'Join thousands of creators, developers, and educators using RecordSaaS.',
    'cta.btn': 'Get Started Now',
  },
  'pt-BR': {
    'nav.features': 'Recursos',
    'nav.pricing': 'Preços',
    'nav.account': 'Conta',
    'hero.badge': 'Gravação de Tela Profissional',
    'hero.title': 'Grave. Edite.<br><span class="highlight">Exporte como um Pro.</span>',
    'hero.subtitle': 'Gravação profissional de tela com timeline multi-faixa, sobreposição de webcam, rastreamento cinemático do mouse, ferramentas de desfoque e exportação acelerada por GPU em até 2K.',
    'hero.cta': 'Começar Agora',
    'features.title': 'Tudo que você precisa para criar gravações incríveis',
    'features.subtitle': 'Da captura à exportação, o RecordSaaS cobre cada etapa do seu fluxo.',
    'features.capture.title': 'Captura Flexível',
    'features.capture.desc': 'Grave tela cheia, uma janela específica ou área personalizada com suporte a múltiplos monitores.',
    'features.webcam.title': 'Sobreposição de Webcam',
    'features.webcam.desc': 'Adicione um toque pessoal com o feed da sua câmera sobre a gravação.',
    'features.tracking.title': 'Rastreamento Cinemático',
    'features.tracking.desc': 'Zoom e pan inteligentes que seguem o mouse, mantendo a ação em foco.',
    'features.timeline.title': 'Timeline Multi-Faixa',
    'features.timeline.desc': 'Editor profissional com múltiplas faixas para composições de vídeo avançadas.',
    'features.blur.title': 'Desfoque e Privacidade',
    'features.blur.desc': 'Ferramenta nativa de desfoque para ocultar conteúdo sensível direto na timeline.',
    'features.export.title': 'Exportação com GPU',
    'features.export.desc': 'Exportação ultrarrápida para MP4 ou GIF, até 2K de resolução com aceleração de hardware.',
    'pricing.title': 'Preços simples e transparentes',
    'pricing.subtitle': 'Escolha o plano que se encaixa no seu fluxo. Cancele quando quiser.',
    'pricing.pro.name': 'Pro Mensal',
    'pricing.pro.desc': 'Acesso total a todos os recursos Pro, cobrado mensalmente.',
    'pricing.pro.period': '/mês',
    'pricing.pro.note': 'Cancele quando quiser, sem perguntas.',
    'pricing.pro.f1': 'Todos os recursos de gravação',
    'pricing.pro.f2': 'Editor com timeline multi-faixa',
    'pricing.pro.f3': 'Exportação com GPU até 2K',
    'pricing.pro.f4': 'Suporte prioritário',
    'pricing.pro.cta': 'Assinar',
    'pricing.lifetime.name': 'Vitalício',
    'pricing.lifetime.desc': 'Pagamento único, todos os recursos Pro para sempre.',
    'pricing.lifetime.period': 'pagamento único',
    'pricing.lifetime.note': 'Pague uma vez, use para sempre. Atualizações inclusas.',
    'pricing.lifetime.f1': 'Tudo do Pro Mensal',
    'pricing.lifetime.f2': 'Licença vitalícia — sem renovações',
    'pricing.lifetime.f3': 'Todas as atualizações futuras',
    'pricing.lifetime.f4': 'Suporte prioritário para sempre',
    'pricing.lifetime.cta': 'Comprar Vitalício',
    'cta.title': 'Pronto para <span class="highlight">elevar o nível</span> das suas gravações?',
    'cta.subtitle': 'Junte-se a milhares de criadores, desenvolvedores e educadores usando o RecordSaaS.',
    'cta.btn': 'Começar Agora',
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

  // Update lang attribute on html element
  document.documentElement.lang = currentLang === 'pt-BR' ? 'pt-BR' : 'en';

  // Update language switch display
  const langFlag = document.getElementById('lang-flag');
  const langCode = document.getElementById('lang-code');
  if (langFlag) langFlag.textContent = currentLang === 'pt-BR' ? '🇧🇷' : '🇺🇸';
  if (langCode) langCode.textContent = currentLang === 'pt-BR' ? 'PT' : 'EN';
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('recordsaas_lang', lang);
  applyI18n();
}

function toggleLang() {
  setLang(currentLang === 'en' ? 'pt-BR' : 'en');
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
    showNotification(currentLang === 'pt-BR' ? 'Faça login com o Google primeiro.' : 'Please login with Google first to purchase.', 'info');
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
  // Detect and apply language
  currentLang = detectLang();

  // Auto-detect region by language
  if (currentLang === 'pt-BR') {
    currentRegion = 'br';
  }

  applyI18n();
  updatePricingUI();

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

  // Initialize Google Sign-In button (if not already logged in)
  if (!currentUser) {
    initGoogleSignIn();
  }

  initScrollAnimations();
});
