import { ProductCard } from '@/components/shelf/product-card';
import type { Product } from '@/lib/catalog';

/**
 * A grade de resultados, compartilhada por PLP, categoria e busca — as três
 * páginas mostram a mesma coisa e só diferem em como chegaram na lista.
 *
 * As colunas casam com o `sizes` do ProductCard (23vw / 38vw / 60vw), o mesmo
 * acoplamento que o ADR 0001 registra: mudar uma coisa exige mudar a outra.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        // `key` pelo slug: o `id` do `big.json` repete em 59 produtos.
        <li key={product.slug}>
          <ProductCard product={product} index={index} />
        </li>
      ))}
    </ul>
  );
}
