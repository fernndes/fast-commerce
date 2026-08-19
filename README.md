# fast-commerce

> A loja de e-commerce mais performática que eu conseguir construir —
> **incluindo tudo que uma loja real possui**, inclusive o que atrapalha a
> performance: scripts de terceiro, consent, analytics, imagens de CDN,
> catálogo grande.

## A tese

O desafio real de performance em e-commerce não é otimizar um site vazio; é
entregar velocidade máxima com tudo que o negócio, o marketing e a lei
obrigam a carregar. Este projeto não é um benchmark comparativo ("ferramenta
A vs B") nem uma demo enxuta que finge que loja real é leve — é a prova de
que dá para manter uma loja rápida com o stack completo a bordo, com cada
trade-off medido e documentado.

O foco é **performance de frontend**. A loja cobre os elementos que impactam
performance — catálogo, PDP, busca, carrinho, checkout (UI), banners,
consent, analytics, stack de terceiros. O que não é o ponto — pagamento
real, backend transacional, autenticação de verdade — é mockado no front: a
UI existe e é medida; a lógica de servidor é simulada.

## Estrutura do monorepo

```
fast-commerce/
├─ apps/
│  ├─ storefront/     # Loja (Next.js) — host do domínio, produtos/categorias/busca
│  └─ blog/            # Zona editorial (Next.js) — servida via Multi-Zones sob /blog
├─ packages/
│  ├─ nav/              # Dados/geração de categorias de navegação
│  ├─ ui/                # Design tokens, brand, primitivos de UI (React)
│  └─ ui-patterns/      # AppHeader / AppFooter compartilhados entre as zonas
├─ docs/adr/             # ADRs históricos do início do projeto (casca em web components)
└─ apps/*/adr/           # ADRs vigentes de cada app (decisão → consequência → alternativas)
```

Workspaces via `npm`; cada app builda e faz deploy de forma independente
(dois projetos Vercel), ligados apenas pela URL de rewrite entre zonas.

### `apps/storefront` — a loja

Next.js 16 / React 19. Rotas principais: `/produtos`, `/produtos/[slug]`,
`/categorias/[slug]`, `/busca`, além de rotas de API finas (`/api/produtos`,
`/api/busca`) sobre uma camada de dados que lê o catálogo (`data/big.json`)
via `fs`, memoizada por processo. É o **host** do domínio: além de servir a
loja, faz o proxy (`rewrites`) de `/blog` e `/blog-static` para o deploy do
blog.

### `apps/blog` — zona editorial (Next.js Multi-Zones)

Projeto Next.js separado, com build e deploy próprios, servido sob o mesmo
domínio via **Multi-Zones** (`basePath: /blog`, `assetPrefix:
/blog-static`). 10.000 posts gerados uma única vez em build time por
`@faker-js/faker` (seed fixa, determinístico), lidos em runtime via `fs` —
faker nunca entra no bundle de produção. A listagem não pagina nem faz
scroll infinito: usa **windowing puro** (`@tanstack/react-virtual`) sobre um
índice estático único (`posts-index.json`), com a primeira janela
renderizada no HTML para LCP/SEO e um `sitemap.xml` com os 10 mil slugs para
crawlers. CSP, security headers, consent e container GTM são replicados
origem-por-origem em relação ao storefront — as duas zonas compartilham
origem, então consent e cookies atravessam sem exibir o banner duas vezes.

### `packages/`

- **`@repo/nav`** — geração dos dados de categoria/navegação usados pelo mega
  menu.
- **`@repo/ui`** — tokens de design (Tailwind), marca, ícones e primitivos.
- **`@repo/ui-patterns`** — `AppHeader`/`AppFooter` como Server Components
  React, publicados como TSX cru (sem step de build próprio — cada app os
  transpila no seu próprio grafo via `transpilePackages`, o que preserva a
  fronteira server/client).

## Stack técnico

- **Next.js 16** (App Router) + **React 19**, TypeScript
- **Tailwind CSS v4**, sem CSS-in-JS de runtime
- `@tanstack/react-virtual` (windowing da listagem do blog)
- `@next/third-parties` (Google Tag Manager)
- `@sentry/nextjs` (observabilidade / erros — storefront)
- `@vercel/speed-insights` (RUM — Core Web Vitals de campo, nas duas zonas)
- `@faker-js/faker` (devDependency — geração de conteúdo do blog em build
  time)
- Lighthouse CI (`@lhci/cli`) com budget travado no pipeline

## Como rodar localmente

Requer Node 22+ (CI usa Node 22 para o storefront e Node 24 para o blog, que
roda `.ts` nativamente sem passo de transpilação).

```bash
npm install

# sobe as duas zonas (storefront :3000, blog :3001)
npm run dev

# só uma zona
npm run dev --workspace=fast-commerce   # storefront
npm run dev --workspace=blog            # blog
```

Para navegar entre zonas localmente como em produção, aponte
`BLOG_ZONE_URL=http://localhost:3001` no `.env.local` do storefront — sem
essa variável o rewrite `/blog` não é montado.

```bash
npm run build   # build --workspaces (nav primeiro, os outros dependem dele)
npm run lint
```

## Performance: budget e medição

Lighthouse CI roda em todo push/PR (`.github/workflows/lighthouse-ci.yml`),
como **dois jobs independentes** — um por zona, sem `needs` entre eles, para
que uma quebra não derrube a outra. Budget travado (`error`, não `warn`):

| Métrica | Limite |
|---|---|
| Performance score | ≥ 0.95 |
| LCP | ≤ 2500 ms |
| CLS | ≤ 0.1 |
| TBT | ≤ 200 ms |

RUM de campo via Vercel Speed Insights nas duas zonas, para contrastar o
número de lab (Lighthouse) com a experiência real de usuário.

## Segurança

CSP por origem (sem nonce, sem SRI — decisão registrada em ADR, ver
`apps/storefront/adr/0002-*`), replicada **origem por origem** na zona blog
para que a política não divirja entre `/produtos` e `/blog` sob o mesmo
domínio. Security headers completos (`HSTS`, `X-Frame-Options: DENY`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) em ambas
as zonas. Rate limiting em memória nas rotas de API do storefront. Conteúdo
markdown do blog sanitizado em build time antes de virar HTML.

## Decisões de arquitetura (ADRs)

Cada decisão não óbvia — estratégia de renderização por rota, consent via
GTM, windowing sem scroll infinito, ISR sob demanda com `generateStaticParams`
vazio, ausência de banco de dados — está registrada como ADR em
`apps/storefront/adr/` e `apps/blog/adr/`, no formato contexto → decisão →
consequências → alternativas descartadas, com wikilinks entre ADRs
relacionados entre as duas zonas.

## Roadmap

O projeto se organiza em um **núcleo obrigatório** — que constrói a loja
completa e prova sua performance do laboratório ao campo — e uma **trilha
opcional**, que estende o projeto depois do núcleo fechado.

| Fase | Trilha | Tese |
|---|---|---|
| 1 — Storefront & Otimização em Lab | Núcleo | Performance como engenharia mensurável, com CI e budget travado |
| 2 — Loja Real Completa & seus Trade-offs | Núcleo | Loja rápida com todo o stack que uma loja real carrega (terceiros, consent, catálogo grande) |
| 3 — Performance de Campo (RUM) | Núcleo | Confirmar em campo o que foi otimizado em lab, sob condições adversas |
| Blog em Multi-Zones | Núcleo (extensão) | Windowing puro em 10k posts, zona separada sem costura de UX/CSP/consent |
| 5 — Escala, Resiliência, Observabilidade & Segurança | Núcleo (extensão) | Escalar sem banco de dados: índice pré-computado, cache de edge, teste de carga (k6), CSP, rate limiting |
| O1 — Backend & API própria | Opcional | API NestJS + GraphQL/REST sobre PostgreSQL, substituindo a camada `lib/` sem tocar nas páginas |
| O2 — Parceiros hostis & resiliência | Opcional | Sincronização resiliente (filas, idempotência, anticorruption layer) contra parceiros simulando falhas reais |
| O3 — Extensão Chrome de cenários adversos | Opcional / satélite | Throttling real via `chrome.debugger`/CDP, projeto autônomo pós-núcleo |

Regra de foco: nada da trilha opcional entra antes do núcleo estar
concluído — as opcionais são enriquecimento, nunca pré-requisito.

## Trilha de escrita

Cada fase fechada e cada mini-case (problema → decisão → antes/depois) vira
um artigo curto, com base nos ADRs e nas métricas capturadas.
