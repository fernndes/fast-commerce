# ADR 0005 — Camada de dados do catálogo: leitura via `fs`, índice em memória, slug como identidade

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O catálogo (`data/big.json`) tem 10.000 produtos / 29.112 SKUs / ~13 MB. O
commit `194d17e feat: refactor data provider + add product page + add
products page with pagination` (2026-07-30) substituiu a abordagem anterior —
`lib/products.ts` importava um `products.json` menor como constante de módulo
(`import produtosJSON from '@/data/products.json'`) — por uma camada dedicada,
`lib/catalog.ts`, porque o volume de dados deixou de caber no modelo antigo.

## Decisão

### 1. `fs.readFile`, nunca `import`

`lib/catalog.ts:4-16` documenta a razão: um `import` de JSON entra no bundle e
vira constante de módulo — 13 MB no servidor e, pior, um dado que o Next tenta
serializar. `load()` (linha 153) lê o arquivo com `readFile` uma vez por
processo e indexa em memória; o custo é pago no primeiro request depois do
boot, não por request.

### 2. Índice em memória, memoizado na PROMISE

`getCatalog()` (linha 201) guarda `cache: Promise<Catalog> | null`. A
memoização é na *promise*, não no resultado resolvido: dois requests
concorrentes no boot compartilham a mesma leitura em vez de abrirem dois
`readFile` de 13 MB cada.

### 3. `process.cwd()` + `outputFileTracingIncludes`

`load()` resolve o caminho do arquivo com `path.join(process.cwd(), 'data',
'big.json')` — estável em dev, build e start. Para o arquivo sobreviver ao
deploy, `next.config.ts` declara `outputFileTracingIncludes: { '/**':
['./data/big.json'] }`; sem essa entrada o arquivo desaparece do trace do
servidor em produção.

### 4. Slug como chave de identidade, não `id`

`big.json` tem 59 `id`s repetidos entre os 10.000 produtos (o gerador do mock
sorteia o `id`) — só os `slug`s são únicos. Por isso `bySlug` é indexado por
slug, e o mesmo slug é usado como `key` do React nas listagens (`lib/home.ts`
repete a mesma deduplicação por slug ao montar as prateleiras).

### 5. Produto sem SKU não derruba a listagem

`toProduct()` (linha 118) assume que todo produto tem ao menos um SKU, mas não
lança se não tiver: cai como indisponível (`priceFrom: 0`, `inStock: false`)
em vez de quebrar a indexação inteira por um registro malformado.

### 6. Nomenclatura do `Product`: `priceFrom`/`listPriceFrom`/`inStock` são de listagem

Esses três campos existem só para o "a partir de" que um card mostra quando o
produto tem SKUs com preços diferentes. O nome é deliberado — chamar de
`price` recriaria a confusão de preço-no-produto que este shape eliminou. PDP
e carrinho leem sempre `items[].offer`, nunca esses campos (reforçado em
`app/produtos/[slug]/page.tsx` e `components/product/sku-selector.tsx`).

### 7. `lib/products.ts` é ponte fina, `getAllProducts()` não foi mantido

O módulo antigo virou um re-export de `lib/catalog.ts` só para os imports
existentes (`@/lib/products`) continuarem resolvendo. `getAllProducts()` foi
removido de propósito: devolver os 10.000 produtos de uma vez é exatamente o
que a migração veio eliminar — quem chamava passou a usar `listProducts`, que
pagina.

### 8. Dinheiro é inteiro em centavos, formatado num único lugar

Todo valor monetário do catálogo (`offer.listPrice`, `offer.price`,
`priceFrom`) é inteiro em centavos, nunca float. `lib/format.ts` converte para
reais só na hora de exibir, e o `Intl.NumberFormat` é instanciado uma vez por
processo (não um por card numa grade de 24 produtos).

## Consequências

**Positivas**

- Nenhum bundle de servidor carrega 13 MB de dados como constante de módulo.
- Leitura e indexação acontecem uma vez por processo, não por request.
- `slug` como chave de identidade sobrevive à falha de unicidade do `id` no
  mock, sem exigir corrigir o gerador de dados.

**Negativas / limitações aceitas**

- O primeiro request depois de cada boot (cold start em serverless) paga o
  custo de ler e indexar 13 MB — não há warm-up explícito.
- `outputFileTracingIncludes` é uma dependência de configuração silenciosa:
  quem move `data/big.json` ou renomeia o array de padrões sem saber por que
  ela existe reintroduz o bug "some no deploy" sem aviso em dev.
- `lib/products.ts` como ponte fina significa dois pontos de entrada para o
  mesmo dado (`@/lib/catalog` e `@/lib/products`) — aceito para não quebrar
  imports existentes, mas é superfície a mais para divergir no futuro.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Manter `import` direto do JSON (abordagem anterior) | Inviável a partir de 10.000 produtos: entra inteiro no bundle do servidor e o Next tenta serializar o módulo. |
| Ler o arquivo a cada request | Repetiria um `readFile` de 13 MB por request; a memoização por processo já resolve isso sem cache externo. |
| Usar `id` como chave de identidade | `big.json` tem 59 `id`s duplicados entre 10.000 produtos; só `slug` é garantidamente único nos dados atuais. |
| Preservar `getAllProducts()` como compat shim | Reintroduziria exatamente o padrão (devolver o catálogo inteiro de uma vez) que a migração para `listProducts` paginado veio eliminar. |
