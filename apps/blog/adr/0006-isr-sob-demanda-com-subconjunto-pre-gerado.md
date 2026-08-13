# Blog-0006 — Estratégia de renderização: ISR sob demanda com subconjunto curado pré-gerado

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `app/[slug]/page.tsx`, `app/page.tsx`

## Contexto

"SSG com 10.000 posts" é a armadilha embutida no pedido. Gerar 10.000 páginas no
build é exatamente o que os ADRs 0008 e 0012 do storefront **rejeitaram** para a
PDP: minutos de compilação e um `.next` gigante para atender uma cauda que quase
ninguém lê.

A diferença a favor do blog: o conteúdo de post é **imutável** (o faker gera uma
vez e nunca mais roda), então o eixo "tolerância à defasagem" do ADR 0012 é
praticamente infinito.

## Decisão

Aplicando a matriz de três eixos do ADR 0012 ao blog:

| Rota | Cardinalidade | Defasagem | Conjunto | Estratégia |
| --- | --- | --- | --- | --- |
| `/blog` (índice) | Baixa (1) | Tolera | Fechado | SSG — 1ª janela no HTML |
| `/blog/[slug]` | Alta (10k) | Tolera (imutável) | **Fechado** | ISR sob demanda + 50 pré-gerados |
| `posts-index.json` | Baixa (1) | Tolera | Fechado | Asset estático do build |

### 1. `revalidate = false`

O conteúdo **nunca muda**, então revalidar seria desperdício puro de invocação.
`false` cacheia indefinidamente. É o caso em que o eixo "defasagem" é
literalmente infinito — a PDP do storefront usa `3600` porque preço e estoque
mudam; aqui não há o que mudar.

### 2. `generateStaticParams` devolve os ~50 posts mais recentes

Aqui há um desvio consciente do ADR 0008, e vale explicar por quê.

O ADR 0008 devolveu `[]` e registrou "pré-gerar um subconjunto curado" como o
meio-termo que **não deu para implementar lá** — faltava telemetria de
popularidade para escolher quais produtos pré-gerar. Aqui esse impedimento não
existe: o conjunto é **fechado e conhecido no build**, e "mais recentes" é um
critério editorial legítimo, não um palpite. São exatamente os posts que a
listagem mostra na primeira janela, ou seja, os que mais provavelmente recebem o
primeiro clique.

Continua valendo a semântica deliberada do ADR 0008: a lista **não-vazia** gera
esses caminhos no build, e `dynamicParams` (padrão `true`) mantém os outros 9.950
sob demanda. Remover a função não seria equivalente a nada disso.

Custo medido: 56 páginas estáticas geradas em **~1,5 s**. Os 10.000 custariam
minutos.

### 3. `notFound()` em slug inexistente

404 real, não um `<h1>` de desculpa com status 200 — ver ADR 0008.

### 4. Capa com `preload`, não `priority`

A capa é o LCP da rota. A partir do Next 16 a prop `priority` está
**depreciada** em favor de `preload`, que descreve o que de fato acontece: um
`<link rel="preload">` no `<head>`. As imagens do corpo ficam lazy, o padrão.
Mesma disciplina do ADR 0013.

Verificado no HTML: `<link rel="preload" as="image" imageSrcSet="/blog/_next/image?url=...">`.

## Consequências

**Positivas**

- Build rápido e `.next` enxuto: 56 páginas em vez de 10.000.
- Os 50 posts mais prováveis já saem quentes do deploy — o "meio-termo" que o
  ADR 0008 registrou como não implementado, aqui implementado.
- Nenhuma revalidação desnecessária: conteúdo imutável, cache permanente.
- Escala trivial: acrescentar posts não muda o tempo de build de forma relevante.

**Negativas / limitações aceitas**

- A primeira visita a qualquer um dos 9.950 posts restantes paga o custo total de
  renderização.
- O endpoint `/blog/_next/image` é a **única** parte não-estática da zona: a
  primeira requisição de cada variante de imagem é uma invocação (cacheada
  depois). A afirmação "nenhuma invocação serverless" vale para as rotas, não
  para o otimizador de imagens. Optamos por manter o `next/image` na capa porque
  negociação de formato vale mais para o LCP do que a pureza da afirmação.
- Os 50 pré-gerados são fixos por build. Se um post antigo viralizar, ele
  continua sob demanda — não há promoção automática, pela mesma falta de
  telemetria que o ADR 0008 apontou.
- Como `revalidate = false`, corrigir um post exige redeploy. Aceitável enquanto
  o conteúdo for gerado por seed.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Gerar os 10.000 no build | Minutos de compilação e `.next` gigante para uma cauda que quase ninguém lê — a decisão que o ADR 0008 já rejeitou. |
| `generateStaticParams` devolvendo `[]` | Era o certo no storefront por falta de telemetria; aqui o conjunto é fechado e a curadoria por data é legítima, então deixar os 50 mais prováveis frios seria desperdiçar uma informação que temos. |
| Remover `generateStaticParams` | Não é equivalente a `[]` nem à lista curada — muda o comportamento de renderização dos caminhos não listados. |
| `revalidate` com número | Revalidaria conteúdo que é imutável por construção. |
| `unoptimized` na capa, para zerar invocações | Perderia AVIF/WebP e redimensionamento justamente na imagem que é o LCP da rota. |
