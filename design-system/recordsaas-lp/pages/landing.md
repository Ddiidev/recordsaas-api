# Landing Page Overrides

> **PROJECT:** RecordSaaS LP
> **Updated:** 2026-02-25
> **Page Type:** Landing / Marketing

Este arquivo sobrescreve o `MASTER.md` para refletir exatamente o design system implementado na LP atual.

---

## Tokens Canonicos da LP Atual

### Typography

- **Heading + Body:** `Plus Jakarta Sans`
- **Import:** `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap`

### Cores (Light)

- `--primary: hsl(154, 60%, 42%)`
- `--primary-hover: hsl(154, 60%, 36%)`
- `--primary-light: hsl(154, 60%, 95%)`
- `--primary-glow: hsla(154, 60%, 50%, 0.25)`
- `--destructive: hsl(0, 72%, 58%)`
- `--bg: #ffffff`
- `--bg-soft: #f8faf9`
- `--bg-muted: #f1f5f3`
- `--bg-card: #ffffff`
- `--text: hsl(0, 0%, 13%)`
- `--text-muted: hsl(0, 0%, 46%)`
- `--text-subtle: hsl(0, 0%, 62%)`
- `--border: hsl(0, 0%, 90%)`
- `--border-light: hsl(0, 0%, 94%)`

### Cores (Dark)

- `--bg: hsl(215, 16%, 12%)`
- `--bg-soft: hsl(215, 16%, 15%)`
- `--bg-muted: hsl(215, 16%, 18%)`
- `--bg-card: hsl(215, 16%, 17%)`
- `--text: hsl(210, 20%, 98%)`
- `--text-muted: hsl(215, 16%, 70%)`
- `--text-subtle: hsl(215, 16%, 55%)`
- `--border: hsl(215, 16%, 28%)`
- `--border-light: hsl(215, 16%, 24%)`
- `--primary-light: hsla(154, 60%, 50%, 0.15)`

### Radius e Sombra

- `--radius: 5px`
- `--radius-lg: 6px`
- `--radius-xl: 8px`
- `--card-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)`
- `--card-shadow-hover: 0 4px 12px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)`

---

## Estrutura Canonica da Pagina

1. Navbar flutuante com login/auth e switches (tema/idioma)
2. Hero
3. Features
4. Pricing
5. CTA final
6. Footer

---

## Comportamentos Obrigatorios

- Tema: `light`, `dark`, `system` com persistencia em `localStorage(recordsaas_theme)`.
- Idioma: `en` e `pt-BR` com persistencia em `localStorage(recordsaas_lang)`.
- Regiao: auto-sync por idioma (`pt-BR -> br`, `en -> global`) para preco/moeda.
- Auth: login Google via redirect (`/auth/google/`) com sessao em localStorage.
- Checkout: chamadas a `/api/create-checkout` com tratamento dos conflitos `409`.

---

## Breakpoints e Responsividade

- Base: desktop-first
- Breakpoint principal: `@media (max-width: 768px)`
- Checklist manual: 375px, 768px, 1024px, 1440px

---

## Regra de Paridade

A implementacao Nuxt deve preservar classes CSS originais e hierarquia visual da LP vanilla para evitar drift visual.
