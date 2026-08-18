import { listProducts, type Page, type Product, type ProductQuery } from '@/lib/catalog';

/*
 * Camada de navegação. A hierarquia e a curadoria (rótulo, ordem, destaques)
 * NÃO vivem mais aqui: vivem em `@repo/nav`, que é o que as duas zonas
 * consomem — ver ADR 0004.
 *
 * O motivo é o header. Ele é um só, com o mega menu completo, e o blog também
 * o renderiza; se a árvore fosse derivada de `getCatalog()` (13 MB de produtos
 * lidos por `fs`), o blog teria que carregar o catálogo do storefront para
 * desenhar um menu. No mundo real esses dados viriam de uma base comum a todos
 * os apps — `@repo/nav` é esse lugar, materializado em build time a partir do
 * dump do catálogo.
 *
 * Este módulo continua existindo por duas razões: `getProductsByCategory`
 * PRECISA do catálogo (é consulta de produto, não de navegação), e os call
 * sites da zona já importam daqui. As funções abaixo são reexportações — a
 * regra editorial do ADR 0010 (sem rótulo, fora do menu; destaque inexistente
 * é erro) continua valendo, aplicada no gerador do pacote.
 *
 * Elas são SÍNCRONAS agora (o dado é um import estático, não uma leitura).
 * `await` nos call sites continua correto e foi mantido — não custa nada e
 * deixa a porta aberta para a origem voltar a ser assíncrona.
 */
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
