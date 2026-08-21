import { listProducts, type Page, type Product, type ProductQuery } from '@/lib/catalog';

// Camada de navegação — hierarquia e curadoria vivem em `@repo/nav`. Este
// módulo sobrevive como fachada. Ver ADR 0004, raiz
// (docs/adr/0004-casca-como-componentes-react-em-workspace.md), seção
// "um header só, e packages/nav como fonte da navegação".
export {
  categoryHref,
  findCategory,
  getAllCategorySlugs,
  getCategoryTree,
  getFeaturedCategories,
  type Category,
  type Department,
} from '@repo/nav';

// `slug` vem DEPOIS do spread de propósito: `?category=` não sobrescreve a
// categoria do path. Ver ADR 0010.
export function getProductsByCategory(
  slug: string,
  query: ProductQuery = {},
): Promise<Page<Product>> {
  return listProducts({ ...query, category: slug });
}
