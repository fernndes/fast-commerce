# ADR 0004 - Casca como componentes React em workspace (`ui` + `ui-patterns`)

## Status

Aceito. Supersede a ADR 0003, que fica como registro do desenho anterior.

Isto REVERTE uma decisao que estava aceita e implementada. O registro abaixo
existe para que a reversao seja legivel — inclusive para quem, daqui a um ano,
achar que Web Component era obviamente a escolha certa.

## Contexto

A ADR 0003 entregou header e footer como Web Components Stencil com Shadow DOM,
SSR via Declarative Shadow DOM e bundle client publicado em CDN por
`apps/app-components`. O objetivo era publicar a casca sem redeploy das zonas.

O que a implementacao revelou depois de rodando:

**O ganho de RSC nao existia.** O `components.server.ts` gerado pelo
`@stencil/react-output-target` — a variante roteada pela export condition
`react-server`, e portanto a que deveria ser o caminho "de servidor" — tambem
declara `'use client'`. Ou seja: a variante "server" ABRE fronteira de cliente
igual. Na pratica, `<AppHeader>` era Client Component nas duas zonas, e as props
dele atravessavam SERIALIZADAS no payload RSC de toda pagina. O DSD entregava
HTML pintado cedo, o que e real e valioso; mas o runtime Stencil e as props
continuavam indo ao cliente.

O custo visivel disso no storefront: o layout mantinha uma funcao
`semContagem()` cujo unico proposito era remover o campo `count` de ~34
categorias antes de passa-las ao header, para encolher um payload que so existia
por causa da fronteira de cliente.

**O desacoplamento ja era parcial, e a propria 0003 dizia isso.** Comportamento
e hidratacao mudavam sem redeploy das zonas; o HTML inicial do SSR so mudava
quando a zona atualizava a dependencia do pacote. A parte do desacoplamento que
sobrevivia sozinha era a menor.

**A infraestrutura era desproporcional ao conteudo.** Dois componentes,
essencialmente estaticos, sustentados por: um projeto Stencil com tres output
targets, um hydrate app, um projeto Vercel so para servir o bundle, um script de
copia de diretorio, um `lib/app-components.ts` por zona, hooks `prebuild`/`predev`
nas duas zonas e uma excecao de origem no `script-src` da CSP das duas.

**E quase nada disso precisava de JS.** Auditando os dois componentes: o mega
menu e `:hover`/`:focus-within` em CSS; o menu mobile e `<details>` nativo; a
busca e `<form method="get">`; o footer e HTML estatico. O unico handler do
pacote inteiro era o `closeMobileMenu`.

## Decisao

Substituir os Web Components por componentes React consumidos como CODIGO-FONTE
pelos workspaces, no modelo do monorepo do Supabase:

- **`packages/ui`** — primitivas sem conhecimento de dominio: `Brand`, os icones,
  `NavList`, `SearchForm`, e os tokens de cor como constantes de classe.
- **`packages/ui-patterns`** — composicoes que conhecem o dominio: `AppHeader`,
  `AppFooter`, e os tipos `ShellCategory`/`ShellDepartment`.
- **`packages/nav`** — a navegacao por categorias como DADO, compartilhada pelas
  duas zonas. Ver a correcao "um header so" no fim deste ADR.

`ui-patterns` depende de `ui`; nunca o contrario. `nav` nao depende de nenhum dos
dois — e dado, nao UI. Nenhum dos tres depende de uma zona.

Os pacotes NAO tem step de build: exportam TSX cru (`"exports": { ".":
"./src/index.ts" }`, sem `main`/`module`/`types`/`dist`), e o Next de cada zona
os transpila via `transpilePackages`. E essa a diferenca central em relacao ao
`app-shell`: compilados no mesmo grafo do app, sob a mesma fronteira
server/client, `AppHeader` e `AppFooter` sao Server Components de verdade.

**`closeMobileMenu` foi ISOLADO, nao dropado.** Ele vive em
`mobile-menu-auto-close.tsx`, o unico `'use client'` da casca inteira, e recebe
as colunas de categoria como `children`. Isso importa: `children` de um Client
Component e renderizado no servidor e chega como arvore pronta; passar
`departments` como PROP traria a arvore inteira de volta ao payload RSC,
silenciosamente. A alternativa era dropar o handler (casca 100% server, zero JS),
ao custo de o painel ficar aberto sobre a pagina durante a navegacao — visivel em
conexao lenta. Alguns KB numa zona so e barato demais para valer a regressao.

Os 573 linhas de CSS em Shadow DOM viraram Tailwind. Cada `globals.css` declara
`@source` para o `src` dos dois pacotes — sem isso as classes usadas apenas
dentro dos pacotes sao removidas na purga, e o sintoma e layout quebrado SO em
producao.

## Consequencias

**Perde-se a publicacao da casca sem redeploy das zonas.** Toda mudanca de
header/footer passa a exigir rebuild e deploy de `storefront` e `blog`. Isto e
aceito conscientemente, e e a razao de esta ADR existir. Com o Turborepo e o
skip automatico da Vercel, o fan-out e automatico: mexeu em `ui-patterns`, as
duas zonas rebuildam; mexeu so no catalogo, uma so.

**Consequencia nova, e a mais importante de lembrar:** a casca so pode ser
consumida por zonas React/Next. Se algum dia entrar uma zona em outro framework,
Web Component era o caminho certo e esta decisao precisa ser revisitada — nao
como erro, mas porque a premissa mudou.

**Acaba o isolamento de estilo.** A ADR 0003 garantia que "as zonas deixam de
estilizar a casca compartilhada"; isso vinha do Shadow DOM. A casca agora
compartilha a cascata com o CSS das zonas, e nada impede o storefront de
sobrescrever o header por acidente. Tratamos sobrescrita como bug de revisao. Se
isso passar a acontecer de fato, o proximo passo e prefixar as classes do pacote.

**`CURRENT_YEAR` muda de forma.** O raciocinio original era determinismo de SSR
(HTML servido vs. re-render na hidratacao). Sem hidratacao do footer, o risco
vira outro e maior: numa pagina estaticamente gerada o ano congela no BUILD, nao
no carregamento do modulo. Um site buildado em dezembro mostra o ano velho em
janeiro. Fica como default por conveniencia; a zona que se importa passa `year`
explicitamente ou mantem o footer fora do caminho estatico. Registrado em
comentario no proprio arquivo.

**`semContagem()` foi removida do layout do storefront.** Os dados sao
consumidos no servidor e nunca serializados — verificado: o payload RSC do build
de producao nao contem nenhum campo `count`. A arvore vai inteira.

O `id="app-header-search"` do input passa a viver na cascata global. So e
problema se dois headers coexistirem numa pagina; e prop com default nomeado para
que o conserto seja obvio se isso acontecer.

**Removidos:** `packages/app-shell/`, `apps/app-components/`,
`scripts/copy-client-bundle.mjs`, `lib/app-components.ts` das duas zonas, os
scripts `build:shell`/`copy:app-components`/`dev:app-components` da raiz, os
hooks `prebuild`/`predev` das duas zonas, `@stencil/core` e
`@stencil/react-output-target` de todos os `package.json`, e a autorizacao de
`https://fast-commerce-app-components.vercel.app` no `script-src` da CSP das duas
zonas. O projeto `app-components` na Vercel precisa ser deletado a mao.

## O que SOBREVIVE da ADR 0003

Reafirmado, nao herdado por inercia:

- **Nao renderizar conteudo gerado por usuario na casca.**
- **Os dados de navegacao vem por prop da zona**, e o pacote nunca os busca.

## O agrupamento "shell" era concessao tecnica, nao arquitetura

Registrado explicitamente porque o vocabulario sobreviveu mais tempo que a razao
de existir dele.

Header e footer num pacote unico, uma versao, um ciclo de release: a ADR 0003 ja
documentava isso como "perda deliberada" frente ao desenho original. A causa era
tecnica e especifica — `dist-hydrate-script` gera um hydrate app com registro
proprio de componentes, e dois deles no mesmo processo Node disputavam estado,
com sintoma enganoso (o segundo request em diante derrubava a pagina em 500).

Com React nao ha hydrate app, nem registro global, nem conflito. A motivacao
original — cadencia de mudanca diferente entre header e footer — volta a ser
atendivel, e e atendida por **export dedicado por componente**, sem precisar de
dois pacotes:

```jsonc
// packages/ui-patterns/package.json
{ "exports": {
    "./app-header": "./src/app-header/index.tsx",
    "./app-footer": "./src/app-footer/index.tsx",
    "./types":      "./src/types.ts"
} }
```

Nao ha `"."`: o barrel foi REMOVIDO, e `import { AppHeader } from
'@repo/ui-patterns'` falha na compilacao. Deixar o barrel no lugar seria o
caminho para as duas formas de import coexistirem e ninguem migrar.

Os tipos passaram de `ShellCategory`/`ShellDepartment`/`ShellZone` para
`NavCategory`/`NavDepartment`/`NavZone` — eles descrevem navegacao, que e o que
sao, independente de quem os consome.

**O que o export dedicado NAO entregou.** A expectativa era que o blog, que
rodava o header em modo simples, deixasse de carregar o codigo do mega menu.
Medido no build de producao: **nao deixou**. O `MegaMenu` e definido DENTRO de
`app-header/index.tsx`, que importa `CategoryColumns` e `MobileMenuAutoClose` no
topo do modulo; o blog puxa os tres, e o chunk cliente do
`MobileMenuAutoClose` e referenciado no HTML servido do blog. Granularidade de
export separa `app-header` de `app-footer`, nao `AppHeader` do proprio mega menu
— `hasMenu` era decisao de RUNTIME, invisivel para o bundler. O ganho que o
export dedicado de fato entrega e o de FRONTEIRA EXPLICITA: nenhuma zona depende
por acidente do que nao importou de proposito.

Essa medicao deixou de ser um custo a lamentar: como o blog agora renderiza o
mega menu de verdade (proxima secao), ele ja pagava por codigo que agora usa.

## CORRECAO — o `ShellBoundary` NAO sobrevive

O `ShellBoundary` e os `shell-fallback` foram REMOVIDOS das duas zonas, junto com
o diretorio `components/shell/`.

A primeira versao desta ADR afirmava que o boundary continuava valendo porque "o
raciocinio nunca dependeu do Stencil". **Isso esta errado**, e a verificacao
empirica derrubou a afirmacao. Fica registrado em vez de apagado, porque o erro e
instrutivo: era exatamente o tipo de conclusao que parece obvia e nao foi
testada.

Error boundary e um mecanismo de CLIENTE: ele captura erros lancados durante o
render do React no cliente. Sob o Stencil isso funcionava porque `<AppHeader>`
ERA Client Component (o `'use client'` do `components.server.ts`) — o componente
renderizava dentro da arvore cliente, e o boundary estava no lugar certo.

Como Server Component, `<AppHeader>` e renderizado no passe RSC, que termina
ANTES de o boundary cliente existir. Um throw ali falha o render do flight, e nao
ha boundary em escopo. Ou seja: a MESMA mudanca que tornou o header um Server
Component de verdade e a que quebrou o boundary.

Medido num build de producao, com um `throw` injetado no `<AppHeader>`:

| Rota | Resultado com o `ShellBoundary` no lugar |
| --- | --- |
| Estatica (prerender) | `next build` FALHA — `Export encountered an error`, build worker sai com codigo 1 |
| Dinamica (`/produtos`) | HTTP 500, `<html id="__next_error__">`, `<body>` VAZIO |

O `<body>` vazio e precisamente a tela branca que o boundary existia para
evitar. O fallback nunca renderizou.

Pior: os fallbacks sao props de um Client Component, entao sao SERIALIZADOS no
payload RSC de toda pagina — verificado, `FallbackHeader` e `FallbackFooter`
aparecem no `index.rsc` de uma pagina saudavel. O boundary hoje tem custo
liquido negativo: paga bytes em toda pagina e nao protege nada.

O que de fato protege agora e o `app/global-error.tsx` (o storefront tem; o blog
NAO tem). Proteger a casca de verdade exigiria fail-soft no SERVIDOR — um
`try/catch` em volta dos dados no layout — e isso colide de frente com a decisao
de fail loud do ADR 0010 do storefront: sem categorias nao existe storefront
navegavel, e mascarar isso esconde um catalogo quebrado atras de um header pela
metade.

## Alternativas descartadas

**Manter o Stencil e aceitar o `'use client'`.** E o status quo da 0003. Rejeitado
porque o custo de infraestrutura era pago em troca de um beneficio de RSC que nao
existia, e o beneficio que restava (desacoplamento parcial de publicacao) nao
sustenta seis pecas de infraestrutura para dois componentes estaticos.

**Um pacote so em vez de dois.** Com dois componentes, dois pacotes e mais
estrutura do que o conteudo pede hoje — a ressalva e honesta. O que justifica e a
direcao: `ui` fica leve e sem dependencias, e e onde entram as primitivas
conforme o design system cresce. Se em tres meses `ui` ainda tiver quatro
arquivos, fundir e a decisao certa.

**Dropar o `closeMobileMenu` e ter zero JS.** Ver acima — foi uma escolha real,
nao um esquecimento.

## CORRECAO — um header so, e `packages/nav` como fonte da navegacao

O `AppHeader` tinha DOIS modos, decididos pelos dados que a zona passava: com
`departments`, a casca completa do storefront; sem, uma barra unica com um nav de
tres links, que era o que o blog renderizava. **O modo simples foi removido.**

O motivo nao e de codigo, e de produto: as duas zonas vivem no MESMO dominio e
sob a mesma marca, e a travessia `/produtos` → `/blog` e hard navigation. Duas
cascas diferentes faziam essa travessia parecer troca de site. Manter o modo
simples tambem nao economizava bundle — a medicao acima mostra que o blog ja
baixava o codigo do mega menu de qualquer forma.

Isso criou o problema real: `departments`/`featuredCategories` passaram a ser
props OBRIGATORIAS, e **o blog nao tem catalogo**. A arvore vinha de
`apps/storefront/lib/categories.ts`, derivada de `data/big.json` — 13 MB lidos
por `fs` — e nada disso pode virar dependencia da zona blog para desenhar ~30
links.

A saida foi `packages/nav`: uma PROJECAO da navegacao, materializada em build
time por `scripts/generate-categories.mjs` a partir do dump do catalogo, e
consumida pelas duas zonas via import estatico de `data/categories.json`. No
mundo real esses dados viriam de uma base comum aos dois apps; o pacote e o
equivalente honesto disso aqui.

Tres consequencias que valem registro:

- **Import estatico, nao `fs`.** O grafo do bundler enxerga o JSON, entao nao ha
  `outputFileTracingIncludes` a manter em cada zona (a pegadinha do ADR 0005 e do
  Blog-0003) e nao ha I/O em runtime. So se paga porque a projecao e pequena —
  alguns KB, contra os 13 MB do catalogo, que continua so no storefront.
- **A curadoria editorial mudou de lugar, nao de regra.** `LABELS`, `DEPT_ORDER`
  e `FEATURED` foram para o gerador. As invariantes do ADR 0010 do storefront
  seguem valendo e seguem fail loud — slug que e departamento E subcategoria, ou
  destaque que nao existe na arvore, quebram a GERACAO em vez de quebrarem o
  build de cada zona.
- **As funcoes ficaram sincronas.** `getCategoryTree`/`getFeaturedCategories`/
  `findCategory` nao retornam mais Promise. Os `await` nos call sites do
  storefront foram MANTIDOS de proposito: nao custam nada e deixam a porta aberta
  para a origem voltar a ser assincrona (um endpoint, um cache remoto) sem tocar
  em nenhuma pagina.

`apps/storefront/lib/categories.ts` sobreviveu como fachada: reexporta o pacote e
mantem `getProductsByCategory`, que e consulta de PRODUTO e precisa mesmo do
catalogo.

**O preco.** A projecao e um snapshot: mexer em `big.json` sem rodar
`npm run generate:categories` deixa o menu defasado. E o mesmo contrato do
`data/posts.json` do blog, e por isso o gerador esta no `build` do pacote — com
`dependsOn: ["^build"]` no turbo, ele roda antes das duas zonas.
