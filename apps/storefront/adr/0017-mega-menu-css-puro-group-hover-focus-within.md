# ADR 0017 — Mega menu CSS puro: `group-hover`/`group-focus-within` sem Client Component

- **Status:** aceito — e VIGENTE, embora o código tenha mudado de casa duas vezes.
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`, hoje `packages/ui-patterns/src/app-header/`

  A decisão desta ADR — abrir/fechar em CSS, sem Client Component — sobreviveu
  intacta à extração para Web Component (`docs/adr/0003`) e ao retorno para
  React (`docs/adr/0004`). O mega menu voltou a ser exatamente
  `group-hover`/`group-focus-within` do Tailwind, agora com grupo nomeado
  (`group/mega`), e o `@media (hover: hover)` que esta ADR escrevia à mão passou
  a vir de graça: o Tailwind v4 já emite o variante `hover` dentro dele.

## Contexto

O header precisa de um mega menu de categorias — painel que abre ao hover/foco
no desktop e fecha ao navegar. A decisão tem duas camadas que se interferem:
**onde vive o comportamento de abrir/fechar** e **onde vivem os links de
subcategoria**. Essas duas camadas foram tratadas como uma só inicialmente, o
que produziu a solução errada — e o diagnóstico do erro é a parte mais valiosa
do registro.

O requisito de SEO é o fator determinante: os `<a href>` das subcategorias
precisam estar no **HTML prerenderizado**, não gerados por JavaScript, para
que o Google rastreie a estrutura do catálogo. Com mais de 70 links de
categoria presentes no HTML de toda página, esse requisito não é opcional.

## Decisão

### 1. A abordagem descartada: padrão `children` de Server Component em Client Component

A abordagem considerada primeiro foi um `MegaMenuTrigger` Client Component
gerenciando o estado `aberto/fechado`, com o conteúdo das categorias passado
como `children`:

```tsx
// MegaMenuTrigger.tsx — 'use client'
export function MegaMenuTrigger({ children }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div onMouseEnter={() => setAberto(true)}>
      {aberto && <div className="painel">{children}</div>}
    </div>
  );
}
```

**Essa abordagem foi descartada por uma contradição interna.** O argumento
para usá-la era preservar SEO: "`children` renderiza no servidor, então os
links ficam no HTML". A afirmação é meia-verdade — o código do Server Component
não vai para o bundle JS, mas o resultado renderizado vai para o **payload RSC**,
não para o HTML. E o `{aberto && <div>{children}</div>}` com `aberto` iniciando
`false` significa que o painel **não existe no HTML servido** — ele materializa
só quando o estado client vira `true`. Os `<a href>` das subcategorias não
estavam rastreáveis. A abordagem usou o argumento de SEO para justificar uma
arquitetura que destrói exatamente esse SEO.

Isso foi verificado inspecionando o HTML prerenderizado da home: os links só
apareciam no payload RSC, não no documento.

### 2. A solução: CSS puro com `group-hover`/`group-focus-within`

O painel existe **sempre no HTML** — visualmente oculto, não condicionalmente
montado. O Tailwind usa `group-hover` e `group-focus-within` para controlar
a visibilidade por CSS puro:

```tsx
// mega-menu.tsx — Server Component (sem 'use client')
<nav className="group relative">
  <Link href="/categorias" className="...">
    Categorias
  </Link>
  <div className="invisible group-hover:visible group-focus-within:visible ...">
    <CategoryColumns />  {/* Server Component com os links reais */}
  </div>
</nav>
```

O `invisible` (ao contrário de `hidden` ou `display: none`) mantém o elemento
**no DOM e no tab order** — os links existem no HTML e são rastreáveis, mas
visualmente ocultos. Quando o usuário passa o mouse ou foca o gatilho,
`group-hover:visible` / `group-focus-within:visible` tornam o painel visível
por CSS, sem tocar o DOM.

Medição no HTML prerenderizado da home: **70 links de categoria, 32 slugs
distintos, todos como `<a href>` reais**. Header completo: 19.8 KB brutos /
2.0 KB gzip.

### 3. Detalhes que fecham casos de borda

**`@media (hover: hover)` no `group-hover`:** o Tailwind envolve `hover:`
nessa media query automaticamente, o que previne que toque em dispositivos
touch dispare o hover por acidente. Em touch, tocar no gatilho (`<Link
href="/categorias">`) navega para a listagem completa de categorias — degradação
correta sem JavaScript e sem botão morto.

**`<Link>` em vez de `<button>` no gatilho:** zero elementos interativos sem
destino no HTML. É o mesmo invariante do ADR 0013 (hero/carrossel): componentes
sem funcionalidade sem JavaScript não entram no DOM. Em touch, navega; no
desktop com mouse, abre o painel via CSS.

**Tab order e acessibilidade:** `invisible` mantém o painel no tab order, o
que é correto — o usuário de teclado consegue entrar no painel de categorias
tabulando após o gatilho, sem precisar de JavaScript. O `group-focus-within`
mantém o painel aberto enquanto qualquer link dentro dele está focado.

**`prefetch={false}` no painel, `prefetch` ligado nos destaques:** o painel
tem ~30 links e aparece em toda página. Com prefetch padrão ativo, cada
carregamento dispararia ~30 requests de rotas improváveis — custo invisível
no Lighthouse de uma página isolada, mas significativo na experiência real de
navegação. Os 6 destaques da barra superior mantêm prefetch ativo porque são
de alta intenção.

### 4. A única ilha client: `close-on-navigate.tsx`

O CSS resolve o abrir/fechar para mouse e teclado. O único caso que CSS não
cobre: em uma transição client-side do Next.js, o header persiste entre páginas
(não é remontado), então o `<details>` do menu mobile continuaria aberto sobre
a página nova.

`close-on-navigate.tsx` resolve isso com ~10 linhas, renderiza `null`, e
encontra o `<details>` por `getElementById` para fechá-lo na transição. É
uma ilha irmã (não um wrapper), o mesmo padrão do `CarouselAutoplay` do ADR
0013: a ilha não envolve o conteúdo que precisa modificar, age sobre ele por
seleção no DOM.

### 5. Duplicação desktop/mobile aceita conscientemente

A árvore de categorias renderiza duas vezes — uma para o mega menu desktop,
uma para o `<details>` mobile — resultando em ~1.0 KB gzip de duplicação.
A alternativa de unificar forçando `<details open>` por CSS no desktop foi
descartada: `<details open>` via CSS não é confiável entre browsers (o
atributo `open` não responde a CSS de forma padronizada). A duplicação de 1 KB
é o custo aceito pelo comportamento correto.

## Consequências

**Positivas**

- Os 70+ `<a href>` das subcategorias estão no HTML prerenderizado — rastreáveis
  pelo Google sem JavaScript.
- Zero JavaScript no caminho de abertura/fechamento do menu — nenhum custo
  de TBT na interação mais comum do header.
- O header inteiro é Server Component exceto `close-on-navigate.tsx` (~10
  linhas, null). Cada carregamento de página não inclui JavaScript de navegação.
- Acessibilidade via teclado funciona sem JavaScript: `group-focus-within`
  mantém o painel aberto enquanto o usuário navega pelos links internos.

**Negativas / limitações aceitas**

- `invisible` mantém o painel ocupando espaço no DOM mesmo fechado. Para
  um painel de mega menu, isso é irrelevante (não tem dimensão física visível),
  mas seria problemático em outros contextos.
- O `<details>` mobile precisa de `close-on-navigate.tsx` para resetar em
  transições client-side — o único comportamento que CSS genuinamente não
  resolve.
- Duplicação de 1.0 KB gzip entre desktop e mobile, aceita em troca de
  comportamento correto de `<details>` sem CSS hacky.
- A abordagem requer que o conjunto de categorias seja conhecido no momento
  da renderização do servidor. Categorias carregadas dinamicamente no cliente
  não se encaixam nesse modelo.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| `MegaMenuTrigger` Client Component com `useState(aberto)` e `{aberto && children}` | O `children` vai para o payload RSC, não para o HTML — os links das subcategorias não aparecem no documento prerenderizado, destruindo o SEO que era o motivo do mega menu existir. Contradição interna confirmada inspecionando o HTML. |
| `display: none` / `hidden` em vez de `invisible` | Remove o elemento do tab order e do DOM layout — o usuário de teclado não consegue navegar pelos links sem JavaScript. `invisible` mantém o elemento acessível. |
| `<button>` como gatilho em vez de `<Link>` | Cria um elemento interativo sem destino em touch (botão que não navega e não abre o hover em touch). O `<Link href="/categorias">` degrade corretamente: navega em touch, abre o painel via CSS no desktop. |
| Unificar desktop e mobile com `<details open>` por CSS | O atributo `open` do `<details>` não responde a CSS de forma padronizada entre browsers. A duplicação de 1 KB é o preço pelo comportamento correto. |
| Biblioteca de dropdown (Radix, Headless UI) | Adiciona JavaScript de runtime para um comportamento que CSS resolve, aumentando TBT sem ganho funcional. Em um componente presente em toda página, qualquer JavaScript tem custo multiplicado. |
