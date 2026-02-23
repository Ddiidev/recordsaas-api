# Agent Guide — RecordSaaS API

## Fluxo de atualização dos ambientes

**Produção (recordsaas-api)**
1. Garanta o código atualizado no repositório local.
2. Faça deploy para o site Netlify:
   - `siteId`: `cd0ac2c6-f52b-4c61-b6b0-6055627c389b`
   - URL: `https://recordsaas-api.netlify.app`
3. Acompanhe o deploy no painel Netlify.

**Teste (recordsaas-api-test)**
1. Garanta o código atualizado no repositório local.
2. Faça deploy para o site Netlify:
   - `siteId`: `ad52bf01-0145-4384-81e1-522cf14df5a1`
   - URL: `https://recordsaas-api-test.netlify.app`
3. Acompanhe o deploy no painel Netlify.

## Como subir para o GitHub

1. Verifique alterações:
   - `git status -sb`
2. Adicione os arquivos:
   - `git add <arquivos>`
3. Faça o commit:
   - `git commit -m "sua mensagem"`
4. Envie para o remoto:
   - `git push origin main`

## Variáveis de ambiente necessárias

Estas variáveis são lidas via `Netlify.env.get(...)` nas Functions:

- `STRIPE_SECRET_KEY`  
  Chave secreta do Stripe para criar sessões, consultar cobranças e webhooks.

- `STRIPE_WEBHOOK_SECRET`  
  Segredo do webhook Stripe para validar eventos em `/api/webhook`.

- `GOOGLE_CLIENT_ID`  
  Client ID do Google OAuth usado no login via Google.

- `APP_URL`  
  URL base usada para `success_url` e `cancel_url` no checkout.

## Stack completa do app

- **Frontend**: HTML + CSS + JavaScript (vanilla)
- **Backend**: Netlify Functions (TypeScript)
- **Pagamentos**: Stripe SDK
- **Auth**: Google Sign-In
- **Infra/Deploy**: Netlify
- **Runtime**: Node.js
- **Build**: TypeScript
