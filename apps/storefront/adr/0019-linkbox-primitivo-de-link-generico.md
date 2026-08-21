# ADR 0019 — `LinkBox`: primitivo único para links-cartão (interno/externo, foco, `group`)

- **Status:** aceito
- **Data:** 2026-08-21
- **Contexto:** `apps/storefront`

## Contexto

Banners, atalhos de categoria e a faixa de vantagens da home compartilham a
mesma forma: um bloco inteiro (imagem, texto, ou os dois) que é clicável e
navega para um destino. Implementado três vezes, cada consumidor teria que
resolver de novo os mesmos quatro problemas — âncora certa para o destino,
foco visível, reação ao hover sem estado, e nome acessível quando o filho é
decorativo. `components/link-box/link-box.tsx` existe para resolver isso uma
vez.

## Decisão

### 1. Âncora decidida pelo esquema do `href`

`isExternal` testa o `href` contra `/^[a-z][a-z0-9+.-]*:/i` (qualquer esquema
— `https:`, `mailto:`, `tel:`) mais o protocol-relative (`//`). Rota interna
vira `<Link>` do Next (navegação client-side, prefetch); URL externa vira
`<a target="_blank" rel="noreferrer">` puro, porque não há rota para o
roteador do Next prefetchar e tentar seria custo à toa.

### 2. Foco visível embutido, não deixado para cada consumidor lembrar

`focus-visible:outline-2 focus-visible:outline-offset-2` está na classe base
do próprio `LinkBox`. Um card clicável sem `:focus-visible` é a falha de
acessibilidade mais comum em home de e-commerce — quem navega por teclado
perde a borda do alvo. Ficar no primitivo, em vez de em cada chamador, é o
que garante que nenhum consumidor esqueça.

### 3. `group` no wrapper, sem `'use client'`

A classe `group` do Tailwind fica no link. Filhos reagem ao hover do card
inteiro (`group-hover:scale-…`, `group-hover:underline`) só com CSS — nenhum
estado de React, nenhuma fronteira client. `LinkBox` continua Server
Component: um `<a>`/`<Link>` no HTML servido, zero byte de JS.

### 4. `aria-label` só quando o filho não tem texto próprio

O prop `label` existe para o caso do filho ser puramente visual — uma
imagem decorativa, um ícone — e substitui, não soma, o texto para leitor de
tela. Com filho textual (o caso de `Highlights`, onde o filho é título +
parágrafo), `label` não é passado: o próprio texto do card já é o nome
acessível do link.

### 5. `prefetch` repassado, sem default próprio

O prop é opcional e repassado direto ao `<Link>` interno; ignorado no link
externo. Cada consumidor decide — `CategoryTiles` deixa o padrão do Next
ligado (poucos links, sempre visíveis, alta intenção), `Highlights` e
`BannerCard` desligam (`prefetch={false}`), seguindo a mesma convenção
registrada em
[[0011-convencao-prefetch-false-em-links-de-baixa-intencao]].

### 6. `BannerCard`: `alt` alterna com a copy, não soma a ela

`BannerCard` é o consumidor não trivial: arte + copy opcional sobreposta.
Quando há copy (`temCopy`), a imagem vira decorativa (`alt=""`) — a copy já
está dentro do link e é o que o leitor de tela anuncia como nome acessível.
Sem copy, o `alt` da imagem carrega a descrição (`banner.alt`) porque é o
único texto que o link tem. Repetir a descrição da foto no `alt` quando já
há copy sobreposta faria o leitor de tela anunciar a mesma promoção duas
vezes.

## Consequências

**Positivas**

- Foco visível, âncora correta e reação a hover são garantidos pelo
  primitivo — um consumidor novo não pode esquecer de implementá-los, porque
  não os implementa.
- Zero JavaScript em qualquer uso do `LinkBox`: `CategoryTiles`, `Highlights`
  e `BannerCard` continuam Server Components.
- `CategoryTiles` (atalhos redondos), `Highlights` (texto puro) e
  `BannerCard` (arte + copy sobreposta) provam que o mesmo primitivo cobre do
  caso mais simples ao mais decorado sem variante especial.

**Negativas / limitações aceitas**

- `label` e o `alt` condicional do `BannerCard` são dois mecanismos
  diferentes para o mesmo problema (nome acessível de link com filho
  decorativo) — `label` no primitivo, `alt` alternado no consumidor. Não há
  hoje uma checagem que impeça um novo consumidor de usar o mecanismo
  errado para o seu caso.
- `target="_blank"` é incondicional para qualquer link externo — não há
  como um consumidor optar por abrir na mesma aba.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Um componente por consumidor (`CategoryTileLink`, `HighlightCard`, `BannerLink`) | Repetiria a mesma lógica de âncora/foco/`group` três vezes, com risco real de um dos três esquecer o `:focus-visible`. |
| `<a>` sempre, mesmo para rotas internas | Perderia a navegação client-side e o prefetch do `<Link>` do Next para a maioria dos cliques, que são internos. |
| `aria-label` sempre obrigatório | Forçaria repetir em texto o que o filho textual já diz visualmente — ruído para quem usa leitor de tela, não ajuda. |
