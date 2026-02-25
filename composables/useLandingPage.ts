import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { LANDING_I18N } from '../constants/landing-i18n'
import type { CheckoutPlan, Language, Region, Theme, UserSession } from '../types/landing'

const GOOGLE_CLIENT_ID = '358891470255-7h1kggp8d1io8947nll6kq51815nbpgp.apps.googleusercontent.com'

const PRICES: Record<CheckoutPlan, Record<Region, number>> = {
  pro: { global: 10, br: 27 },
  lifetime: { global: 87, br: 177 },
}

const CURRENCY: Record<Region, string> = { global: '$', br: 'R$' }

type NotificationType = 'success' | 'error' | 'info'

interface NotificationState {
  message: string
  type: NotificationType
}

export function useLandingPage() {
  const currentRegion = ref<Region>('global')
  const currentLang = ref<Language>('en')
  const currentTheme = ref<Theme>('system')
  const currentUser = ref<UserSession | null>(null)
  const sessionToken = ref<string | null>(null)

  const isLangMenuOpen = ref(false)
  const isThemeMenuOpen = ref(false)
  const isMobileMenuOpen = ref(false)
  const notification = ref<NotificationState | null>(null)
  const prefersDark = ref(false)

  let systemMedia: MediaQueryList | null = null
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null
  let notificationTimer: ReturnType<typeof setTimeout> | null = null
  let scrollObserver: IntersectionObserver | null = null

  function getApiBase(): string {
    return window.location.origin
  }

  function t(key: string): string {
    return LANDING_I18N[currentLang.value]?.[key] || LANDING_I18N.en[key] || key
  }

  const isAuthenticated = computed(() => Boolean(currentUser.value))
  const langCode = computed(() => (currentLang.value === 'pt-BR' ? 'PT' : 'EN'))
  const langFlagSrc = computed(() => (currentLang.value === 'pt-BR' ? 'https://flagcdn.com/w20/br.png' : 'https://flagcdn.com/w20/us.png'))
  const loginLabel = computed(() => (currentLang.value === 'pt-BR' ? 'Entrar com Google' : 'Sign in with Google'))
  const logoutLabel = computed(() => (currentLang.value === 'pt-BR' ? 'Sair' : 'Logout'))
  const proPrice = computed(() => PRICES.pro[currentRegion.value])
  const lifetimePrice = computed(() => PRICES.lifetime[currentRegion.value])
  const currencySymbol = computed(() => CURRENCY[currentRegion.value])
  const userName = computed(() => currentUser.value?.name || '')
  const userAvatarUrl = computed(() => getAvatarUrl(currentUser.value?.picture))

  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (currentTheme.value !== 'system') return currentTheme.value
    return prefersDark.value ? 'dark' : 'light'
  })

  function applyDocumentLang(): void {
    document.documentElement.lang = currentLang.value === 'pt-BR' ? 'pt-BR' : 'en'
  }

  function applyTheme(): void {
    document.documentElement.setAttribute('data-theme', resolvedTheme.value)
  }

  function setLang(lang: Language): void {
    currentLang.value = lang
    localStorage.setItem('recordsaas_lang', lang)
    currentRegion.value = lang === 'pt-BR' ? 'br' : 'global'
    isLangMenuOpen.value = false
    applyDocumentLang()
  }

  function toggleLangMenu(event?: Event): void {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    isThemeMenuOpen.value = false
    isLangMenuOpen.value = !isLangMenuOpen.value
  }

  function toggleMobileMenu(event?: Event): void {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  function closeMobileMenu(): void {
    isMobileMenuOpen.value = false
  }

  function setTheme(theme: Theme): void {
    currentTheme.value = theme
    localStorage.setItem('recordsaas_theme', theme)
    isThemeMenuOpen.value = false
    applyTheme()
  }

  function toggleThemeMenu(event?: Event): void {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    isLangMenuOpen.value = false
    isThemeMenuOpen.value = !isThemeMenuOpen.value
  }

  function onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null
    if (!target) return

    if (!target.closest('#lang-switch')) {
      isLangMenuOpen.value = false
    }

    if (!target.closest('#theme-switch')) {
      isThemeMenuOpen.value = false
    }

    if (!target.closest('#navbar-mobile') && !target.closest('#navbar-toggle')) {
      isMobileMenuOpen.value = false
    }
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

  function openGoogleLogin(): void {
    startGoogleRedirectLogin()
  }

  function openGoogleLoginAndCloseMobile(): void {
    closeMobileMenu()
    openGoogleLogin()
  }

  function logout(): void {
    currentUser.value = null
    sessionToken.value = null
    localStorage.removeItem('recordsaas_session')
    localStorage.removeItem('recordsaas_user')
  }

  function logoutAndCloseMobile(): void {
    logout()
    closeMobileMenu()
  }

  function getAvatarUrl(picture?: string): string {
    if (!picture || typeof picture !== 'string') return ''
    return picture.replace(/=s\d+-c$/, '=s256-c').replace(/=s\d+$/, '=s256-c')
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

  function showNotification(message: string, type: NotificationType = 'info'): void {
    notification.value = { message, type }

    if (notificationTimer) {
      clearTimeout(notificationTimer)
    }

    notificationTimer = setTimeout(() => {
      notification.value = null
      notificationTimer = null
    }, 4000)
  }

  function initScrollAnimations(): void {
    scrollObserver?.disconnect()

    scrollObserver = new IntersectionObserver((entries) => {
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
      scrollObserver?.observe(el)
    })
  }

  async function restoreSession(): Promise<void> {
    const savedToken = localStorage.getItem('recordsaas_session')
    const savedUser = localStorage.getItem('recordsaas_user')
    if (!savedToken || !savedUser) return

    try {
      sessionToken.value = savedToken
      currentUser.value = JSON.parse(savedUser) as UserSession

      const pendingPlan = localStorage.getItem('recordsaas_pending_checkout')
      if (pendingPlan === 'pro' || pendingPlan === 'lifetime') {
        localStorage.removeItem('recordsaas_pending_checkout')
        await checkout(pendingPlan)
      }

      const res = await fetch(`${getApiBase()}/api/auth/status`, {
        headers: { Authorization: `Bearer ${sessionToken.value}` },
      })

      if (!res.ok) {
        logout()
      }
    } catch {
      logout()
    }
  }

  function setupSystemThemeListener(): void {
    systemMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (!systemMedia) return

    prefersDark.value = systemMedia.matches

    systemThemeListener = (event: MediaQueryListEvent) => {
      prefersDark.value = event.matches
      if (currentTheme.value === 'system') {
        applyTheme()
      }
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
    currentLang.value = detectLang()
    currentRegion.value = currentLang.value === 'pt-BR' ? 'br' : 'global'

    applyDocumentLang()
    setupSystemThemeListener()
    applyTheme()

    await restoreSession()
    initScrollAnimations()

    const loginError = localStorage.getItem('recordsaas_login_error')
    if (loginError) {
      localStorage.removeItem('recordsaas_login_error')
      showNotification(currentLang.value === 'pt-BR' ? 'Nao foi possivel concluir o login do Google.' : 'Unable to complete Google login.', 'error')
    }
  }

  onMounted(() => {
    void init()
    document.addEventListener('click', onDocumentClick)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
    cleanupSystemThemeListener()
    scrollObserver?.disconnect()

    if (notificationTimer) {
      clearTimeout(notificationTimer)
      notificationTimer = null
    }
  })

  return {
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
  }
}
