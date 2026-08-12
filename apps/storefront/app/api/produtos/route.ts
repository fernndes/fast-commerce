import type { NextRequest } from 'next/server';

import { listProducts, type Product } from '@/lib/catalog';
import { parseProductQuery } from '@/lib/query';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * Listagem paginada para quem roda no BROWSER — o windowing / "carregar mais"
 * da PLP e das categorias.
 *
 * Server Components não passam por aqui: eles chamam `listProducts` direto,
 * no mesmo processo. Uma página que buscasse a própria API por HTTP pagaria um
 * hop de rede para falar consigo mesma. Esta rota é a casca fina que existe
 * porque o cliente não tem acesso ao `fs`.
 *
 * `force-dynamic`: a resposta depende inteiramente da query string. Route
 * Handlers já não são cacheados por padrão no Next 16, então isto é
 * declaração de intenção — e é por isso que aqui NÃO existe `revalidate`: um
 * desligaria o cache que o outro configura.
 */
export const dynamic = 'force-dynamic';

/**
 * O payload solta `items[]` (os SKUs). Um produto tem até 5 SKUs com imagens
 * repetidas; mandar isso vezes 24 por página infla a resposta várias vezes
 * para uma listagem que só mostra preço "a partir de". Quem precisa dos SKUs
 * é a PDP, e ela lê o produto inteiro pelo slug.
 */
type ListItem = Omit<Product, 'items' | 'search'>;

/**
 * Os campos são listados um a um em vez de `{ items, search, ...rest }`: este
 * é um CONTRATO com o cliente. Escrito assim, um campo novo em `Product` (um
 * custo interno, um índice) não vaza para a resposta sozinho — para entrar na
 * API, alguém precisa vir aqui e decidir isso.
 */
const toListItem = (product: Product): ListItem => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  brand: product.brand,
  categories: product.categories,
  department: product.department,
  subcategory: product.subcategory,
  thumb_image: product.thumb_image,
  images: product.images,
  tipoOpcao: product.tipoOpcao,
  priceFrom: product.priceFrom,
  listPriceFrom: product.listPriceFrom,
  inStock: product.inStock,
  totalAvailable: product.totalAvailable,
});

export async function GET(request: NextRequest) {
  // Primeiro de tudo, antes de qualquer parse ou I/O: um flood de requests
  // inválidos ainda pagaria CPU se o 400 viesse antes.
  const { rateLimited, headers } = await checkRateLimit(request);
  if (rateLimited) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers });
  }

  const parsed = parseProductQuery(request.nextUrl.searchParams);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400, headers });
  }

  const page = await listProducts(parsed.query);

  return Response.json({ ...page, items: page.items.map(toListItem) }, { headers });
}
