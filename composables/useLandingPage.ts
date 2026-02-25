import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LANDING_I18N } from '../constants/landing-i18n'
import type { CheckoutPlan, Language, Region, Theme, UserSession } from '../types/landing'

const GOOGLE_CLIENT_ID = '358891470255-7h1kggp8d1io8947nll6kq51815nbpgp.apps.googleusercontent.com'

const PRICES: Record<CheckoutPlan, Record<Region, number>> = {
  pro: { global: 10, br: 27 },
  lifetime: { global: 87, br: 177 },
}

const CURRENCY: Record<Region, string> = { global: '$', br: 'R$' }

declare global {
  interface Window {
    setLang?: (lang: Language) => void
    toggleLangMenu?: (event?: Event) => void
    toggleMobileMenu?: (event?: Event) => void
    closeMobileMenu?: () => void
    setTheme?: (theme: Theme) => void
    toggleThemeMenu?: (event?: Event) => void
    checkout?: (plan: CheckoutPlan) => Promise<void>
    logout?: () => void
    openGoogleLogin?: () => void
  }
}

export function useLandingPage() {
  const currentRegion = ref<Region>('global')
  const currentLang = ref<Language>('en')
  const currentTheme = ref<Theme>('system')
  const currentUser = ref<UserSession | null>(null)
  const sessionToken = ref<string | null>(null)

  let systemMedia: MediaQueryList | null = null
  let systemThemeListener: (() => void) | null = null

  function getApiBase(): string {
    return window.location.origin
  }

  function t(key: string): string {
    return LANDING_I18N[currentLang.value]?.[key] || LANDING_I18N.en[key] || key
  }

  function setDropdownState(switchId: string, menuId: string, open: boolean): void {
    const switchEl = document.getElementById(switchId)
    const menuEl = document.getElementById(menuId)
    if (switchEl) switchEl.classList.toggle('open', open)
    if (menuEl) menuEl.classList.toggle('active', open)
  }

  function applyI18n(): void {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n')
      if (!key) return
      el.textContent = t(key)
    })

    document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html')
      if (!key) return
      el.innerHTML = t(key)
    })

    document.documentElement.lang = currentLang.value === 'pt-BR' ? 'pt-BR' : 'en'

    const langFlag = document.getElementById('lang-flag')
    const langCode = document.getElementById('lang-code')
    if (langFlag) {
      langFlag.innerHTML = currentLang.value === 'pt-BR'
        ? '<img src="https://flagcdn.com/w20/br.png" alt="BR">'
        : '<img src="https://flagcdn.com/w20/us.png" alt="EN">'
    }
    if (langCode) langCode.textContent = currentLang.value === 'pt-BR' ? 'PT' : 'EN'

    document.querySelectorAll('.lang-option').forEach((el) => el.classList.remove('active'))
    const activeBtn = document.getElementById(currentLang.value === 'pt-BR' ? 'btn-lang-pt' : 'btn-lang-en')
    if (activeBtn) activeBtn.classList.add('active')
  }

  function setLang(lang: Language): void {
    currentLang.value = lang
    localStorage.setItem('recordsaas_lang', lang)
    currentRegion.value = lang === 'pt-BR' ? 'br' : 'global'
    applyI18n()
    updatePricingUI()
    updateAuthUI()
    setDropdownState('lang-switch', 'lang-menu', false)
  }

  function toggleLangMenu(event?: Event): void {
    if (event) event.preventDefault()
    const switchEl = document.getElementById('lang-switch')
    const isOpen = !!switchEl?.classList.contains('open')
    setDropdownState('theme-switch', 'theme-menu', false)
    setDropdownState('lang-switch', 'lang-menu', !isOpen)
  }

  function toggleMobileMenu(event?: Event): void {
    if (event) event.preventDefault()
    const mobileMenu = document.getElementById('navbar-mobile')
    const mobileToggle = document.getElementById('navbar-toggle')
    if (!mobileMenu) return
    const isOpen = mobileMenu.classList.toggle('open')
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
  }

  function closeMobileMenu(): void {
    const mobileMenu = document.getElementById('navbar-mobile')
    const mobileToggle = document.getElementById('navbar-toggle')
    if (mobileMenu) mobileMenu.classList.remove('open')
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false')
  }

  function onDocumentClick(e: MouseEvent): void {
    const target = e.target as Node | null

    const langSwitch = document.getElementById('lang-switch')
    if (langSwitch && target && !langSwitch.contains(target)) {
      setDropdownState('lang-switch', 'lang-menu', false)
    }

    const themeSwitch = document.getElementById('theme-switch')
    if (themeSwitch && target && !themeSwitch.contains(target)) {
      setDropdownState('theme-switch', 'theme-menu', false)
    }

    const mobileMenu = document.getElementById('navbar-mobile')
    const mobileToggle = document.getElementById('navbar-toggle')
    if (mobileMenu && mobileToggle && target && !mobileMenu.contains(target) && !mobileToggle.contains(target)) {
      mobileMenu.classList.remove('open')
      mobileToggle.setAttribute('aria-expanded', 'false')
    }
  }

  function getResolvedTheme(): 'light' | 'dark' {
    if (currentTheme.value !== 'system') return currentTheme.value
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function applyTheme(): void {
    const resolvedTheme = getResolvedTheme()
    document.documentElement.setAttribute('data-theme', resolvedTheme)

    const icons: Theme[] = ['light', 'dark', 'system']
    icons.forEach((name) => {
      const icon = document.getElementById(`icon-${name}`)
      if (icon) icon.style.display = name === currentTheme.value ? 'block' : 'none'
    })

    document.querySelectorAll('.theme-option').forEach((el) => el.classList.remove('active'))
    const activeBtn = document.getElementById(`btn-theme-${currentTheme.value}`)
    if (activeBtn) activeBtn.classList.add('active')
  }

  function setTheme(theme: Theme): void {
    currentTheme.value = theme
    localStorage.setItem('recordsaas_theme', theme)
    applyTheme()
    setDropdownState('theme-switch', 'theme-menu', false)
  }

  function toggleThemeMenu(event?: Event): void {
    if (event) event.preventDefault()
    const switchEl = document.getElementById('theme-switch')
    const isOpen = !!switchEl?.classList.contains('open')
    setDropdownState('lang-switch', 'lang-menu', false)
    setDropdownState('theme-switch', 'theme-menu', !isOpen)
  }

  function detectTheme(): Theme {
    const saved = localStorage.getItem('recordsaas_theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    return 'system'
  }

  function detectLang(): Language {
    const saved = localStorage.getItem('recordsaas_lang')
    if (saved === 'en' || saved === 'pt-BR') return saved
    const browserLang = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || ''
    if (browserLang.toLowerCase().startsWith('pt')) return 'pt-BR'
    return 'en'
  }

  function updatePricingUI(): void {
    const toggle = document.getElementById('region-toggle')
    const labelGlobal = document.getElementById('label-global')
    const labelBr = document.getElementById('label-br')
    const pricePro = document.getElementById('price-pro')
    const priceLifetime = document.getElementById('price-lifetime')

    if (toggle) {
      if (currentRegion.value === 'br') {
        toggle.classList.add('active')
        if (labelGlobal) labelGlobal.classList.remove('active')
        if (labelBr) labelBr.classList.add('active')
      } else {
        toggle.classList.remove('active')
        if (labelGlobal) labelGlobal.classList.add('active')
        if (labelBr) labelBr.classList.remove('active')
      }
    }

    if (pricePro) pricePro.textContent = String(PRICES.pro[currentRegion.value])
    if (priceLifetime) priceLifetime.textContent = String(PRICES.lifetime[currentRegion.value])
    document.querySelectorAll('.pricing-currency').forEach((el) => {
      el.textContent = CURRENCY[currentRegion.value]
    })
  }

  function generateLoginToken(): string {
    if (window.crypto?.getRandomValues) {
      const buf = new Uint8Array(16)
      window.crypto.getRandomValues(buf)
      return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  function startGoogleRedirectLogin(): void {
    if (!GOOGLE_CLIENT_ID) {
      showNotification(currentLang.value === 'pt-BR' ? 'Login do Google indisponivel no momento.' : 'Google login is unavailable right now.', 'error')
      return
    }

    const host = window.location.hostname || ''
    const protocol = host.endsWith('netlify.app') ? 'https:' : window.location.protocol
    const origin = `${protocol}//${host}${window.location.port ? `:${window.location.port}` : ''}`
    const redirectUri = `${origin}/auth/google/`
    const state = generateLoginToken()
    const nonce = generateLoginToken()
    localStorage.setItem('recordsaas_oauth_state', state)

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'id_token')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('response_mode', 'fragment')
    url.searchParams.set('prompt', 'select_account')
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('state', state)
    window.location.assign(url.toString())
  }

  function logout(): void {
    currentUser.value = null
    sessionToken.value = null
    localStorage.removeItem('recordsaas_session')
    localStorage.removeItem('recordsaas_user')
    updateAuthUI()
  }

  function getAvatarUrl(picture?: string): string {
    if (!picture || typeof picture !== 'string') return ''
    return picture.replace(/=s\d+-c$/, '=s256-c').replace(/=s\d+$/, '=s256-c')
  }

  function updateAuthUI(): void {
    const authContainer = document.getElementById('navbar-auth')
    const authContainerMobile = document.getElementById('navbar-auth-mobile')
    const navAccount = document.getElementById('nav-account')
    const navAccountMobile = document.getElementById('nav-account-mobile')

    if (currentUser.value) {
      if (navAccount) navAccount.style.display = 'inline-flex'
      if (navAccountMobile) navAccountMobile.style.display = 'flex'
      const avatarUrl = getAvatarUrl(currentUser.value.picture)
      const markup = `
      <div class="user-menu">
        <a href="/account/" style="display: flex;">
          <img src="${avatarUrl}" alt="${currentUser.value.name || 'User'}" class="user-avatar" referrerpolicy="no-referrer">
        </a>
        <span class="user-name">${currentUser.value.name || ''}</span>
        <button class="btn btn-ghost" onclick="logout(); closeMobileMenu()" style="padding: 6px 12px; font-size: 0.8rem;">Logout</button>
      </div>
      `
      if (authContainer) authContainer.innerHTML = markup
      if (authContainerMobile) authContainerMobile.innerHTML = markup
    } else {
      if (navAccount) navAccount.style.display = 'none'
      if (navAccountMobile) navAccountMobile.style.display = 'none'
      const label = currentLang.value === 'pt-BR' ? 'Entrar com Google' : 'Sign in with Google'
      const markup = `
      <button class="btn btn-ghost btn-google" onclick="openGoogleLogin(); closeMobileMenu()">
        <svg class="google-icon" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.4 1.2 8.7 3.2l6.5-6.5C35.7 2.8 30.3 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.6 5.9C12.1 12.9 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.7c-.6 3.1-2.3 5.7-4.9 7.5l7.5 5.8c4.4-4.1 6.9-10.1 6.9-17.7z"/>
          <path fill="#FBBC05" d="M10.1 28.7c-.6-1.8-1-3.8-1-5.8s.4-4 1-5.8l-7.6-5.9C.9 14.7 0 19.2 0 24c0 4.8.9 9.3 2.5 13.8l7.6-5.9z"/>
          <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.5-5.8c-2.1 1.4-4.7 2.2-8.1 2.2-6.4 0-11.9-3.4-13.9-8.2l-7.6 5.9C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        ${label}
      </button>
      `
      if (authContainer) authContainer.innerHTML = markup
      if (authContainerMobile) authContainerMobile.innerHTML = markup
    }
  }

  function openGoogleLogin(): void {
    startGoogleRedirectLogin()
  }

  function startCheckoutLogin(plan: CheckoutPlan): void {
    localStorage.setItem('recordsaas_pending_checkout', plan)
    openGoogleLogin()
  }

  async function checkout(plan: CheckoutPlan): Promise<void> {
    const email = currentUser.value?.email
    if (!email) {
      startCheckoutLogin(plan)
      return
    }

    try {
      const locale = currentRegion.value === 'br' ? 'pt-BR' : 'en-US'
      const res = await fetch(`${getApiBase()}/api/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken.value ? { Authorization: `Bearer ${sessionToken.value}` } : {}),
        },
        body: JSON.stringify({ email, plan, locale }),
      })

      if (!res.ok) {
        let errorPayload: { code?: string; error?: string } | null = null
        try {
          errorPayload = await res.json()
        } catch {
          errorPayload = null
        }
        if (res.status === 409 && errorPayload?.code === 'ACTIVE_SUBSCRIPTION_EXISTS') {
          showNotification(
            currentLang.value === 'pt-BR'
              ? 'Voce ja possui uma assinatura ativa. Gerencie sua assinatura atual antes de contratar outra.'
              : 'You already have an active subscription. Manage your current subscription before starting another.',
            'error',
          )
          return
        }
        if (res.status === 409 && errorPayload?.code === 'ACTIVE_LIFETIME_EXISTS') {
          showNotification(
            currentLang.value === 'pt-BR'
              ? 'Voce ja possui o plano vitalicio ativo. Nao e possivel contratar o vitalicio novamente.'
              : 'You already have an active lifetime plan. You cannot purchase lifetime again.',
            'error',
          )
          return
        }
        throw new Error(errorPayload?.error || 'Checkout failed')
      }

      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      showNotification(currentLang.value === 'pt-BR' ? 'Falha ao iniciar o checkout. Tente novamente.' : 'Failed to start checkout. Please try again.', 'error')
    }
  }

  function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const existing = document.querySelector('.notification')
    if (existing) existing.remove()
    const colors = { success: 'hsl(154, 60%, 42%)', error: 'hsl(0, 72%, 58%)', info: 'hsl(215, 60%, 50%)' }
    const notification = document.createElement('div')
    notification.className = 'notification'
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
    `
    notification.textContent = message
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.style.opacity = '0'
      notification.style.transition = 'opacity 0.3s'
      setTimeout(() => notification.remove(), 300)
    }, 4000)
  }

  function initScrollAnimations(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          target.style.opacity = '1'
          target.style.transform = 'translateY(0)'
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

    document.querySelectorAll<HTMLElement>('.feature-card, .pricing-card').forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(24px)'
      el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
      observer.observe(el)
    })
  }

  async function restoreSession(): Promise<void> {
    const savedToken = localStorage.getItem('recordsaas_session')
    const savedUser = localStorage.getItem('recordsaas_user')
    if (!savedToken || !savedUser) return

    try {
      sessionToken.value = savedToken
      currentUser.value = JSON.parse(savedUser) as UserSession
      updateAuthUI()

      const pendingPlan = localStorage.getItem('recordsaas_pending_checkout')
      if (pendingPlan === 'pro' || pendingPlan === 'lifetime') {
        localStorage.removeItem('recordsaas_pending_checkout')
        await checkout(pendingPlan)
      }

      const res = await fetch(`${getApiBase()}/api/auth/status`, {
        headers: { Authorization: `Bearer ${sessionToken.value}` },
      })
      if (!res.ok) logout()
    } catch {
      logout()
    }
  }

  function exposeWindowApi(): void {
    window.setLang = setLang
    window.toggleLangMenu = toggleLangMenu
    window.toggleMobileMenu = toggleMobileMenu
    window.closeMobileMenu = closeMobileMenu
    window.setTheme = setTheme
    window.toggleThemeMenu = toggleThemeMenu
    window.checkout = checkout
    window.logout = logout
    window.openGoogleLogin = openGoogleLogin
  }

  function clearWindowApi(): void {
    delete window.setLang
    delete window.toggleLangMenu
    delete window.toggleMobileMenu
    delete window.closeMobileMenu
    delete window.setTheme
    delete window.toggleThemeMenu
    delete window.checkout
    delete window.logout
    delete window.openGoogleLogin
  }

  function setupSystemThemeListener(): void {
    systemMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (!systemMedia) return
    systemThemeListener = () => {
      if (currentTheme.value === 'system') applyTheme()
    }
    if (typeof systemMedia.addEventListener === 'function') {
      systemMedia.addEventListener('change', systemThemeListener)
    } else if (typeof systemMedia.addListener === 'function') {
      systemMedia.addListener(systemThemeListener)
    }
  }

  function cleanupSystemThemeListener(): void {
    if (!systemMedia || !systemThemeListener) return
    if (typeof systemMedia.removeEventListener === 'function') {
      systemMedia.removeEventListener('change', systemThemeListener)
    } else if (typeof systemMedia.removeListener === 'function') {
      systemMedia.removeListener(systemThemeListener)
    }
    systemMedia = null
    systemThemeListener = null
  }

  async function init(): Promise<void> {
    currentTheme.value = detectTheme()
    applyTheme()
    setupSystemThemeListener()

    currentLang.value = detectLang()
    if (currentLang.value === 'pt-BR') currentRegion.value = 'br'

    applyI18n()
    updatePricingUI()
    updateAuthUI()

    await restoreSession()
    initScrollAnimations()

    const loginError = localStorage.getItem('recordsaas_login_error')
    if (loginError) {
      localStorage.removeItem('recordsaas_login_error')
      showNotification(currentLang.value === 'pt-BR' ? 'Nao foi possivel concluir o login do Google.' : 'Unable to complete Google login.', 'error')
    }
  }

  onMounted(() => {
    exposeWindowApi()
    void init()
    document.addEventListener('click', onDocumentClick)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
    cleanupSystemThemeListener()
    clearWindowApi()
  })

  return {
    currentRegion,
    currentLang,
    currentTheme,
    currentUser,
    sessionToken,
    checkout,
    logout,
    openGoogleLogin,
  }
}
