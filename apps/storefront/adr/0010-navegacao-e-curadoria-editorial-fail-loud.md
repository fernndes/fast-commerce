# ADR 0010 — Navegação e curadoria editorial: dado vs. decisão de negócio, fail-loud em configuração

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

Três módulos — `lib/categories.ts`, `lib/home.ts` e `lib/banners.ts` —
separam o que É DADO (o catálogo indexado, ver
[[0005-camada-de-dados-do-catalogo-leitura-via-fs]]) do que é DECISÃO DE
NEGÓCIO (rótulo de categoria, ordem de menu, quais prateleiras existem na
home, qual banner aparece onde). Os três compartilham a mesma filosofia:
falhar ruidosamente numa configuração inconsistente, no build ou no primeiro
uso, em vez de degradar silenciosamente em produção.

## Decisão

### 1. Navegação: hierarquia vem dos dados, rótulo e ordem são editoriais

`lib/categories.ts` monta a árvore de departamentos/subcategorias a partir de
`catalog.byDept`/`bySub` (já indexados), mas rótulo (`LABELS`), ordem
(`DEPT_ORDER`) e destaques (`FEATURED`) são listas editoriais que não se
derivam de nenhum dado — são decisão de negócio. `LABELS` é a "válvula" da
navegação: uma categoria nova no catálogo sem rótulo aqui simplesmente não
aparece no menu, em vez de vazar um slug cru para o usuário.

A árvore é montada uma vez por processo (promise memoizada) porque header e
footer aparecem em toda página. Uma checagem em `buildTree` lança se algum
slug for departamento E subcategoria ao mesmo tempo — os dois dividem a
mesma rota `/categorias/[slug]`, e embora não haja colisão nos dados atuais,
a checagem existe para o dia em que houver. `getProductsByCategory` aplica o
`slug` do path DEPOIS do spread da query recebida, de propósito: um
`?category=` na query string não pode sobrescrever a categoria da URL.

### 2. Home: prateleiras são spec editorial, página só decide o arranjo

`lib/home.ts` declara as 14 prateleiras da home como `SPECS` — quais existem,
em que ordem, com que query — para que `app/page.tsx` decida só o ARRANJO
(o que vem antes, onde entra um banner). Se uma prateleira como "Mais
vendidos" passar a vir de telemetria real em vez do proxy atual (estoque alto
— não há dado de vendas no mock), a mudança fica isolada no `query` daquela
spec.

Cada prateleira é uma consulta paginada (`listProducts`, `perPage:
MAX_ITEMS`), não um `.filter()` sobre o catálogo inteiro: com 10.000
produtos, montar 14 prateleiras varrendo tudo 14 vezes seria o trabalho mais
caro da rota mais visitada do site. Prateleiras baseadas em múltiplas
categorias fazem uma consulta por categoria (cada uma já limitada a
`MAX_ITEMS`) e deduplicam por slug — o mesmo cuidado de identidade do ADR
0005, porque o `id` de `big.json` também repete aqui.

`getShelves` memoiza na promise pelo mesmo motivo de `getCatalog`: a home
chama `getHomeShelf` 14 vezes e todas compartilham a mesma montagem. Isso
substituiu um `new Map(...)` no topo do módulo que não sobrevive mais desde
que montar uma prateleira passou a depender de I/O — I/O no corpo de um
módulo roda no import, travando o boot em vez do primeiro uso.

`getHomeShelf` lança em id desconhecido (typo de quem monta a página — bom
descobrir no build), mas uma prateleira que ficou sem produto não lança: o
componente `<Shelf>` simplesmente não renderiza.

### 3. Banners: tipos deliberadamente diferentes para hero e conteúdo

`lib/banners.ts` define dois tipos porque as regras são diferentes de
propósito: o `Banner` do hero exige toda a copy; o `PromoBanner` de conteúdo
(atalho de categoria, faixa de campanha) tem copy inteiramente opcional — um
atalho é só arte + nome, e inventar subtítulo só para satisfazer o tipo
poluiria os dados. A proporção (`width`/`height`) não precisa ser igual entre
seções diferentes, só dentro da mesma seção — senão a grade fica com cards de
alturas distintas. `getPromoBanners(section)` lança em seção inexistente:
um id de seção errado é typo de quem monta a página, e falhar no build é
melhor que uma faixa sumir silenciosamente da home em produção.

### 4. `app/page.tsx`: só arranjo, lazy abaixo do hero

A página soma as prateleiras e banners na ordem que o ritmo de varejo pede —
blocos de duas ou três prateleiras cortados por uma faixa editorial, com as
prateleiras de maior intenção (mais vendidos, ofertas) primeiro. Tudo abaixo
do hero é lazy-carregado (imagem por proximidade da viewport, `<Link>` de
banner com `prefetch={false}`, ver
[[0011-convencao-prefetch-false-em-links-de-baixa-intencao]]) porque uma
página com ~60 links sem isso viraria uma tempestade de requests durante a
rolagem e estouraria o orçamento de performance de `lighthouserc.js`.

## Consequências

**Positivas**

- Uma categoria nova no catálogo nunca aparece "quebrada" (slug cru) no menu
  — some até alguém decidir o rótulo, o que é o comportamento seguro.
- Trocar a fonte de dados de uma prateleira (ex.: telemetria real de vendas)
  é uma mudança isolada em `lib/home.ts`, sem tocar `app/page.tsx`.
- Erros de configuração (id de prateleira ou seção de banner inexistente)
  aparecem no build/primeiro uso, não como uma seção sumida silenciosamente
  em produção.

**Negativas / limitações aceitas**

- A lista `LABELS` precisa ser mantida manualmente em sincronia com os slugs
  reais do catálogo — nada avisa proativamente quando um slug novo aparece
  sem rótulo, ele só some do menu.
- O "mais vendidos" da home usa estoque como proxy de popularidade, não dados
  reais de venda — o mock não tem telemetria para isso.
- `getAllCategorySlugs()` não tem consumidor hoje (alimentava um
  `generateStaticParams` de `/categorias/[slug]` removido quando a rota se
  mostrou dinâmica); foi mantida para um futuro `sitemap.ts`, mas é código
  sem uso ativo até lá.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Categoria sem rótulo cai no slug cru | Vazaria identificadores internos (`racao-seca`) para o usuário final em vez de um nome apresentável. |
| `.filter()` sobre o catálogo inteiro por prateleira | Com 10.000 produtos e 14 prateleiras, seria a operação mais cara da rota mais visitada — `listProducts` paginado evita o scan completo. |
| `new Map(...)` síncrono no topo do módulo de `lib/home.ts` | Deixou de funcionar quando montar uma prateleira passou a depender de I/O — código de topo de módulo roda no import e travaria o boot do processo. |
| Seção de banner inexistente devolve lista vazia | Esconderia um typo de configuração como se fosse "sem banners", em vez de falhar visivelmente no build. |
