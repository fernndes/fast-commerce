# ui-0001 — Primitivas de `packages/ui`: convenções de acessibilidade e tokens como classes Tailwind

- **Status:** aceito
- **Data:** 2026-08-21
- **Contexto:** `packages/ui`

## Contexto

`packages/ui` reúne as primitivas sem conhecimento de domínio da casca —
`Brand`, `Icon`, `NavList`, `SearchForm`, e os tokens de cor — consumidas por
`packages/ui-patterns` e, através dele, pelas duas zonas (storefront e blog).
A migração de Web Components com Shadow DOM para React puro
(ver [[0004-casca-como-componentes-react-em-workspace]], em `docs/adr`)
eliminou o isolamento de estilo que o Shadow DOM dava de graça: sem
`:host` nem árvore de estilo isolada, cada primitiva precisou de uma
convenção própria e explícita para não divergir de si mesma conforme o
pacote cresce.

## Decisão

### 1. `Brand`: logotipo como texto, nome acessível corrigido por `aria-label`

O logotipo é texto — dois pesos da mesma palavra — não uma imagem: zero
request extra, zero CLS, legível por leitor de tela sem precisar de `alt`.
O único ajuste necessário é o nome acessível: "fastcommerce" lido como uma
palavra só soa errado, então `aria-label="Fast Commerce"` sobrescreve o
texto visível de propósito.

### 2. `Icon`: uma caixa só, `aria-hidden` fixo, tamanho por `className`

Todos os SVGs inline da casca compartilham a mesma viewBox (`0 0 16 16`),
`fill: none` e `stroke: currentColor` — era a regra `.icon` do CSS do Shadow
DOM antigo, agora embutida no componente em vez de vivida numa folha de
estilo separada. Quem precisa de outro tamanho passa `className` (o chevron
do mega menu é menor que os demais).

`aria-hidden="true"` é fixo em todo ícone: nenhum deles carrega significado
próprio — o nome acessível vem sempre do elemento que o contém (`aria-label`
do link, ou o `<summary>` do menu mobile). Um ícone com `aria-hidden`
condicional convidaria a esquecer o nome acessível no elemento pai.

O ícone de hambúrguer/"X" do menu mobile é **um único SVG**, com os dois
traçados alternados por CSS a partir do estado `[open]` do `<details>`
ancestral (`group-open/menu:*`) — não dois ícones trocados por JS. É o que
mantém o menu mobile inteiro sem hidratação
(ver [[0017-mega-menu-css-puro-group-hover-focus-within]], em
`apps/storefront/adr`): o grupo nomeado `group/menu` que a classe depende é
declarado pelo `<details>` em `ui-patterns`, não aqui — o ícone só reage a
ele.

### 3. `NavList`: garante semântica e foco, não decide layout

A forma "lista de links" se repete no header (categorias em destaque,
colunas do mega menu) e no footer (colunas institucionais). `NavList`
garante o que o consumidor não deveria precisar lembrar toda vez: lista de
verdade (`<ul>`/`<li>`, não uma pilha de `<div>`s), toda `key` estável, todo
link com anel de foco. O que ela deliberadamente **não** decide é layout —
direção, gaps, tipografia entram por `className`/`linkClassName`, e a mesma
lista vira linha horizontal na barra de destaques e coluna vertical no
footer sem variante própria para cada caso.

`aria-current` segue a regra de omissão: `true` marca a página atual,
`undefined`/`false` **omite o atributo** em vez de escrever
`aria-current="false"`. React não serializa uma prop `undefined`, o que é o
comportamento correto aqui — `aria-current="false"` seria uma afirmação
(este link não é a página atual, dito explicitamente), quando a ausência do
atributo é o que de fato significa "não é a página atual" para tecnologia
assistiva.

### 4. Tokens de cor: constantes de módulo com valores Tailwind arbitrários, não aliases da paleta

No desenho anterior (Shadow DOM), os tokens de cor eram custom properties
CSS no `:host`, e um único bloco de dark mode redefinia os tokens em vez de
repetir `dark:` em cada seletor. Sem Shadow DOM esse mecanismo específico
some, mas o problema que ele resolvia não: com mega menu e barra de
categorias, o número de elementos que precisa de cor é grande o bastante
para que repetir `dark:zinc-400` (ou o que for) em cada um seja o próprio
código divergindo de si mesmo assim que alguém ajustar só um dos lugares.

A saída equivalente em Tailwind puro é a constante de módulo:
`packages/ui/src/tokens/index.ts` exporta strings de classe já compostas
(claro + `dark:`) para cada papel — texto principal, texto secundário, alvo
de hover, bordas, fundo de hover, anel de foco, largura do trilho de
conteúdo. Consumir a constante em vez do valor cru é o que garante que texto
secundário significa a mesma cor em todo canto da casca.

Os valores são os **mesmos hexadecimais/rgba do CSS antigo**, escritos como
Tailwind arbitrary values (`bg-[#...]`), e não os aliases da paleta padrão
do Tailwind (`bg-zinc-400`) — mesmo a paleta zinc coincidindo hoje. Depender
da coincidência faria a casca mudar de cor sozinha se a escala de cinza do
Tailwind mudasse de versão; o arbitrary value fixa a cor pela casca, não
pela paleta de quem a consome.

Para a purga do Tailwind enxergar essas constantes — que vivem num arquivo
`.ts`, não num `.tsx` com JSX — cada `globals.css` das zonas declara
`@source` apontando para o `src` do pacote; sem isso, classes usadas só
dentro de `packages/ui`/`packages/ui-patterns` são removidas do CSS final e
o sintoma (layout quebrado) só aparece em produção, nunca em dev.

### 5. `page-rail`, não `page-shell`: a calha do header tem largura própria

O trilho de conteúdo do header/footer usa a mesma largura máxima (80rem) das
utilities `page-*` de cada zona, mas com padding fixo em `1rem`, sem o
degrau para `1.5rem` a partir de `sm` que `page-shell` das zonas tem.
Herdar `page-shell` amarraria o pacote a um CSS que ele não controla e que
pode divergir entre as duas zonas; `page-rail` como token próprio do pacote
mantém a calha da casca estável independente do que cada zona decidir para
o resto da página.

## Consequências

**Positivas**

- Nenhuma cor da casca é escrita solta num componente — toda cor passa por
  uma constante nomeada por papel, então mudar o tom de "texto secundário"
  é uma edição num lugar, não uma busca-e-substitui por todo o pacote.
- `Icon`, `Brand` e `NavList` têm cada um uma única responsabilidade de
  acessibilidade garantida pelo primitivo — tamanho, layout e conteúdo ficam
  livres para o consumidor decidir.
- O menu mobile continua com zero JavaScript de troca de ícone: hambúrguer
  vira "X" só com CSS reagindo ao `<details>`.

**Negativas / limitações aceitas**

- As constantes de token exigem que cada zona declare `@source` para o `src`
  do pacote — uma dependência de configuração silenciosa: esquecer a
  declaração não gera erro de build, só produz uma classe ausente do CSS
  final, visível apenas em produção (mesma classe de risco do
  `outputFileTracingIncludes` do catálogo,
  ver [[0005-camada-de-dados-do-catalogo-leitura-via-fs]] em
  `apps/storefront/adr`).
- Os valores arbitrários (`bg-[#...]`) não aparecem no autocomplete de
  classes Tailwind do editor do mesmo jeito que um alias da paleta
  apareceria — o preço de não depender da paleta é perder um pouco de DX.
- Nada impede hoje que um novo componente escreva uma cor solta em vez de
  importar o token — a convenção depende de revisão, não de um lint que a
  imponha.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Custom properties CSS (`--color-...`) redefinidas em um bloco `dark:` | Era o mecanismo do Shadow DOM antigo; sem `:host` não há mais "todos os descendentes daqui dentro" para declarar de uma vez, e recriar isso fora do Shadow DOM exigiria uma folha de estilo global — o tipo de acoplamento que a migração para Tailwind queria evitar. |
| Aliases da paleta padrão do Tailwind (`zinc-400`, `zinc-900`) | A paleta zinc coincide com os valores antigos hoje, mas depender da coincidência amarraria a cor da casca à escala de cinza do Tailwind — uma atualização de versão poderia mudar a cor sem nenhuma mudança de código do pacote. |
| Repetir `dark:` em cada elemento, sem constante central | É o estado que gerou o problema original no Shadow DOM: com dezenas de elementos coloridos (mega menu, barra de categorias), a repetição diverge de si mesma assim que um ajuste esquece um dos lugares. |
| `page-shell` das zonas, reaproveitado para o header | Amarraria a largura da calha da casca a uma utility que o pacote não controla e que as duas zonas poderiam evoluir de forma diferente uma da outra. |
