# ADR 0011 — Convenção: `prefetch={false}` em links de baixa intenção

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O `<Link>` do Next faz prefetch por padrão de rotas visíveis no viewport. Em
componentes com muitos links de baixa probabilidade de clique — paginação,
footer, banners abaixo do hero — isso significa banda gasta prefetchando
rotas que a maioria dos visitantes nunca abre. A mesma decisão,
`prefetch={false}`, aparece de forma consistente em pelo menos três
componentes independentes.

## Decisão

`prefetch={false}` é aplicado em:

- **`components/pagination/pagination.tsx`** — até 9 links de página por
  render; a maioria não será visitada, e a régua já é uma janela em volta da
  página atual (primeira + última + vizinhas), não a lista completa (com
  10.000 produtos seriam até 417 páginas).
- **`components/footer/footer.tsx`** — dezenas de links institucionais no fim
  de toda página, quase todos de baixa intenção de clique.
- **`app/page.tsx`** — os `<Link>` de banner abaixo do hero, junto com
  imagens lazy por proximidade de viewport; sem isso, uma página com ~60
  links dispararia uma tempestade de prefetch durante a rolagem e estouraria
  o orçamento de performance de `lighthouserc.js`.

Cada ocorrência é uma aplicação independente da mesma regra, não uma função
compartilhada — a convenção vive nos três lugares como decisão replicada, não
como abstração central.

Também no lado da paginação: a página 1 nunca recebe `?page=1` explícito na
URL (`components/pagination/pagination.tsx`) — a URL canônica é a limpa, para
`/produtos` e `/produtos?page=1` não virarem conteúdo duplicado para SEO.

## Consequências

**Positivas**

- Reduz prefetch desnecessário nas páginas com maior densidade de links do
  site (footer, paginação de PLP, home).
- Contribui para o orçamento de performance monitorado por
  `lighthouserc.js`.

**Negativas / limitações aceitas**

- A convenção não está centralizada — não existe um componente `<LowIntentLink>`
  ou equivalente. Um novo bloco de muitos links (ex.: uma nova seção de
  banners) precisa que quem o escreve lembre de aplicar `prefetch={false}`
  manualmente; nada força isso.
- Navegação para essas rotas fica ligeiramente mais lenta na primeira
  interação (sem o benefício do prefetch), trade-off aceito porque a maioria
  desses links nunca é clicada.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Deixar o prefetch padrão em todos os `<Link>` | Prefetch de dezenas de links de baixa intenção por página desperdiça banda sem ganho perceptível de navegação para a maioria dos visitantes. |
| Componente wrapper único (`<LowIntentLink>`) centralizando a regra | Não foi criado — cada componente aplicou a prop diretamente; registrado aqui como possível extração futura, não como decisão tomada. |
| `?page=1` explícito na URL da primeira página | Criaria duas URLs indexáveis para o mesmo conteúdo (`/produtos` e `/produtos?page=1`) — problema de conteúdo duplicado para SEO. |
