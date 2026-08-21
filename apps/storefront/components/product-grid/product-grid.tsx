import { ProductCard } from '@/components/shelf/product-card';
import type { Product } from '@/lib/catalog';

// Grade de resultados compartilhada por PLP, categoria e busca. Colunas
// casadas com o `sizes` do ProductCard — mesmo acoplamento do ADR 0001 (raiz).
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        // `key` pelo slug — ver ADR 0005.
        <li key={product.slug}>
          <ProductCard product={product} index={index} />
        </li>
      ))}
    </ul>
  );
}
