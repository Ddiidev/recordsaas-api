# AGENTS Guide for `recordsaas-api`

Technical operational guide for LLMs working on the Nuxt landing page and Netlify Functions backend.

## 1) Scope and Boundaries

This repo owns:
- Website LP behavior (`/`, `/roadmap`) and visual system for the landing experience.
- Pricing/checkout/auth/session backend endpoints under Netlify Functions.
- API redirects and publish configuration in Netlify.

This repo does not own:
- Desktop timeline/editor internals, Electron IPC, or desktop rendering/export internals.
- Those belong to `recordsaas/`.

## 2) Architecture Map

- Frontend (Nuxt 3 SSG):
- `pages/index.vue`
- `pages/roadmap.vue`
- `composables/useLandingPage.ts`
- `composables/useRoadmapPage.ts`
- `constants/landing-i18n.ts`
- `types/landing.ts`
- `types/roadmap.ts`
- `assets/css/landing.css`

- Backend (Netlify Functions):
- `netlify/functions/*.mts`
- Shared logic: `netlify/functions/_lib/*.mts`
- Redirect mapping: `netlify.toml`

- Design and parity references:
- `design-system/recordsaas-lp/pages/landing.md` (first reference)
- `design-system/recordsaas-lp/MASTER.md` (fallback reference)
- `docs/design-system/landing.md`

## 3) Where to Change What (Decision Matrix)

### Pricing copy, cards, and plan presentation

Change:
- `pages/index.vue`
- `constants/landing-i18n.ts`
- `composables/useLandingPage.ts`
- `types/landing.ts`

Notes:
- Keep EN/PT-BR parity.
- Keep plan identifiers consistent across UI, type unions, and checkout payload.

### Checkout, auth, and session behavior

Change:
- `composables/useLandingPage.ts`
- `netlify/functions/*auth*.mts`
- `netlify/functions/create-checkout.mts`

Notes:
- Preserve desktop bridge and OAuth redirect flows if touched.
- Keep error codes/messages contract-stable when possible.

### API route behavior and function wiring

Change:
- `netlify/functions/*.mts`
- `netlify.toml`

Notes:
- Every new/changed endpoint must have matching redirect configuration.
- Avoid silent route drift between frontend calls and redirects.
- `netlify/functions/latest-version.mts` must only expose the most recent NocoDB row/version where `active = true`.
- `netlify/functions/roadmap.mts` returns the latest two roadmap entries by default; full history remains behind `?all=true`.

### Visual design parity and landing styling

Change:
- `assets/css/landing.css`
- `pages/index.vue`
- `design-system/recordsaas-lp/pages/landing.md` (as design source)

Notes:
- Keep parity with design-system references and existing visual language.

## 4) Safe-Change Guardrails

1. Keep i18n parity:
- Every user-facing copy change must be reflected in both `en` and `pt-BR`.

2. Preserve redirects and contracts:
- Keep `/api/*` redirect behavior aligned with function names in `netlify.toml`.

3. Preserve required env assumptions:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `APP_URL`

4. Preserve auth and checkout compatibility:
- Do not break localStorage/session expectations without coordinated migration.

5. Keep LP + function behavior synchronized:
- Frontend payload shapes and backend validation must evolve together.

## 5) Quick Commands

From repo root `recordsaas-api/`:

```bash
npm run dev:web
npm run dev
npm run build:web
npm run preview:web
npm run deploy:test
npm run deploy:prod
```

## 6) QA Checkpoints After Changes

Minimum checks:
1. Landing (`/`) loads and key sections render.
2. Pricing cards render expected plans and CTA actions.
3. i18n toggle EN/PT-BR updates all changed copy.
4. Auth status flow remains functional (`/api/auth/status`).
5. Checkout init remains functional (`/api/create-checkout`).
6. If function routes changed, matching redirects exist in `netlify.toml`.
7. `/api/latest-version` returns the most recent active NocoDB version and ignores newer inactive rows.
8. Landing and roadmap expose the support email in visible locations with EN/PT-BR parity.
9. `/roadmap` shows the latest two entries by default and starts the penultimate entry collapsed.

## 7) Cross-Repo Escalation Rule

If request touches desktop behavior (timeline/editor/Electron):
- Do not implement in this repo.
- Route to workspace router (`../AGENTS.MD`) and then `recordsaas/AGENTS.MD`.

## 8) AGENTS Maintenance Enforcement

AGENTS maintenance is mandatory for both humans and LLMs.

Rules:
1. If architecture, contracts, routing ownership, or QA protocol changes, update this `AGENTS.MD` in the same change set.
2. If request behavior changes in landing or functions, keep this guide aligned with the new source-of-truth files.
3. For cross-repo changes, also update root `../AGENTS.MD` when routing or ownership notes change.
4. A task is incomplete if AGENTS guidance is stale.

Done criteria:
1. "Where to Change What" matrix still points to valid files.
2. Guardrails still match current env/redirect/auth assumptions.
3. QA checkpoints still reflect the implemented behavior.
