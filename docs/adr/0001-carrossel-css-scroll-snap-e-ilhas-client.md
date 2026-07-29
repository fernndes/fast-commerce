# ADR 0001 — Carrossel com CSS scroll-snap e ilhas client

- **Status:** aceito
- **Data:** 2026-07-29
- **Contexto:** `apps/storefront`

## Contexto

A home tem dois consumidores de carrossel com necessidades opostas:

1. **Hero** — 4 banners rotativos, primeira dobra, quase sempre o elemento de **LCP**.
2. **Prateleiras** — réguas horizontais de cards de produto, abaixo da dobra.

Uma lib de carrossel resolveria os dois, mas cobraria caro exatamente onde
dói: JS no caminho crítico, hidratação antes do conteúdo aparecer, e o padrão
de "carregar todos os slides de uma vez" que afunda o LCP.

## Decisão

### 1. O carrossel é CSS puro, não uma lib

`overflow-x: auto` + `scroll-snap-type: x mandatory` (`components/carousel/carousel.tsx`).
O scroll é o nativo do browser: touch, trackpad, teclado, barra de rolagem,
momentum — tudo de graça, tudo funcionando antes de qualquer JS carregar.
**Zero bytes de JS para a funcionalidade principal.**

### 2. Os controles são ilhas client irmãs, não wrappers

`CarouselAutoplay` (dots + rotação) e `CarouselArrows` (setas) **não envolvem**
os slides. Elas são irmãs no DOM e acham o scroller por `document.getElementById`.

Isso é o ponto central do ADR. Se a ilha envolvesse os slides como `children`,
o conteúdo passaria pela fronteira client e viraria payload de hidratação. Do
jeito atual, os slides ficam 100% na árvore server: **a primeira imagem do hero
está no HTML servido e não espera JavaScript nenhum para pintar.**

Consequência: os controles só existem depois da hidratação (`useHydrated`), o
que evita botões mortos no HTML. Verificado no build: `0 <button>` no HTML
prerenderizado da home.

### 3. Só o slide 0 do hero é pré-carregado

```tsx
{...(isFirst ? { preload: true } : { loading: 'lazy' as const })}
```

Exatamente **um** `<link rel="preload" as="image">` no `<head>`, casando com o
`preconnect` da CDN já configurado no `app/layout.tsx`. Os outros 3 banners e
todos os cards de produto ficam lazy — o usuário ainda não os viu.

> **Next 16:** `priority` foi depreciado em favor de `preload`, e `preload` +
> `loading="lazy"` no mesmo `<Image>` agora **lança erro**. Por isso o spread
> condicional em vez de duas props independentes.

Verificado no build: 20 `<img>`, 1 preload link, 19 `loading="lazy"`.

### 4. CLS zero por dimensões explícitas

Banners carregam `width`/`height` intrínsecos no `data/banners.json` e usam
`className="h-auto w-full"`. O browser reserva a altura pela proporção antes do
primeiro byte da imagem chegar.

## Consequências

**Positivas**

- Caminho crítico do hero sem JS: imagem + texto direto do HTML.
- Um único primitivo (`Carousel` / `CarouselItem`) serve hero e prateleiras — só
  muda a largura do slide (`w-full` vs. `w-[60%] sm:w-[38%] lg:w-[23%]`).
- Prateleiras funcionam com JS desabilitado ou ainda não hidratado.
- Acessibilidade: scroller focável e rotulado; pause explícito (WCAG 2.2.2);
  `prefers-reduced-motion` desliga a rotação automática.

**Negativas / limitações aceitas**

- Sem loop infinito. `scroll-snap` não faz wrap-around sem clonar slides, o que
  reintroduziria JS e imagens duplicadas. A rotação do hero volta ao slide 0 via
  `scrollTo`, com um "rebobinar" visível. Aceito.
- Todos os banners do hero precisam ter a **mesma proporção**, senão a altura do
  carrossel muda entre slides e volta o CLS. Restrição documentada no tipo `Banner`.
- Sem art direction (banner distinto para mobile). `sizes="100vw"` já evita o
  desperdício de bytes; o que falta é enquadramento, não peso. Se virar
  requisito, o caminho é `<picture>` com `getImageProps`, não uma lib.
- As larguras de slide da prateleira vivem em dois lugares: no `className` do
  `CarouselItem` e no `sizes` do `ProductCard`. Precisam mudar juntos.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Lib de carrossel (Embla, Swiper, Keen) | JS no caminho crítico do LCP; o hero precisaria hidratar para mostrar a primeira imagem. |
| Ilha client envolvendo os slides | Empurra o conteúdo dos slides para o payload de hidratação — exatamente o que queremos evitar no hero. |
| Dots via âncoras `#slide-n` (CSS puro) | Sem JS não dá para marcar o dot ativo, e a navegação por âncora mexe no scroll da página, não só do container. |
| Passar `ref` do scroller para a ilha | `ref` não atravessa a fronteira server → client. O id é o contrato. |
