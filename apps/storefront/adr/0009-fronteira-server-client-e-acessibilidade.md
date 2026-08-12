# ADR 0009 — Fronteira Server/Client Component ("ilhas") e acessibilidade dos controles interativos

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O storefront segue um padrão de "ilhas client": a maior parte de cada página
é Server Component (zero JS enviado ao browser), e só os pontos que precisam
de estado de UI viram `'use client'`. Esse recorte se repete em pelo menos
quatro lugares — o seletor de SKU da PDP, o autocomplete de busca do header,
o formulário de busca e o footer — e cada um documenta explicitamente por que
a fronteira fica onde fica.

## Decisão

### 1. `SkuSelector` é a única ilha client da PDP

`components/product/sku-selector.tsx` é client porque escolher um SKU muda
preço, disponibilidade e o que vai para o carrinho sem sair da rota — isso é
estado de UI, não navegação. O resto da PDP (galeria, descrição, ficha
técnica) permanece Server Component. Preço e estoque saem sempre de
`item.offer`; `priceFrom` do produto (campo de listagem, ver
[[0005-camada-de-dados-do-catalogo-leitura-via-fs]]) não é usado aqui.

O seletor abre no SKU disponível mais barato — o que o card da listagem
prometeu com o "a partir de". Se nenhum SKU tem estoque, cai no primeiro para
a página nunca renderizar sem uma seleção.

### 2. `SearchSuggestions` envolve só o `<input>`, não o `<form>`

`components/header/search-form.tsx` é Server Component; um `<form
method="get">` puro que o browser submete sozinho (`?q=...` na URL), sem
`onSubmit` nem `router.push` — trade-off assumido de navegação completa em
vez de transição client-side, aceitável porque o destino é uma página, não um
estado de UI. `SearchSuggestions`
(`components/header/search-suggestions.tsx`) é a única parte que precisa de
estado client, e fica isolada dentro do `<input>` — a busca continua
funcionando com JavaScript desligado.

Dentro dela: as sugestões usam `<datalist>` nativo em vez de um dropdown
custom — o browser cuida do menu, do teclado e da acessibilidade, e um
dropdown próprio custaria ~10x mais código para reimplementar (pior) o que o
HTML já resolve, relevante porque este componente carrega em toda página. O
estado derivado (`term.trim().length >= 2 ? suggestions : []`) evita um
`setState` dentro de `useEffect`, que geraria um render em cascata a cada
tecla — exatamente o que a regra `react-hooks/set-state-in-effect` existe
para prevenir. `AbortController` cancela a resposta lenta de uma busca
anterior para não sobrescrever a resposta rápida de uma busca mais recente
(a corrida clássica de autocomplete), e o debounce de 200ms evita disparar um
request por tecla.

### 3. Footer é Server Component com uma única concessão de interatividade nativa

`components/footer/footer.tsx` roda em toda rota, então qualquer JS embarcado
é custo pago site inteiro — por isso é Server Component, com todo link como
`<a href>` puro no HTML servido. A única interatividade é um `<details>`
nativo (sem JS) para o bloco de categorias no mobile, neutralizado por CSS no
desktop (`lg:[&>summary]:hidden` + conteúdo forçado a `block`).

### 4. Acessibilidade dos controles: `sr-only`, não `hidden`, e skip link

O `<input type="radio">` de cada opção do `SkuSelector` usa `className="sr-
only"`, não `hidden`: o input precisa continuar focável e anunciável para
quem navega por teclado trocar de variação com as setas, como em qualquer
grupo de radio buttons — `hidden` removeria o elemento da árvore de
acessibilidade.

`app/layout.tsx` tem um skip link (`Pular para o conteúdo`) apontando para
`#conteudo`, logo após o `<Header>`: o header tem ~40 links antes do
conteúdo principal, e sem o skip link cada visita por teclado precisaria
tabular por todos eles primeiro.

## Consequências

**Positivas**

- O JavaScript enviado ao browser fica restrito às ilhas que de fato precisam
  de estado — header, footer, galeria e ficha técnica da PDP nunca carregam
  JS.
- Busca e navegação por SKU continuam funcionais sem JavaScript, com o
  autocomplete e a troca de variação como progressive enhancement.
- Uso de widgets nativos (`<datalist>`, `<details>`) reduz código e herda
  comportamento de acessibilidade e teclado do browser de graça.

**Negativas / limitações aceitas**

- O padrão de "ilha isolada dentro do elemento HTML pai" (input dentro do
  form, `<details>` dentro do footer) exige atenção redobrada sempre que
  alguém mexe no componente pai, para não acidentalmente promover o pai
  inteiro a client.
- `<datalist>` tem menos controle visual que um dropdown customizado — o
  estilo do menu de sugestões segue o que o browser do usuário decide
  renderizar.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Dropdown de autocomplete customizado | ~10x mais código para reimplementar pior o que `<datalist>` já resolve nativamente, num componente carregado em toda página. |
| `SearchForm` inteiro como Client Component | Perderia a garantia de busca funcional sem JS — o objetivo explícito era isolar o estado no menor escopo possível. |
| `hidden` no input de rádio do seletor de SKU | Removeria o elemento da árvore de acessibilidade, quebrando navegação por teclado entre variações. |
| `setSuggestions([])` dentro de `useEffect` para termo curto | Dispararia um render em cascata a cada tecla digitada — a regra `react-hooks/set-state-in-effect` sinaliza exatamente esse padrão. |
