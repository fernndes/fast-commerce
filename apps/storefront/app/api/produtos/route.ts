import type { NextRequest } from 'next/server';

import { listProducts, type Product } from '@/lib/catalog';
import { parseProductQuery } from '@/lib/query';
import { checkRateLimit } from '@/lib/rate-limit';

// Listagem paginada para o browser — ver ADR 0006 (adr/0006-rotas-de-api-cascas-finas-contrato-de-payload.md).
export const dynamic = 'force-dynamic';

// Payload sem `items[]`/`search` — ver ADR 0006.
type ListItem = Omit<Product, 'items' | 'search'>;

// Campo a campo, não `{ ...rest }`: é um contrato explícito com o cliente. Ver ADR 0006.
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
  // Rate limit antes de qualquer parse ou I/O — ver ADR 0006.
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
