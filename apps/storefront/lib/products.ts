/**
 * Ponte fina para `lib/catalog.ts`.
 *
 * Antes este arquivo era a camada de dados: `import produtosJSON from
 * '@/data/products.json'` e uma constante de módulo. Com 10.000 produtos isso
 * deixou de ser viável — o catálogo agora é lido do disco e indexado em
 * `lib/catalog.ts`, e este módulo existe só para os imports antigos
 * (`@/lib/products`) continuarem resolvendo.
 *
 * `getAllProducts()` NÃO foi mantido de propósito: devolver 10.000 produtos de
 * uma vez é exatamente o que esta migração veio eliminar. Quem chamava passou
 * a usar `listProducts`, que pagina.
 */

export { getProductBySlug, listProducts, searchProducts } from '@/lib/catalog';
export type { Offer, Page, Product, ProductQuery, Sku, SortKey } from '@/lib/catalog';
