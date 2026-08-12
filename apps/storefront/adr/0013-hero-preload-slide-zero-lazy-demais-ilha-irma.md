# ADR 0013 — Hero: `preload` no slide 0, `lazy` nos demais, Server Component com ilha irmã

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

`components/hero/hero.tsx` é normalmente o elemento de LCP (Largest
Contentful Paint) da home — a maior imagem visível no primeiro viewport. Um
carrossel implementado ingenuamente comete dois erros opostos: pré-carregar
todos os banners ao mesmo tempo (comprimindo a banda disponível para o LCP
real) ou marcar o slide 0 como `loading="lazy"` (fazendo o browser adiar
deliberadamente o download da imagem mais importante da página). Ambos
apareceram como avisos no Lighthouse durante o desenvolvimento, sendo o
`loading="lazy"` no slide 0 da página `/produtos` o primeiro erro encontrado
na prática.

No Next 16, a prop `priority` do `next/image` foi depreciada em favor de
`preload`. A documentação é explícita: `preload` e `loading="lazy"` no mesmo
`<Image>` lança erro em runtime.

## Decisão

### 1. Slide 0 com `preload`, demais com `loading="lazy"` — sem exceção

`components/hero/hero-slide.tsx` aplica a regra de forma binária baseada no
`index`:

```tsx
{...(isFirst ? { preload: true } : { loading: 'lazy' as const })}
```

`preload: true` instrui o Next a emitir um `<link rel="preload">` no `<head>`
e a aplicar `fetchpriority="high"` implicitamente na tag `<img>` resultante.
O efeito prático: o browser descobre e começa a baixar o banner principal
antes de qualquer outro recurso não crítico, sem esperar que o parser chegue
na tag `<img>`. Para os slides restantes, `loading="lazy"` é necessário —
sem ele, o browser baixaria todos os banners da home simultaneamente, dividindo
a banda com o slide que precisa aparecer primeiro.

Confirmar que `preload` aplica `fetchpriority="high"` requer inspecionar o
HTML gerado em produção (`/_next/static/...`): o atributo deve estar presente
no `<link rel="preload">` que o Next emite. Isso foi verificado nos commits
da Fase 1 do projeto.

### 2. Server Component puro — zero JS no caminho crítico

`components/hero/hero.tsx` e `components/hero/hero-slide.tsx` são Server
Components. O HTML dos banners — imagens, copy, botões de CTA — chega pronto
no documento servido, sem esperar nenhum chunk de JavaScript client-side.

A rotação automática é uma **ilha irmã**: `<CarouselAutoplay>` (arquivo
`components/hero/carousel-autoplay.tsx`) é um Client Component mínimo que
recebe o `id` do carrossel como prop e encontra o elemento com
`document.getElementById` para manipular o scroll. Essa separação — servidor
entrega o HTML completo; cliente só acrescenta o comportamento de autoplay —
é o mesmo padrão do `<CloseOnNavigate>` do header: a ilha não envolve os
slides nem os re-renderiza; ela existe ao lado deles no DOM, não acima.

A consequência mais importante dessa separação: a primeira imagem do carrossel
**está no HTML servido** e **não espera hidratação** para aparecer. Um padrão
alternativo onde `CarouselAutoplay` envolvesse os slides como `children` de
um Client Component moveria o conteúdo dos slides para o payload RSC em vez
do HTML inicial — os slides existiriam no documento, mas como serialização
JSON, não como HTML diretamente pintável, impactando o LCP.

### 3. Proporção `aspect-ratio` fixa no container — zero CLS

Cada slide usa `fill` no `next/image`, com a proporção definida pelo
container via classe Tailwind:

```
aspect-[4/3] sm:aspect-[2/1] lg:aspect-[12/5]
```

O espaço é reservado antes do primeiro byte de imagem chegar. Não há
deslocamento de layout (CLS = 0 para a área do hero) porque o container já
ocupa sua altura final antes de a imagem carregar — diferente de uma imagem
com `height: auto` que empurra o conteúdo abaixo ao carregar.

## Consequências

**Positivas**

- A imagem do LCP (slide 0) começa a baixar antes de qualquer outro recurso
  disputar a banda, com `fetchpriority="high"` sinalizando ao browser a
  prioridade.
- Os slides restantes não competem com o slide 0 pela conexão — chegam
  quando o usuário os pede (rolagem ou autoplay após o carregamento).
- Zero JavaScript de hidratação no caminho crítico de pintura do hero — o
  HTML do slide 0 é pintado assim que chega do servidor.
- Zero CLS na área do hero — o espaço é reservado antes da imagem.

**Negativas / limitações aceitas**

- As imagens dos slides são `dummyimage.com` (placeholder), um domínio de
  terceiro que passa pelo otimizador do Next (`/_next/image?url=...`). Isso
  adiciona latência de rede e runtime ao LCP: o Next busca a imagem da
  origem externa, processa e serve. Migrar para assets próprios (no CDN ou
  em `/public`) é o próximo passo de otimização do hero identificado, mas
  ainda não implementado.
- `preload` só garante que o browser descubra e priorize cedo — não elimina o
  custo de rede de buscar uma imagem grande de um domínio externo.
- O `CarouselAutoplay` usa `document.getElementById` para encontrar o
  scroller — acoplamento por `id` em vez de por prop/ref. É frágil se o `id`
  do carrossel mudar, mas foi preferido a passar uma ref através de uma
  fronteira Server/Client, o que exigiria promover o componente pai a client.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| `priority` (API antiga do `next/image`) | Depreciado no Next 16; `preload` é o substituto direto. Usar `priority` continuaria funcionando por compatibilidade, mas geraria aviso de depreciação. |
| `fetchPriority="high"` manual além de `preload: true` | `preload: true` já aplica `fetchpriority="high"` implicitamente no Next 16, confirmado no HTML gerado. Adicionar manualmente seria redundante. |
| `CarouselAutoplay` envolvendo os slides como `children` | Moveria o conteúdo dos slides do HTML para o payload RSC — os slides existiriam no documento como JSON, não como HTML pintável, prejudicando o LCP. |
| Todos os slides com `preload` | Dividira a banda entre todos os banners ao mesmo tempo, atrasando o slide 0 — o erro oposto de `loading="lazy"` no slide 0. |
| `loading="lazy"` em todos os slides | Marcaria o slide 0 como baixa prioridade — o browser adiaria deliberadamente o download do LCP. Foi o bug encontrado na prática em `/produtos` e corrigido. |
