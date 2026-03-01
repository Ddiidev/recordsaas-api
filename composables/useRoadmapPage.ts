import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LANDING_I18N } from '../constants/landing-i18n'
import type { Language, Theme } from '../types/landing'
import type { CheckboxStats, RoadmapRecord, RoadmapResponse } from '../types/roadmap'

export function useRoadmapPage() {
  const currentLang = ref<Language>('en')
  const currentTheme = ref<Theme>('system')
  const isLangMenuOpen = ref(false)
  const isThemeMenuOpen = ref(false)
  const isMobileMenuOpen = ref(false)
  const prefersDark = ref(false)

  const records = ref<RoadmapRecord[]>([])
  const total = ref(0)
  const loading = ref(true)
  const error = ref(false)
  const showingAll = ref(false)
  const loadingAll = ref(false)

  const renderedHtml = ref<Record<number, string>>({})

  let systemMedia: MediaQueryList | null = null
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null

  function t(key: string): string {
    return LANDING_I18N[currentLang.value]?.[key] || LANDING_I18N.en[key] || key
  }

  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (currentTheme.value !== 'system') return currentTheme.value
    return prefersDark.value ? 'dark' : 'light'
  })

  const langCode = computed(() => (currentLang.value === 'pt-BR' ? 'PT' : 'EN'))
  const langFlagSrc = computed(() => (currentLang.value === 'pt-BR' ? 'https://flagcdn.com/w20/br.png' : 'https://flagcdn.com/w20/us.png'))

  function applyTheme(): void {
    document.documentElement.setAttribute('data-theme', resolvedTheme.value)
  }

  function applyDocumentLang(): void {
    document.documentElement.lang = currentLang.value === 'pt-BR' ? 'pt-BR' : 'en'
  }

  function setLang(lang: Language): void {
    currentLang.value = lang
    localStorage.setItem('recordsaas_lang', lang)
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
    const browserLang = navigator.language || ''
    if (browserLang.toLowerCase().startsWith('pt')) return 'pt-BR'
    return 'en'
  }

  function setupSystemThemeListener(): void {
    systemMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (!systemMedia) return

    prefersDark.value = systemMedia.matches

    systemThemeListener = (event: MediaQueryListEvent) => {
      prefersDark.value = event.matches
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

  function resolvedContent(record: RoadmapRecord): string {
    if (currentLang.value === 'pt-BR' && record.contentPTbr) {
      return record.contentPTbr
    }
    return record.content
  }

  function parseCheckboxStats(content: string): CheckboxStats {
    const checkedMatches = content.match(/- \[x\]/gi)
    const uncheckedMatches = content.match(/- \[ \]/g)
    const checked = checkedMatches ? checkedMatches.length : 0
    const unchecked = uncheckedMatches ? uncheckedMatches.length : 0
    return { checked, total: checked + unchecked }
  }

  const COMMIT_TAG_CLASS: Record<string, string> = {
    fix: 'fix', bugfix: 'fix', hotfix: 'fix',
    feat: 'feat', feature: 'feat',
    chore: 'chore',
    docs: 'docs',
    refactor: 'refactor',
    perf: 'perf',
    test: 'test', tests: 'test',
    breaking: 'breaking',
    wip: 'wip',
  }

  function highlightCommitTags(html: string): string {
    const keywords = Object.keys(COMMIT_TAG_CLASS).join('|')
    const pattern = new RegExp(`\\b(${keywords}):`, 'gi')
    return html.replace(pattern, (_, keyword: string) => {
      const cls = COMMIT_TAG_CLASS[keyword.toLowerCase()]
      return `<span class="commit-tag commit-tag-${cls}">${keyword}:</span>`
    })
  }

  async function renderMarkdown(content: string): Promise<string> {
    const { marked } = await import('marked')
    marked.setOptions({ gfm: true, breaks: true })
    const html = marked.parse(content) as string
    return highlightCommitTags(html)
  }

  async function renderAllRecords(recs: RoadmapRecord[]): Promise<void> {
    const newHtml: Record<number, string> = {}
    for (const rec of recs) {
      newHtml[rec.id] = await renderMarkdown(resolvedContent(rec))
    }
    renderedHtml.value = newHtml
  }

  async function fetchLatest(): Promise<void> {
    loading.value = true
    error.value = false

    try {
      const res = await fetch('/api/roadmap')
      if (!res.ok) throw new Error('API error')

      const data = (await res.json()) as RoadmapResponse
      records.value = data.records
      total.value = data.total
      await renderAllRecords(data.records)
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  async function loadAll(): Promise<void> {
    loadingAll.value = true

    try {
      const res = await fetch('/api/roadmap?all=true')
      if (!res.ok) throw new Error('API error')

      const data = (await res.json()) as RoadmapResponse
      records.value = data.records
      total.value = data.total
      showingAll.value = true
      await renderAllRecords(data.records)
    } catch {
      error.value = true
    } finally {
      loadingAll.value = false
    }
  }

  async function toggleHistory(): Promise<void> {
    if (showingAll.value) {
      showingAll.value = false
      await fetchLatest()
    } else {
      await loadAll()
    }
  }

  function formatDate(iso: string): string {
    if (!iso) return ''
    try {
      const date = new Date(iso)
      return date.toLocaleDateString(currentLang.value === 'pt-BR' ? 'pt-BR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  function progressPercent(stats: CheckboxStats): number {
    if (stats.total === 0) return 0
    return Math.round((stats.checked / stats.total) * 100)
  }

  watch(currentLang, () => {
    if (records.value.length > 0) {
      void renderAllRecords(records.value)
    }
  })

  onMounted(() => {
    currentTheme.value = detectTheme()
    currentLang.value = detectLang()

    applyDocumentLang()
    setupSystemThemeListener()
    applyTheme()

    document.addEventListener('click', onDocumentClick)
    void fetchLatest()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
    cleanupSystemThemeListener()
  })

  return {
    t,
    currentLang,
    currentTheme,
    isLangMenuOpen,
    isThemeMenuOpen,
    isMobileMenuOpen,
    langCode,
    langFlagSrc,
    records,
    total,
    loading,
    error,
    showingAll,
    loadingAll,
    renderedHtml,
    setLang,
    toggleLangMenu,
    setTheme,
    toggleThemeMenu,
    toggleMobileMenu,
    closeMobileMenu,
    resolvedContent,
    parseCheckboxStats,
    toggleHistory,
    formatDate,
    progressPercent,
  }
}
