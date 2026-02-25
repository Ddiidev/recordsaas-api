# Baseline Funcional da LP (Vanilla)

Data de congelamento: 2026-02-25
Fonte canonica: `legacy/lp-vanilla/*`

## Estrutura de secoes

1. Navbar flutuante (`.navbar`) com:
- links `#features`, `#pricing`
- visibilidade condicional de `Account`
- switch de tema
- switch de idioma
- menu auth (Google / usuario)

2. Hero (`#hero`)
3. Features (`#features`)
4. Pricing (`#pricing`)
5. CTA final
6. Footer

## Comportamentos JS obrigatorios

- Tema `light/dark/system` com persistencia em `localStorage(recordsaas_theme)`.
- Idioma `en/pt-BR` com persistencia em `localStorage(recordsaas_lang)`.
- Auto-regiao por idioma para preco/moeda:
- `pt-BR` => `br` => `R$` e valores BR.
- `en` => `global` => `$` e valores globais.
- Dropdowns de idioma/tema com fechamento por clique fora.
- Menu mobile com toggle e fechamento externo.
- Animacoes de entrada em cards via `IntersectionObserver`.

## Fluxo de auth / checkout

- Login Google por redirect OAuth para `/auth/google/`.
- Callback salva `recordsaas_session` e `recordsaas_user` em localStorage.
- Landing restaura sessao e valida via `/api/auth/status`.
- Checkout:
- sem usuario: salva `recordsaas_pending_checkout` e inicia login.
- com usuario: chama `/api/create-checkout`.
- erros 409 tratados: assinatura/lifetime ja ativos.

## Matriz manual de paridade visual

- Desktop >=1440: comparar seccao a seccao com baseline.
- Tablet 1024/768: sem quebra de grid/spacing.
- Mobile 375: sem overflow horizontal.
- Tema:
- alternar `light/dark/system`.
- manter preferencia apos reload.
- Idioma:
- alternar EN/PT e validar copy completa.
- Pricing:
- PT => `R$ 27` / `R$ 177`.
- EN => `$10` / `$87`.
