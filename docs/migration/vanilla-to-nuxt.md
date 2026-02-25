# Migracao: Vanilla LP -> Nuxt 3 SSG

## Decisao de arquitetura

- Stack alvo: Nuxt 3 com geracao estatica (SSG).
- Escopo: apenas homepage (`/`).
- Rotas fora de escopo permanecem estaticas em `public/`.

## Mapa de arquivos

### Landing ativa (nova)

- `pages/index.vue` (markup da LP)
- `composables/useLandingPage.ts` (estado e logica da LP)
- `constants/landing-i18n.ts` (textos EN/PT)
- `types/landing.ts` (tipos internos)
- `assets/css/landing.css` (CSS preservado da LP)
- `nuxt.config.ts` (SSG + head + prerender)
- `app.vue`

### Legado preservado

- `legacy/lp-vanilla/index.html`
- `legacy/lp-vanilla/styles.css`
- `legacy/lp-vanilla/app.js`

### Rotas estaticas legadas (fora do escopo)

- `public/account/index.html`
- `public/success/index.html`
- `public/cancel/index.html`
- `public/auth/google/index.html`

## Configuracao de build/deploy

- `netlify.toml`
- build command: `npm run build:web`
- publish: `.output/public`
- functions: `netlify/functions` (inalterado)
- redirects `/api/*`: inalterados

## Scripts adicionados

- `dev:web`: `nuxt dev`
- `build:web`: `nuxt generate`
- `preview:web`: `nuxt preview`
- `build:functions`: `tsc`

## Observacoes

- Endpoints backend nao mudaram.
- Contrato de checkout/auth/licenca mantido.
- Paridade visual baseada no baseline da LP vanilla.
