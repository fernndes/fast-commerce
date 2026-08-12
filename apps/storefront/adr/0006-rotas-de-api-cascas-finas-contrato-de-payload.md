# ADR 0006 — Rotas de API como cascas finas, com contrato explícito de payload

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

`app/api/produtos/route.ts` existe só para o windowing/"carregar mais" da PLP
no browser. Server Components (a página `/produtos`, categorias, home) não
passam por ela — chamam `listProducts` de `lib/catalog.ts` direto, no mesmo
processo (ver [[0005-camada-de-dados-do-catalogo-leitura-via-fs]]). A rota
precisou de três decisões que não são óbvias olhando só a assinatura de
`GET`.

## Decisão

### 1. Server Component nunca chama a própria API por HTTP

Uma página que buscasse a própria API pagaria um hop de rede desnecessário
para falar consigo mesma. `app/api/produtos/route.ts` é a casca fina que
existe porque o *cliente no browser* não tem acesso ao `fs` — não porque as
páginas do app precisem dela.

### 2. `force-dynamic` é declaração de intenção, não workaround de cache

No Next 16, Route Handlers já não são cacheados por padrão. `export const
dynamic = 'force-dynamic'` está lá mesmo assim, como declaração explícita de
que a resposta depende inteiramente da query string — e por isso o arquivo
não tem `revalidate`: os dois não convivem (um desligaria o cache que o outro
configura). A mesma decisão se repete, pelo mesmo motivo, em
`app/api/busca/sugestoes/route.ts`.

### 3. Payload sem `items[]`

`ListItem` (`app/api/produtos/route.ts:29`) é `Omit<Product, 'items' |
'search'>`. Um produto tem até 5 SKUs com imagens repetidas; multiplicar isso
por até 24 produtos por página infla a resposta várias vezes para uma
listagem que só mostra o `priceFrom`. Quem precisa dos SKUs é a PDP, que lê o
produto inteiro por slug via `getProductBySlug`.

### 4. `toListItem` lista campo a campo — é um contrato, não um spread

`toListItem` (linha 37) enumera cada campo do `ListItem` explicitamente, em
vez de `{ items, search, ...rest }`. Escrito por extenso, um campo novo em
`Product` (um custo interno, um índice de busca) não vaza para a resposta da
API sozinho — para entrar no payload público, alguém precisa vir a este
arquivo e decidir isso deliberadamente.

### 5. Rate limit antes de qualquer parse ou I/O

A checagem de `checkRateLimit` é a primeira linha de `GET`, antes do parse da
query string. Um flood de requests inválidos ainda pagaria CPU de parsing se
o 400 viesse primeiro — ver ADR 0002 da raiz,
`docs/adr/0002-rate-limit-em-memoria-nas-rotas-de-api.md`.

## Consequências

**Positivas**

- Server Components nunca pagam um round-trip de rede para ler o próprio
  catálogo.
- O payload de listagem fica uma fração do tamanho que `items[]` completo
  produziria.
- Adicionar um campo interno a `Product` não corre o risco de vazar para a
  API pública sem uma decisão explícita.

**Negativas / limitações aceitas**

- `toListItem` precisa ser atualizado manualmente toda vez que um campo novo
  de `Product` deve aparecer na listagem — é atrito deliberado, não
  automação.
- `force-dynamic` sem `revalidate` significa que não há cache de resposta
  algum nessas duas rotas; todo request paga o custo de `listProducts`/
  `getSuggestions` por inteiro (mitigado pelo rate limit, não pelo cache).

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Server Components lerem a API via `fetch` interno | Hop de rede local desnecessário — as funções de `lib/catalog.ts` já rodam no mesmo processo. |
| Devolver `Product` completo (com `items[]`) na listagem | Infla o payload várias vezes para uma UI que só mostra "a partir de"; a PDP já busca o produto completo por slug quando precisa. |
| `{ ...rest }` no lugar da allowlist campo a campo | Mais curto, mas qualquer campo novo em `Product` vazaria para a resposta pública sem decisão explícita — o objetivo do contrato é justamente evitar isso. |
