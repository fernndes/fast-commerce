# ADR 0003 - Header/footer compartilhados via Web Component SSR

## Status

SUPERSEDIDO pela ADR 0004 (`0004-casca-como-componentes-react-em-workspace.md`).

A casca nao usa mais Stencil, Web Components, Shadow DOM nem o bundle publicado
em CDN. `packages/app-shell` e `apps/app-components` foram removidos. O texto
abaixo fica como registro do desenho anterior e das razoes que levaram a ele —
varias continuam validas (o `ShellBoundary`, os dados por prop, nao renderizar
conteudo gerado por usuario na casca) e estao reafirmadas na 0004.

Historico anterior: aceito e revisado apos a primeira implementacao — as
decisoes sobre o mecanismo de SSR e sobre o numero de pacotes mudaram, porque as
duas escolhas originais nao funcionavam. Ver "Alternativas descartadas".

## Contexto

Storefront e blog tinham implementacoes proprias de header/footer. Isso mantinha
as zonas independentes, mas duplicava a casca visual e fazia qualquer alteracao
de plataforma depender de edicoes nas duas apps.

## Decisao

Um unico pacote Stencil, `@repo/app-shell`, com os dois componentes
(`app-header` e `app-footer`), Shadow DOM e Declarative Shadow DOM.

O SSR vem do `@stencil/react-output-target`, nao de um plugin de bundler. O
`stencil.config.ts` declara `hydrateModule` + `clientModule` +
`serializeShadowRoot: 'declarative-shadow-dom'`; o gerador emite
`react/components.server.ts`, e a export condition `react-server` do
`package.json` roteia o Server Component para esse arquivo, que carrega o
hydrate app e serializa o DSD por conta propria.

As zonas consomem:

- o hydrate module e os wrappers React por dependencia local, em build time;
- o bundle client por `<script type="module" crossorigin="anonymous">` a partir
  de `https://fast-commerce-app-components.vercel.app`, em runtime.

`apps/app-components` e um projeto Vercel estatico unico que publica o
DIRETORIO inteiro do loader lazy:

- `/shell/latest/app-shell.esm.js` (+ os chunks `p-*.js` ao lado)
- `/shell/v/{version}/...`

## Consequencias

O CSS do header/footer passa a morar dentro dos componentes, nao no Tailwind das
zonas. As zonas deixam de estilizar a casca compartilhada.

Header e footer compartilham ciclo de release: um pacote, uma versao, uma
publicacao. Isso e uma perda deliberada frente ao desenho original — ver
"Alternativas descartadas". O desacoplamento que motivou o projeto continua de
pe, porque ele nunca dependeu de haver dois pacotes: vem do bundle client
servido em runtime, que a plataforma republica sem redeploy das zonas.

O desacoplamento e parcial: comportamento e hidratacao mudam sem redeploy das
zonas; o HTML inicial do SSR so muda quando a zona atualiza a dependencia do
pacote. Desacoplamento total exigiria carregar tambem o hydrate module
remotamente em runtime, com cache local e politica explicita de invalidacao.

A CSP das duas zonas deve autorizar a origem `https://fast-commerce-app-components.vercel.app`
em `script-src`, identica nas duas.

`apps/app-components/vercel.json` precisa responder
`Access-Control-Allow-Origin` nos `.js`: `<script type="module">` e SEMPRE
buscado em modo CORS, entao sem esse header o bundle nao carrega em producao —
e a falha e silenciosa, porque o DSD do SSR continua visivel e so a
interatividade some.

Cada zona envolve `<AppHeader>`/`<AppFooter>` num `ShellBoundary`
(`components/shell/`) que cai para uma casca minima local se o SSR falhar. Erro
em layout raiz nao e capturado por `error.tsx` do proprio segmento: sem o
boundary, uma falha da casca compartilhada seria tela branca no site inteiro.
Falha apenas de HIDRATACAO nao usa o fallback — o DSD ja esta pintado e a
pagina segue navegavel.

Nao renderizar conteudo gerado por usuario dentro desses Web Components SSR.

## Alternativas descartadas

**`@stencil/ssr` (plugin de Next).** Era a escolha original. Registra uma regra
webpack com `enforce: 'post'`, entao seu loader roda DEPOIS do
`next-swc-loader` e tenta re-parsear a saida ja transformada com
`recast`/`ast-types`. Em `app/layout.tsx`, que usa `next/font`, essa saida
contem imports virtuais (`next/font/google/target.css?{...}`) que o parser
rejeita — o build quebra com `Module parse failed: Unexpected token`. Alem
disso, o `@stencil/react-output-target` ja resolvia o mesmo problema: manter os
dois era ter dois mecanismos de SSR sobre o mesmo componente.

**Dois pacotes independentes (`@repo/header` + `@repo/footer`).** Era o desenho
original, motivado por cadencia de mudanca diferente entre os dois. Nao funciona:
`dist-hydrate-script` gera um hydrate app completo, com registro proprio de
componentes, e dois deles no MESMO processo Node disputam estado. No servidor do
Next o sintoma era especifico e enganoso — o primeiro request renderizava os
dois corretamente e, a partir do segundo, o `renderToString` do header devolvia
a tag crua (sem `class="hydrated"`, sem `<template shadowrootmode>`), derrubando
a pagina em 500 dentro do `ssr.js` do react-output-target. Com apenas um dos
dois componentes no layout, o mesmo codigo roda indefinidamente. Nao reproduz em
Node puro (ESM ou CJS, sequencial ou concorrente, em qualquer ordem de import),
so dentro do processo do Next, e independe do bundler (webpack e Turbopack) e de
o hydrate module estar bundleado ou externo.

**Publicar so o arquivo de entrada do bundle client.** Era o que o script de
copia fazia. O `app-shell.esm.js` e um loader lazy que importa `./p-<hash>.js`
por caminho relativo; publicar so a entrada gera um script que carrega e falha
ao buscar chunks inexistentes, sem hidratacao nenhuma e sem erro visivel na
pagina. O script agora copia o diretorio inteiro.
