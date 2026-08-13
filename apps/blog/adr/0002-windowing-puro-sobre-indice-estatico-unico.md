# Blog-0002 — Windowing puro sobre um índice estático único, sem paginação e sem scroll infinito

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `app/page.tsx`, `components/post-list/*`

## Contexto

A listagem do blog precisa dar acesso a 10.000 posts. Três técnicas costumam ser
confundidas porque todas "mostram uma lista grande", mas resolvem problemas
diferentes:

| Técnica | O que ataca | Custo |
| --- | --- | --- |
| **Windowing** (virtualização) | Peso de DOM, memória, INP | Exige a lista já em memória |
| **Scroll infinito** | Payload inicial | Fetches incrementais ao rolar |
| **Paginação** | SEO, deep-link, compartilhamento | URLs e estado |

Uma versão anterior deste plano combinava windowing **+** scroll infinito
(chunks buscados por `IntersectionObserver`). Isso foi descartado: o objetivo
desta fase é testar a **virtualização em si** no Next.js, e 10.000 itens é o
cenário desenhado para forçar esse teste. Misturar fetch incremental turva
exatamente a variável que se quer medir.

## Decisão

### 1. Um índice estático único, gerado no build

`public/blog-data/posts-index.json` carrega os **resumos** dos 10.000 posts
(`slug`, `title`, `excerpt`, `author`, `publishedAt`, `coverImage`) — sem
`body`. É a mesma separação resumo-vs-detalhe do ADR 0006 do storefront
(`ListItem = Omit<Product, 'items'>`), e é o que mantém o payload viável.

O cliente busca esse arquivo **uma vez**, guarda o array inteiro em memória, e o
virtualizador (TanStack Virtual) decide o que materializa no DOM. Não há chunk
N+1, não há `IntersectionObserver` disparando fetch, não há `?page=`. Só
paginação de **renderização** — que é o que windowing é.

### 2. O trade-off de payload, assumido de propósito

Medido, não estimado:

| | Tamanho |
| --- | --- |
| Índice cru | 3,10 MB |
| Na rede (gzip) | ~740 KB |
| Na rede (brotli) | ~546 KB |

É um payload único maior que o de um chunk. O que o torna aceitável é **o que
ele não é**: não é rota dinâmica nem invocação serverless. É asset estático,
same-origin (`'self'` na CSP), comprimido e cacheado no edge. O custo é de
**rede na primeira carga da listagem**, não de CPU por request.

`scripts/verify-posts.ts` falha o build se o índice passar de 6 MB — o
trade-off tem um teto explícito, não uma tolerância tácita.

### 3. A primeira janela vai no HTML servido

Os primeiros 24 posts são renderizados pelo Server Component como `<article>`
com `<a href>` **reais**. Verificado no HTML servido: 24 `<article>`, 24 hrefs
únicos, sem JS.

Sem isso, a listagem seria uma tela em branco para quem chega sem JS —
exatamente o anti-padrão que o ADR 0009 do storefront existe para prevenir. Um
`<noscript>` aponta para o sitemap.

### 4. A costura, registrada como custo

O virtualizador precisa "adotar" a janela que o servidor já pintou. A sequência:

1. Primeiro render no cliente: renderiza a primeira janela, markup **idêntico**
   ao do servidor — sem isso a hidratação acusa mismatch.
2. Efeito: busca o índice completo.
3. Índice na mão: o virtualizador liga e assume o scroll dali em diante.

O custo visível: entre (1) e (3) a lista mostra só a primeira janela, e a altura
da página salta quando os 10.000 entram. Isso é o comportamento que o teste quer
observar, não um defeito escondido.

### 5. `ESTIMATED_ROW_HEIGHT` é um número medido

Medido em 390px, 768px e 1280px de largura: **113px**, igual nos três (o
`line-clamp` do card é o que trava a altura).

Isso importa mais do que parece. Só as linhas já renderizadas são medidas; as
outras ~9.900 continuam valendo a estimativa no cálculo da altura total. Com o
chute inicial de 140px, a lista reservava 1.399.620px para um conteúdo real de
1.130.000px e **a barra de rolagem encolhia sozinha durante a rolagem**. Com 113,
a altura reservada bate exatamente: 10.000 × 113 = 1.130.000px.

### 6. `<img>` na listagem, `next/image` na página do post

Numa lista virtualizada as imagens montam e desmontam a cada scroll, e o
`next/image` acrescenta wrapper, observer e estado a cada uma — custo que
aparece justamente no INP que este experimento mede. Na listagem a miniatura é
decorativa, de tamanho fixo e origem já autorizada na CSP: o componente não
compraria nada. Na **página** do post, onde a capa é o LCP, `next/image` com
`preload` é o certo — ver [[0006-isr-sob-demanda-com-subconjunto-pre-gerado]].

## Consequências

**Positivas** — verificado em Chrome headless, build de produção:

- **14 `<article>` no DOM** para uma lista de 10.000. DOM de ~48 KB.
- Altura reservada de 1.130.000px: a barra de rolagem representa os 10.000 itens
  corretamente, com dezenas de nós no DOM.
- Nenhum erro de hidratação no console, apesar da costura servidor→cliente.
- Zero rota dinâmica: a listagem é prerenderizada no build.

**Negativas / limitações aceitas**

- ~740 KB comprimidos na primeira carga da listagem, antes do scroll ficar
  responsivo além da primeira janela.
- O array de 10.000 resumos fica inteiro em memória JS enquanto a listagem
  estiver aberta.
- O salto de altura do documento quando o índice chega.
- Sem JS, o usuário vê 24 posts e um link para o sitemap — nada além disso.
- Não há busca nem filtro dentro da listagem. No instante em que entrarem,
  reintroduzem rota dinâmica e a zona deixa de ser "a estática barata".

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Windowing + scroll infinito (versão anterior do plano) | Variável de confusão: mistura efeito de rede com efeito de virtualização, e o experimento existe para medir a segunda isolada. |
| Paginação com `?page=` | Resolveria SEO e deep-link, mas é a técnica que o projeto existe para **não** usar. O SEO é pago pelo sitemap — ver [[0005-seo-sem-paginacao-sitemap-como-canal-de-crawler]]. |
| Índice servido por Route Handler | Reintroduz invocação serverless por request e, com ela, a classe inteira de problemas do ADR 0014 (rate limiting). O asset estático elimina isso. |
| Renderizar os 10.000 no HTML | DOM de dezenas de MB, TBT inaceitável. É o problema que o windowing resolve. |
| Altura de linha fixa, sem `measureElement` | Quebraria se a tipografia mudasse. A medição corrige sozinha; a constante só precisa estar perto. |
