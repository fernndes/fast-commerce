# Blog — zona editorial (Next.js Multi-Zones)

Blog editorial de 10.000 posts, **projeto Next separado** do storefront, servido
sob o mesmo domínio via Multi-Zones.

A listagem não usa paginação nem scroll infinito: usa **windowing puro**
(virtualização) sobre um índice estático único gerado no build. Cada post é uma
página estática. O conteúdo é gerado uma única vez por `@faker-js/faker`
(build-time, seed fixa) e faker nunca roda em produção.

**A tese:** "projeto separado" não significa "experiência separada" — o usuário
atravessa storefront → blog sem perceber a fronteira de deploy, com o mesmo
header, o mesmo consent, a mesma CSP e os mesmos Web Vitals.

## Como rodar

```bash
npm install
npm run generate:posts   # gera data/posts.json + public/blog-data/posts-index.json
npm run dev              # :3000 por padrão; use -p 3001 junto com o storefront
```

`npm run build` já encadeia `generate:posts` e `verify:posts` antes do
`next build` — o conteúdo não é versionado, é regenerado (a seed fixa garante o
mesmo resultado byte a byte).

### Rodando as duas zonas juntas

```bash
# terminal 1 — a zona blog
cd apps/blog && npm run dev -- -p 3001

# terminal 2 — o host, que proxeia /blog
cd apps/storefront
echo 'BLOG_ZONE_URL=http://localhost:3001' >> .env.local
npm run dev
```

Depois disso, `http://localhost:3000/blog` serve a zona blog de forma
transparente. **É assim que se testa de verdade** — ver as ressalvas abaixo.

## Scripts

| Script | O que faz |
| --- | --- |
| `generate:posts` | Gera os 10.000 posts com `faker.seed(42)`. Determinístico. |
| `verify:posts` | Falha se houver slug duplicado, índice fora de ordem, índice acima de 6 MB ou HTML perigoso sobrevivendo à sanitização. |
| `build` | `generate:posts` → `verify:posts` → `next build`. |
| `lint` | ESLint. |

## Duas ressalvas em desenvolvimento local

Duas coisas não são observáveis em `localhost`. As duas são consequências
corretas da arquitetura, não bugs:

**1. O banner de consent não carrega, e a CSP acusa no console.**

```
Loading the script 'https://fast-commerce-ten.vercel.app/consent/silktide-consent-manager.js'
violates the following Content Security Policy directive: "script-src 'self' ..."
```

O container do GTM referencia os scripts do Silktide por URL absoluta do domínio
de produção. Em `localhost` isso é cross-origin e a CSP bloqueia — corretamente.

**Isso não é específico do blog:** medido, a home do storefront em `:3000` acusa
6 violações desse tipo e o blog acusa 2. É `localhost` não ser o domínio de
produção, e atinge as duas zonas igualmente. Em produção os dois são
same-origin e `'self'` autoriza — que é justamente o mecanismo pelo qual o
consent vale nas duas zonas ([ADR 0004](./adr/0004-csp-consent-e-headers-entre-zonas.md)).

Consequência prática: **consent não se valida em dev local**, em nenhuma das
zonas.

**2. O `Cache-Control` do índice estático não aparece.**

`next.config.ts` declara `s-maxage` longo para `/blog-data/*`, mas o servidor de
arquivos estáticos do `next start` sobrescreve com `public, max-age=0`. A regra
existe para a CDN. **Confirmar no primeiro deploy** — é a única configuração
deste projeto que não deu para verificar localmente.

## Decisões

Cada decisão relevante virou um ADR em [`adr/`](./adr), no mesmo formato dos ADRs
do storefront (contexto → decisão → consequências → alternativas descartadas),
com wikilinks para os ADRs que herdam.

| ADR | Assunto |
| --- | --- |
| [0001](./adr/0001-multi-zones-assetprefix-rewrites-e-navegacao.md) | Multi-Zones: `assetPrefix`, rewrites, `<a>` cruza zona |
| [0002](./adr/0002-windowing-puro-sobre-indice-estatico-unico.md) | Windowing puro sobre índice estático único |
| [0003](./adr/0003-conteudo-via-faker-build-time-seed-fixa.md) | Conteúdo via faker em build time, seed fixa, `fs` |
| [0004](./adr/0004-csp-consent-e-headers-entre-zonas.md) | CSP, consent e security headers entre zonas |
| [0005](./adr/0005-seo-sem-paginacao-sitemap-como-canal-de-crawler.md) | SEO sem paginação: sitemap como canal de crawler |
| [0006](./adr/0006-isr-sob-demanda-com-subconjunto-pre-gerado.md) | ISR sob demanda com subconjunto curado pré-gerado |
| [0007](./adr/0007-validacao-de-performance-e-campo-na-zona.md) | Validação de performance e de campo |
| [0008](./adr/0008-header-footer-e-tokens-duplicados-sem-workspace.md) | Header/footer duplicados em vez de `packages/ui` |

## O que este projeto não é

Não é um CMS nem um segundo storefront. Não há escrita, autenticação nem banco.
É read-only e estático por construção — o que o torna a zona mais barata de
escalar de todo o sistema.

Busca dentro do blog, comentários, ou qualquer coisa que reintroduza rota
dinâmica (e portanto rate limit, sanitização de input, custo de invocação) é
enriquecimento posterior — e, no instante em que entra, a zona deixa de ser "a
estática barata" e passa a herdar os ADRs 0004/0006/0014 do storefront por
inteiro.
