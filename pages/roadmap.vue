<template>
  <!-- ====== NAVBAR ====== -->
  <nav class="navbar" id="navbar">
    <a href="/" class="navbar-brand">
      <img src="/assets/logo.png" alt="RecordSaaS logo">
      Record<span>SaaS</span>
    </a>
    <button
      class="navbar-toggle"
      id="navbar-toggle"
      aria-label="Toggle menu"
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
      <li><a href="/">Home</a></li>
      <li><a href="/roadmap/" class="nav-roadmap-active">{{ t('nav.roadmap') }}</a></li>
      <li style="display: flex; gap: 8px;">
        <div class="lang-switch theme-switch-btn" id="theme-switch" title="Switch theme" aria-label="Switch theme" @click.stop="toggleThemeMenu">
          <span id="theme-icon">
            <svg v-show="currentTheme === 'light'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-show="currentTheme === 'dark'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg v-show="currentTheme === 'system'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </span>
          <div class="lang-dropdown-menu" id="theme-menu" :class="{ active: isThemeMenuOpen }">
            <div class="lang-option theme-option" :class="{ active: currentTheme === 'light' }" @click.stop="setTheme('light')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <span>Light</span>
            </div>
            <div class="lang-option theme-option" :class="{ active: currentTheme === 'dark' }" @click.stop="setTheme('dark')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <span>Dark</span>
            </div>
            <div class="lang-option theme-option" :class="{ active: currentTheme === 'system' }" @click.stop="setTheme('system')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span>System</span>
            </div>
          </div>
        </div>
        <div class="lang-switch" id="lang-switch" title="Switch language" @click.stop="toggleLangMenu">
          <span id="lang-flag"><img :src="langFlagSrc" :alt="langCode"></span> <span id="lang-code">{{ langCode }}</span>
          <div class="lang-dropdown-menu" id="lang-menu" :class="{ active: isLangMenuOpen }">
            <div class="lang-option" :class="{ active: currentLang === 'en' }" @click.stop="setLang('en')">
              <img src="https://flagcdn.com/w20/us.png" alt="English">
              <span>English (US)</span>
            </div>
            <div class="lang-option" :class="{ active: currentLang === 'pt-BR' }" @click.stop="setLang('pt-BR')">
              <img src="https://flagcdn.com/w20/br.png" alt="Português">
              <span>Português (BR)</span>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </nav>

  <div class="navbar-mobile" id="navbar-mobile" :class="{ open: isMobileMenuOpen }">
    <div class="navbar-mobile-content">
      <a href="/" class="navbar-mobile-link" @click="closeMobileMenu">Home</a>
      <a href="/roadmap/" class="navbar-mobile-link" @click="closeMobileMenu">{{ t('nav.roadmap') }}</a>
    </div>
  </div>

  <!-- ====== ROADMAP CONTENT ====== -->
  <section class="roadmap-section">
    <div class="container">
      <a href="/" class="roadmap-back">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        {{ t('roadmap.back_home') }}
      </a>

      <div class="roadmap-header">
        <h1>{{ t('roadmap.title') }}</h1>
        <p>{{ t('roadmap.subtitle') }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="roadmap-state">
        <div class="roadmap-spinner"></div>
        <p>{{ t('roadmap.loading') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="roadmap-state roadmap-state-error">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <p>{{ t('roadmap.error') }}</p>
      </div>

      <!-- Empty -->
      <div v-else-if="records.length === 0" class="roadmap-state">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>{{ t('roadmap.empty') }}</p>
      </div>

      <!-- Roadmap Cards -->
      <template v-else>
        <div v-for="record in records" :key="record.id" class="roadmap-card">
          <div class="roadmap-card-meta">
            <span class="roadmap-date">{{ t('roadmap.date_label') }} {{ formatDate(record.createdAt) }}</span>
            <span v-if="record.completed" class="roadmap-badge-completed">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ t('roadmap.completed_badge') }}
            </span>
          </div>

          <h2 class="roadmap-card-title">{{ record.title }}</h2>

          <div v-if="parseCheckboxStats(resolvedContent(record)).total > 0" class="roadmap-progress">
            <div class="roadmap-progress-header">
              <span class="roadmap-progress-label">{{ t('roadmap.progress_label') }}</span>
              <span class="roadmap-progress-count">{{ parseCheckboxStats(resolvedContent(record)).checked }}/{{ parseCheckboxStats(resolvedContent(record)).total }} ({{ progressPercent(parseCheckboxStats(resolvedContent(record))) }}%)</span>
            </div>
            <div class="roadmap-progress-bar">
              <div class="roadmap-progress-fill" :style="{ width: progressPercent(parseCheckboxStats(resolvedContent(record))) + '%' }"></div>
            </div>
          </div>

          <div v-if="renderedHtml[record.id]" class="roadmap-content" v-html="renderedHtml[record.id]"></div>
        </div>

        <!-- Toggle history button -->
        <div v-if="total > 1" class="roadmap-history-toggle">
          <button class="btn btn-ghost btn-lg" :disabled="loadingAll" @click="toggleHistory">
            <template v-if="loadingAll">
              <div class="roadmap-spinner roadmap-spinner-sm"></div>
            </template>
            <template v-else>
              {{ showingAll ? t('roadmap.hide_history') : t('roadmap.show_history') }}
            </template>
          </button>
        </div>
      </template>
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
          <li><a href="/">Home</a></li>
          <li><a href="/roadmap/">{{ t('nav.roadmap') }}</a></li>
          <li><a href="https://github.com/Ddiidev/recordsaas" target="_blank" rel="noopener">GitHub</a></li>
        </ul>
        <div class="footer-copy">&copy; 2026 RecordSaaS. All rights reserved.</div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Roadmap — RecordSaaS',
  description: 'See what we are building and what is coming next for RecordSaaS.',
  ogTitle: 'Roadmap — RecordSaaS',
  ogDescription: 'See what we are building and what is coming next for RecordSaaS.',
  ogImage: '/assets/app-screenshot.webp',
  twitterCard: 'summary_large_image',
})

const {
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
} = useRoadmapPage()
</script>

<style scoped>
/* ====== ROADMAP PAGE STYLES ====== */

.roadmap-section {
  padding: 120px 0 80px;
  min-height: 60vh;
}

.roadmap-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 32px;
  transition: color 0.2s;
}

.roadmap-back:hover {
  color: var(--primary);
}

.roadmap-header {
  margin-bottom: 48px;
}

.roadmap-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}

.roadmap-header p {
  font-size: 1.1rem;
  color: var(--text-muted);
}

/* States */
.roadmap-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--text-muted);
}

.roadmap-state-error {
  color: var(--destructive);
}

.roadmap-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.roadmap-spinner-sm {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Card */
.roadmap-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: var(--card-shadow);
  transition: box-shadow 0.3s;
}

.roadmap-card:hover {
  box-shadow: var(--card-shadow-hover);
}

.roadmap-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.roadmap-date {
  font-size: 0.85rem;
  color: var(--text-subtle);
}

.roadmap-badge-completed {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
  background: var(--primary-light);
  padding: 4px 10px;
  border-radius: 999px;
}

.roadmap-card-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

/* Progress bar */
.roadmap-progress {
  margin-bottom: 24px;
}

.roadmap-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.roadmap-progress-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.roadmap-progress-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
}

.roadmap-progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-muted);
  border-radius: 2px;
  overflow: hidden;
}

.roadmap-progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 0;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Markdown content */
.roadmap-content {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text);
}

.roadmap-content :deep(h1),
.roadmap-content :deep(h2),
.roadmap-content :deep(h3),
.roadmap-content :deep(h4) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.roadmap-content :deep(h1) { font-size: 1.4rem; }
.roadmap-content :deep(h2) { font-size: 1.2rem; }
.roadmap-content :deep(h3) { font-size: 1.05rem; }

.roadmap-content :deep(p) {
  margin-bottom: 12px;
}

.roadmap-content :deep(ul),
.roadmap-content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.roadmap-content :deep(li) {
  margin-bottom: 4px;
}

.roadmap-content :deep(code) {
  font-size: 0.85em;
  background: var(--bg-muted);
  padding: 2px 6px;
  border-radius: var(--radius);
}

.roadmap-content :deep(pre) {
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.roadmap-content :deep(pre code) {
  background: none;
  padding: 0;
}

.roadmap-content :deep(a) {
  color: var(--primary);
  text-decoration: underline;
}

.roadmap-content :deep(a:hover) {
  color: var(--primary-hover);
}

.roadmap-content :deep(blockquote) {
  border-left: 3px solid var(--primary);
  padding-left: 16px;
  margin: 12px 0;
  color: var(--text-muted);
}

.roadmap-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 24px 0;
}

/* Checkbox styling */
.roadmap-content :deep(input[type="checkbox"]) {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  vertical-align: middle;
  margin-right: 8px;
  position: relative;
  cursor: default;
  flex-shrink: 0;
}

.roadmap-content :deep(input[type="checkbox"]:checked) {
  background: var(--primary);
  border-color: var(--primary);
}

.roadmap-content :deep(input[type="checkbox"]:checked::after) {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.roadmap-content :deep(li:has(input[type="checkbox"])) {
  list-style: none;
  margin-left: -24px;
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.roadmap-content :deep(li:has(input[type="checkbox"]) input) {
  margin-top: 3px;
}

/* Commit tag badges */
.roadmap-content :deep(.commit-tag) {
  display: inline;
  font-size: 0.75em;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  padding: 1px 7px 2px;
  border-radius: 4px;
  vertical-align: middle;
  white-space: nowrap;
}

.roadmap-content :deep(.commit-tag-fix) {
  background: var(--tag-fix-bg);
  color: var(--tag-fix-color);
}

.roadmap-content :deep(.commit-tag-feat) {
  background: var(--tag-feat-bg);
  color: var(--tag-feat-color);
}

.roadmap-content :deep(.commit-tag-chore) {
  background: var(--tag-chore-bg);
  color: var(--tag-chore-color);
}

.roadmap-content :deep(.commit-tag-docs) {
  background: var(--tag-docs-bg);
  color: var(--tag-docs-color);
}

.roadmap-content :deep(.commit-tag-refactor) {
  background: var(--tag-refactor-bg);
  color: var(--tag-refactor-color);
}

.roadmap-content :deep(.commit-tag-perf) {
  background: var(--tag-perf-bg);
  color: var(--tag-perf-color);
}

.roadmap-content :deep(.commit-tag-test) {
  background: var(--tag-test-bg);
  color: var(--tag-test-color);
}

.roadmap-content :deep(.commit-tag-breaking) {
  background: var(--tag-breaking-bg);
  color: var(--tag-breaking-color);
}

.roadmap-content :deep(.commit-tag-wip) {
  background: var(--tag-wip-bg);
  color: var(--tag-wip-color);
}

/* History toggle */
.roadmap-history-toggle {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.nav-roadmap-active {
  color: var(--primary) !important;
  font-weight: 700 !important;
}

/* Responsive */
@media (max-width: 768px) {
  .roadmap-section {
    padding: 100px 0 60px;
  }

  .roadmap-header h1 {
    font-size: 1.8rem;
  }

  .roadmap-card {
    padding: 24px 20px;
  }

  .roadmap-card-title {
    font-size: 1.25rem;
  }
}
</style>
