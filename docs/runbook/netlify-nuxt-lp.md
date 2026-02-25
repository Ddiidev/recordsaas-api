# Runbook: Netlify + Nuxt LP

## Desenvolvimento local

1. Frontend Nuxt:
- `npm run dev:web`

2. Full stack local (frontend + functions):
- `npm run dev`

## Build local

1. Build SSG da LP:
- `npm run build:web`

2. Preview do build:
- `npm run preview:web`

## Deploy

### Teste

- `npm run deploy:test`

Checklist rapido apos deploy:

1. `/` carrega LP Nuxt.
2. `/account/` abre pagina legada.
3. `/success/` e `/cancel/` acessiveis.
4. `/auth/google/` funciona no fluxo OAuth.
5. `/api/auth/status` responde.
6. `/api/create-checkout` inicia checkout.

### Producao

- `npm run deploy:prod`

Repetir checklist completo do ambiente de teste.

## Variaveis de ambiente

Mantidas como antes:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `APP_URL`

## Rollback rapido

Se precisar rollback visual da LP, use os arquivos em:

- `legacy/lp-vanilla/`

E ajuste temporariamente a estrategia de publish/roteamento conforme necessidade operacional.
