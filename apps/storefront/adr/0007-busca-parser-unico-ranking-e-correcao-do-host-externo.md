# ADR 0007 — Busca: parser único de query, ranking por relevância e correção do host externo inexistente

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

`app/busca/page.tsx`, antes do commit `194d17e feat: refactor data provider +
add product page + add products page with pagination` (2026-07-30), buscava
`https://api.exemplo/busca` — um host que não existe, então a rota quebrava
em toda visita. O mesmo commit introduziu `lib/query.ts` como parser único de
query string e moveu a busca para consultar o catálogo local via
`searchProducts` (`lib/catalog.ts`).

## Decisão

### 1. Um único parser de query string para API e página

`lib/query.ts:3-12` documenta a razão: a rota `/api/produtos` e a página
`/produtos` (que lê `searchParams` do Server Component) passam pelo MESMO
`parseProductQuery`. Se os dois interpretassem `?sort=` de jeitos diferentes,
a paginação client-side discordaria da primeira página renderizada no
servidor.

A política do parser é estrita por padrão: parâmetro ausente ou vazio vira
`undefined`; parâmetro PRESENTE e inválido é erro 400. Ignorar um `?sort=xyz`
silenciosamente devolveria 200 com uma ordenação que ninguém pediu. `q` é a
exceção documentada em
[[0004-sanitizacao-de-termo-de-busca]] — normalizado, não rejeitado.

`toURLSearchParams` (linha 106) existe porque `searchParams` de Server
Component é um objeto plano, não `URLSearchParams`, e um parâmetro repetido
(`?sort=a&sort=b`) chega como array — a função converte para o mesmo formato
que a rota de API recebe, valendo o primeiro valor em caso de repetição.

### 2. Busca corrigida: catálogo local, não host externo

`app/busca/page.tsx` hoje consulta `searchProducts`, no mesmo processo, em
vez do host `https://api.exemplo/busca` que nunca existiu. `searchProducts` é
`listProducts` com `sort: 'relevance'` como padrão.

Termo ausente não é tratado como erro nem tela em branco — é o convite para
buscar (`app/busca/page.tsx:32`): a página mostra um link para o catálogo
completo em vez de uma mensagem de erro ou uma grade vazia.

### 3. Ranking de relevância

`score()` (`lib/catalog.ts:264`) pontua por token: casar no início do nome
vale mais que casar no meio, e nome vale mais que marca ou categoria — quem
digita "hat" espera "Hat Ergonômico" antes de "Bola da marca Hatfield". Um
token que não casa em lugar nenhum elimina o produto do resultado — a busca é
AND entre tokens, não OR.

### 4. Detalhes de correção no motor de listagem/paginação

Um conjunto de decisões pequenas, mas deliberadas, em `lib/catalog.ts`
sustentam a busca e a listagem:

- `applySort` copia a lista (`[...list]`) antes de ordenar — `list` pode ser
  o array indexado do catálogo, e ordenar in-place bagunçaria o índice
  compartilhado entre requests concorrentes.
- `case 'newest'`: sem campo de data no mock e com `id` sorteado, a ordem do
  arquivo é a única ordem de entrada que existe — "mais novo" é o último item
  do array.
- `paginate`: página fora da faixa (`?page=9999`) cai na última em vez de
  devolver lista vazia — digitar um número grande na URL não deveria produzir
  uma tela em branco.
- `getSuggestions` corta cedo (`if (prefix.length >= limit) break`) — com
  10.000 produtos não compensa varrer o catálogo inteiro para devolver 8
  strings de autocomplete.
- `getFacets` limita marcas ao top-N do recorte atual: o catálogo tem 8.361
  marcas distintas, e uma lista de 8 mil checkboxes não é um filtro utilizável.

## Consequências

**Positivas**

- API e página nunca divergem na interpretação de um mesmo parâmetro de
  query.
- A busca funciona de fato (o bug do host inexistente está corrigido) e
  devolve resultados ordenados por relevância percebida, não por ordem
  arbitrária do índice.
- Página sem SKU no filtro de estoque, página fora de faixa e busca sem termo
  são tratados como estados normais da UI, não como erro.

**Negativas / limitações aceitas**

- O ranking (`score`) é uma heurística fixa (pesos 100/60/30/15/5), não
  configurável nem testado contra métricas de conversão — é "razoável", não
  "medido".
- `getFacets` mostra só as marcas mais frequentes do recorte atual; uma marca
  de cauda longa nunca aparece como filtro, mesmo tendo produtos no
  resultado.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Parsers separados para API e página | Divergência garantida entre a paginação client-side (via API) e a primeira página renderizada no servidor assim que os dois parsers discordassem de um caso de borda. |
| Rejeitar `?page=` fora da faixa com erro | Pior experiência para um link digitado ou compartilhado com número de página desatualizado — cair na última página é mais útil que uma tela vazia. |
| Ordenar in-place o array do índice | Corromperia o catálogo compartilhado entre requests concorrentes — a cópia em `applySort` é o preço de manter o índice imutável. |
