// Ponte fina para `lib/catalog.ts` — ver ADR 0005 (adr/0005-camada-de-dados-do-catalogo-leitura-via-fs.md).

export { getProductBySlug, listProducts, searchProducts } from '@/lib/catalog';
export type { Offer, Page, Product, ProductQuery, Sku, SortKey } from '@/lib/catalog';
