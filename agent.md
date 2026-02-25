# Agent Guide — RecordSaaS API

## Estado Atual da Stack

- **Frontend (Landing `/`)**: Nuxt 3 SSG
- **Paginas legadas estaticas**: `public/account`, `public/success`, `public/cancel`, `public/auth/google`
- **Backend**: Netlify Functions (TypeScript) em `netlify/functions`
- **Pagamentos**: Stripe SDK
- **Auth**: Google Sign-In (redirect OAuth + callback em `/auth/google/`)
- **Infra/Deploy**: Netlify

## Estrutura relevante

- Landing ativa: `pages/index.vue`
- Logica da landing: `composables/useLandingPage.ts`
- I18n da landing: `constants/landing-i18n.ts`
- Tipos da landing: `types/landing.ts`
- CSS da landing: `assets/css/landing.css`
- Config Nuxt: `nuxt.config.ts`
- Legacy LP (referencia/rollback): `legacy/lp-vanilla/`

## Fluxo de desenvolvimento

### Frontend Nuxt

- `npm run dev:web`

### Full stack local (Netlify + frontend + functions)

- `npm run dev`

### Build da LP

- `npm run build:web`
- output: `.output/public`

### Preview do build

- `npm run preview:web`

## Fluxo de deploy

**Produção (recordsaas-api)**
1. Garanta o codigo atualizado no repositorio local.
2. Build da LP: `npm run build:web`.
3. Deploy:
   - `siteId`: `cd0ac2c6-f52b-4c61-b6b0-6055627c389b`
   - URL: `https://recordsaas-api.netlify.app`
   - comando: `npm run deploy:prod`
4. Acompanhe o deploy no painel Netlify.

**Teste (recordsaas-api-test)**
1. Garanta o codigo atualizado no repositorio local.
2. Build da LP: `npm run build:web`.
3. Deploy:
   - `siteId`: `ad52bf01-0145-4384-81e1-522cf14df5a1`
   - URL: `https://recordsaas-api-test.netlify.app`
   - comando: `npm run deploy:test`
4. Acompanhe o deploy no painel Netlify.

## Netlify config ativa

Arquivo: `netlify.toml`

- `[build].command = "npm run build:web"`
- `[build].publish = ".output/public"`
- `[functions].directory = "netlify/functions"`
- Redirects `/api/*` preservados para `/.netlify/functions/*`

## Variáveis de ambiente necessárias

Lidas via `Netlify.env.get(...)` nas Functions:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `APP_URL`

## Documentação da migração

- Baseline funcional LP: `docs/migration/lp-baseline.md`
- Mapa da migracao: `docs/migration/vanilla-to-nuxt.md`
- Runbook operacional: `docs/runbook/netlify-nuxt-lp.md`
- Design system (resumo): `docs/design-system/landing.md`
- Design system persistido: `design-system/recordsaas-lp/MASTER.md`
- Override da landing: `design-system/recordsaas-lp/pages/landing.md`

## Como subir para o GitHub

1. Verifique alteracoes:
   - `git status -sb`
2. Adicione os arquivos:
   - `git add <arquivos>`
3. Commit:
   - `git commit -m "sua mensagem"`
4. Push:
   - `git push origin main`

## Ultimas atualizacoes

- LP Nuxt (`pages/index.vue`):
  - handlers inline `onclick` migrados para `@click` (tema, idioma, menu mobile e checkout) para evitar perda de binding apos hidratacao.
- Composable (`composables/useLandingPage.ts`):
  - `setLang`, `toggleLangMenu`, `toggleMobileMenu`, `closeMobileMenu`, `setTheme`, `toggleThemeMenu` expostos no retorno para uso direto no template Vue.
  - nome do perfil no menu autenticado agora e link clicavel para `/account/`.
- Pagina legada de conta (`public/account/index.html`):
  - corrigido bloco CSS de tema dark (`[data-theme="dark"]`) que estava com sintaxe invalida.
  - switches de tema/idioma alterados para `button` com handlers explicitos.
  - `setTheme`/`setLang` e toggles atualizados para tratar `event` de forma robusta e manter abertura/fechamento dos dropdowns.

- Refatoracao Vue-first da LP (`pages/index.vue` + `composables/useLandingPage.ts`):
  - removido fluxo legado de `innerHTML`/markup em string para auth/navbar.
  - removido i18n legado por mutacao de DOM (`data-i18n` + `querySelectorAll`), substituido por bindings Vue com `t(...)`.
  - menus de idioma/tema/mobile agora controlados por estado reativo (`ref`/`computed`) com `v-if`, `:class` e handlers Vue.
  - toasts migrados de criacao imperativa de elementos DOM para renderizacao reativa no template.

- Ajustes anti-legado em `/account` (`public/account/index.html`):
  - removido uso de `innerHTML` para status/plano e acoes do plano.
  - acoes do plano agora sao elementos declarados no HTML com controle de visibilidade via JS.
  - toast reutiliza um unico elemento fixo (`#toast`) em vez de criar/remover elementos dinamicamente.
