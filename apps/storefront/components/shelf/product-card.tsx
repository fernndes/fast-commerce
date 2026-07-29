import Image from 'next/image';
import Link from 'next/link';

import type { Product } from '@/lib/products';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Preços vêm em centavos no data/products.json. */
const toBRL = (cents: number) => brl.format(cents / 100);

/**
 * Server Component: dados + imagem, nenhum byte de JS. Nenhuma imagem de card
 * leva `preload` — todas são lazy por padrão, o oposto do slide 0 do hero.
 */
export function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.sellingPrice < product.price;

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex h-full flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Image
        src={product.thumb_image}
        alt={product.name}
        width={600}
        height={600}
        // Casa com as larguras de slide definidas no Shelf, para o browser
        // não baixar um 600px onde cabe um 240px.
        sizes="(min-width: 1024px) 23vw, (min-width: 640px) 38vw, 60vw"
        className="h-auto w-full rounded-xl bg-zinc-100 object-cover dark:bg-zinc-900"
      />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm leading-snug text-zinc-700 group-hover:underline dark:text-zinc-300">
          {product.name}
        </h3>
        <p className="flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-xs text-zinc-500 line-through">{toBRL(product.price)}</span>
          )}
          <span className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {toBRL(product.sellingPrice)}
          </span>
        </p>
      </div>
    </Link>
  );
}
