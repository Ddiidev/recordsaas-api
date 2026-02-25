<template>
  <!-- ====== NAVBAR ====== -->
  <nav class="navbar" id="navbar">
    <a href="#" class="navbar-brand">
      <img src="/assets/logo.png" alt="RecordSaaS logo">
      Record<span>SaaS</span>
    </a>
    <button
      class="navbar-toggle"
      id="navbar-toggle"
      aria-label="Abrir menu"
      :aria-expanded="isMobileMenuOpen ? 'true' : 'false'"
      @click.prevent="toggleMobileMenu"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
    <ul class="navbar-links">
      <li><a href="#features">{{ t('nav.features') }}</a></li>
      <li><a href="#pricing">{{ t('nav.pricing') }}</a></li>
      <li v-if="isAuthenticated"><a href="/account/" class="nav-account" id="nav-account">{{ t('nav.account') }}</a></li>
      <li style="display: flex; gap: 8px;">
        <div class="lang-switch theme-switch-btn" id="theme-switch" title="Switch theme" aria-label="Switch theme" @click.stop="toggleThemeMenu">
          <span id="theme-icon">
            <svg v-show="currentTheme === 'light'" id="icon-light" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-show="currentTheme === 'dark'" id="icon-dark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg v-show="currentTheme === 'system'" id="icon-system" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </span>
          <div class="lang-dropdown-menu" id="theme-menu" :class="{ active: isThemeMenuOpen }">
            <div class="lang-option theme-option" :class="{ active: currentTheme === 'light' }" id="btn-theme-light" @click.stop="setTheme('light')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <span>Light</span>
            </div>
            <div class="lang-option theme-option" :class="{ active: currentTheme === 'dark' }" id="btn-theme-dark" @click.stop="setTheme('dark')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <span>Dark</span>
            </div>
            <div class="lang-option theme-option" :class="{ active: currentTheme === 'system' }" id="btn-theme-system" @click.stop="setTheme('system')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span>System</span>
            </div>
          </div>
        </div>
        <div class="lang-switch" id="lang-switch" title="Switch language" @click.stop="toggleLangMenu">
          <span id="lang-flag"><img :src="langFlagSrc" :alt="langCode"></span> <span id="lang-code">{{ langCode }}</span>
          <div class="lang-dropdown-menu" id="lang-menu" :class="{ active: isLangMenuOpen }">
            <div class="lang-option" :class="{ active: currentLang === 'en' }" id="btn-lang-en" @click.stop="setLang('en')">
              <img src="https://flagcdn.com/w20/us.png" alt="English">
              <span>English (US)</span>
            </div>
            <div class="lang-option" :class="{ active: currentLang === 'pt-BR' }" id="btn-lang-pt" @click.stop="setLang('pt-BR')">
              <img src="https://flagcdn.com/w20/br.png" alt="Português">
              <span>Português (BR)</span>
            </div>
          </div>
        </div>
      </li>
    </ul>
    <div class="navbar-actions" id="navbar-auth">
      <div v-if="isAuthenticated" class="user-menu">
        <a href="/account/" style="display: flex;">
          <img :src="userAvatarUrl" :alt="userName || 'User'" class="user-avatar" referrerpolicy="no-referrer">
        </a>
        <a href="/account/" class="user-name">{{ userName }}</a>
        <button class="btn btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" @click="logout">{{ logoutLabel }}</button>
      </div>
      <button v-else class="btn btn-ghost btn-google" @click="openGoogleLogin">
        <svg class="google-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.4 1.2 8.7 3.2l6.5-6.5C35.7 2.8 30.3 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.6 5.9C12.1 12.9 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.7c-.6 3.1-2.3 5.7-4.9 7.5l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17.7z"/>
          <path fill="#FBBC05" d="M10.1 28.7c-.6-1.8-1-3.8-1-5.8s.4-4 1-5.8l-7.6-5.9C.9 14.7 0 19.2 0 24c0 4.8.9 9.3 2.5 13.8l7.6-5.9z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.5-5.8c-2.1 1.4-4.7 2.2-8.1 2.2-6.4 0-11.9-3.4-13.9-8.2l-7.6 5.9C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        {{ loginLabel }}
      </button>
    </div>
  </nav>

  <div class="navbar-mobile" id="navbar-mobile" :class="{ open: isMobileMenuOpen }">
    <div class="navbar-mobile-content">
      <div v-if="isAuthenticated" class="user-menu">
        <a href="/account/" style="display: flex;">
          <img :src="userAvatarUrl" :alt="userName || 'User'" class="user-avatar" referrerpolicy="no-referrer">
        </a>
        <a href="/account/" class="user-name">{{ userName }}</a>
        <button class="btn btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" @click="logoutAndCloseMobile">{{ logoutLabel }}</button>
      </div>
      <button v-else class="btn btn-ghost btn-google" @click="openGoogleLoginAndCloseMobile">
        <svg class="google-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.4 1.2 8.7 3.2l6.5-6.5C35.7 2.8 30.3 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.6 5.9C12.1 12.9 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.7c-.6 3.1-2.3 5.7-4.9 7.5l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17.7z"/>
          <path fill="#FBBC05" d="M10.1 28.7c-.6-1.8-1-3.8-1-5.8s.4-4 1-5.8l-7.6-5.9C.9 14.7 0 19.2 0 24c0 4.8.9 9.3 2.5 13.8l7.6-5.9z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.5-5.8c-2.1 1.4-4.7 2.2-8.1 2.2-6.4 0-11.9-3.4-13.9-8.2l-7.6 5.9C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        {{ loginLabel }}
      </button>
      <a href="#features" class="navbar-mobile-link" @click="closeMobileMenu">{{ t('nav.features') }}</a>
      <a href="#pricing" class="navbar-mobile-link" @click="closeMobileMenu">{{ t('nav.pricing') }}</a>
      <a v-if="isAuthenticated" href="/account/" class="navbar-mobile-link nav-account" id="nav-account-mobile" @click="closeMobileMenu">{{ t('nav.account') }}</a>
    </div>
  </div>

  <!-- ====== HERO ====== -->
  <section class="hero" id="hero">
    <div class="container">
      <div class="hero-badge animate-in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>{{ t('hero.badge') }}</span>
      </div>
      <h1 class="animate-in delay-1" v-html="t('hero.title')"></h1>
      <p class="hero-subtitle animate-in delay-2">{{ t('hero.subtitle') }}</p>
      <div class="hero-downloads animate-in delay-3">
        <a href="#" class="btn btn-download">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.606L24 0v11.4h-13.051V1.843zM0 12.6h9.75v9.451L0 20.699V12.6zm10.949 0H24V24l-13.051-1.843V12.6z"/></svg>
          <span>Windows</span>
        </a>
        <a href="#" class="btn btn-download">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.68-.83 1.14-1.99 1.01-3.15-1.02.04-2.26.68-3 1.54-.64.73-1.2 1.91-1.05 3.08 1.14.09 2.3-.64 3.04-1.47"/></svg>
          <span>macOS</span>
        </a>
        <a href="#" class="btn btn-download">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 20.84c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z m7.8-5.98c-0.5-1.55-1.74-2.65-1.74-2.65-0.63-1.7-1.42-3.66-2.58-5.32 0 0-1.65-2.75-4-2.75s-3.82 2.14-5.6 4.89c-1.16 1.66-1.95 3.62-2.58 5.32 0 0-1.24 1.1-1.74 2.65-0.55 1.7-0.12 3.8 0.84 5.34 1.13 1.8 3.53 3.64 3.53 3.64l0.95-0.53s-1.43-3.62-1.04-5.65c0.39-2.03 2.1-1.76 2.1-1.76s1.17 2.92 3.54 2.92c2.37 0 3.54-2.92 3.54-2.92s1.71-0.27 2.1 1.76c0.39 2.03-1.04 5.65-1.04 5.65l0.95 0.53s2.4-1.84 3.53-3.64c0.96-1.54 1.39-3.64 0.84-5.34z"/></svg>
          <span>Linux</span>
        </a>
      </div>
      <div class="hero-screenshot animate-in delay-4">
        <img src="/assets/app-screenshot.webp" alt="RecordSaaS editor" id="hero-img">
      </div>
    </div>
  </section>

  <!-- ====== FEATURES ====== -->
  <section class="features" id="features">
    <div class="container">
      <div class="features-header">
        <div class="section-label">{{ t('nav.features') }}</div>
        <h2 class="section-title">{{ t('features.title') }}</h2>
        <p class="section-subtitle">{{ t('features.subtitle') }}</p>
      </div>
      <div class="features-grid">
        <div class="feature-card animate-in delay-1">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <h3>{{ t('features.capture.title') }}</h3>
          <p>{{ t('features.capture.desc') }}</p>
        </div>
        <div class="feature-card animate-in delay-2">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <h3>{{ t('features.webcam.title') }}</h3>
          <p>{{ t('features.webcam.desc') }}</p>
        </div>
        <div class="feature-card animate-in delay-3">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </div>
          <h3>{{ t('features.tracking.title') }}</h3>
          <p>{{ t('features.tracking.desc') }}</p>
        </div>
        <div class="feature-card animate-in delay-4">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
          </div>
          <h3>{{ t('features.timeline.title') }}</h3>
          <p>{{ t('features.timeline.desc') }}</p>
        </div>
        <div class="feature-card animate-in delay-5">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <h3>{{ t('features.blur.title') }}</h3>
          <p>{{ t('features.blur.desc') }}</p>
        </div>
        <div class="feature-card animate-in delay-6">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h3>{{ t('features.export.title') }}</h3>
          <p>{{ t('features.export.desc') }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ====== PRICING ====== -->
  <section class="pricing" id="pricing">
    <div class="container">
      <div class="pricing-header">
        <div class="section-label">{{ t('nav.pricing') }}</div>
        <h2 class="section-title">{{ t('pricing.title') }}</h2>
        <p class="section-subtitle">{{ t('pricing.subtitle') }}</p>
      </div>

      <div class="pricing-grid">
        <div class="pricing-card">
          <div class="pricing-name">{{ t('pricing.pro.name') }}</div>
          <div class="pricing-desc">{{ t('pricing.pro.desc') }}</div>
          <div class="pricing-price">
            <span class="pricing-currency">{{ currencySymbol }}</span>
            <span class="pricing-amount">{{ proPrice }}</span>
          </div>
          <div class="pricing-period">{{ t('pricing.pro.period') }}</div>
          <div class="pricing-note">{{ t('pricing.pro.note') }}</div>
          <ul class="pricing-features">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.pro.f1') }}</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.pro.f2') }}</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.pro.f3') }}</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.pro.f4') }}</span>
            </li>
          </ul>
          <button class="btn btn-ghost btn-lg" @click="checkout('pro')">{{ t('pricing.pro.cta') }}</button>
        </div>

        <div class="pricing-card featured">
          <div class="pricing-name">{{ t('pricing.lifetime.name') }}</div>
          <div class="pricing-desc">{{ t('pricing.lifetime.desc') }}</div>
          <div class="pricing-price">
            <span class="pricing-currency">{{ currencySymbol }}</span>
            <span class="pricing-amount">{{ lifetimePrice }}</span>
          </div>
          <div class="pricing-period">{{ t('pricing.lifetime.period') }}</div>
          <div class="pricing-note">{{ t('pricing.lifetime.note') }}</div>
          <ul class="pricing-features">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.lifetime.f1') }}</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.lifetime.f2') }}</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.lifetime.f3') }}</span>
              <div class="tooltip-container">
                <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <div class="tooltip-content">{{ t('pricing.lifetime.tooltip') }}</div>
              </div>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{{ t('pricing.lifetime.f4') }}</span>
            </li>
          </ul>
          <button class="btn btn-primary btn-lg" @click="checkout('lifetime')">{{ t('pricing.lifetime.cta') }}</button>
        </div>
      </div>
    </div>
  </section>

  <!-- ====== CTA ====== -->
  <section class="cta-section">
    <div class="container">
      <div class="cta-box">
        <h2 v-html="t('cta.title')"></h2>
        <p>{{ t('cta.subtitle') }}</p>
        <a href="#pricing" class="btn btn-record btn-lg">
          <span class="rec-dot"></span>
          <span>{{ t('cta.btn') }}</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ====== FOOTER ====== -->
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <img src="/assets/logo.png" alt="RecordSaaS">
          Record<span>SaaS</span>
        </div>
        <ul class="footer-links">
          <li><a href="#features">{{ t('nav.features') }}</a></li>
          <li><a href="#pricing">{{ t('nav.pricing') }}</a></li>
          <li><a href="https://github.com/Ddiidev/recordsaas" target="_blank" rel="noopener">GitHub</a></li>
        </ul>
        <div class="footer-copy">&copy; 2026 RecordSaaS. All rights reserved.</div>
      </div>
    </div>
  </footer>

  <div v-if="notification" class="notification notification-static" :class="`notification-${notification.type}`">
    {{ notification.message }}
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'RecordSaaS — Professional Screen Recording & Editing',
  description: 'Capture, edit, and export professional screen recordings with multi-lane timeline, webcam overlay, blur tools, and cinematic tracking.',
  ogTitle: 'RecordSaaS — Professional Screen Recording & Editing',
  ogDescription: 'Capture, edit, and export professional screen recordings with multi-lane timeline, webcam overlay, blur tools, and cinematic tracking.',
  ogImage: '/assets/app-screenshot.webp',
  twitterCard: 'summary_large_image',
})

const {
  t,
  currentLang,
  currentTheme,
  isAuthenticated,
  isLangMenuOpen,
  isThemeMenuOpen,
  isMobileMenuOpen,
  langCode,
  langFlagSrc,
  loginLabel,
  logoutLabel,
  userAvatarUrl,
  userName,
  proPrice,
  lifetimePrice,
  currencySymbol,
  notification,
  setLang,
  toggleLangMenu,
  toggleMobileMenu,
  closeMobileMenu,
  setTheme,
  toggleThemeMenu,
  checkout,
  logout,
  openGoogleLogin,
  openGoogleLoginAndCloseMobile,
  logoutAndCloseMobile,
} = useLandingPage()
</script>
