import Image from 'next/image';
import Link from 'next/link';

import { discountOf, type Product } from '@/lib/catalog';
import { toBRL, toPercent } from '@/lib/format';

// Server Component: mostra `priceFrom`/`listPriceFrom` — nunca um "preço do
// produto", que não existe. Ver ADR 0005
// (adr/0005-camada-de-dados-do-catalogo-leitura-via-fs.md), §6.
export function ProductCard({ product, index }: { product: Product, index?: number }) {
  const discount = discountOf(product);
  const multiSku = product.items.length > 1;

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex h-full flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="relative">
        <Image
          src={product.thumb_image}
          alt={product.name}
          width={600}
          height={600}
          priority={index !== undefined && index < 4}
          sizes="(min-width: 1024px) 23vw, (min-width: 640px) 38vw, 60vw"
          className="h-auto w-full rounded-xl bg-zinc-100 object-cover dark:bg-zinc-900"
        />
        {discount > 0 && (
          <span className="absolute top-2 left-2 rounded-md bg-emerald-700 px-1.5 py-0.5 text-xs font-semibold text-white">
            -{toPercent(discount)}%<span className="sr-only"> de desconto</span>
          </span>
        )}
        {!product.inStock && (
          <span className="absolute top-2 right-2 rounded-md bg-zinc-900/85 px-1.5 py-0.5 text-xs font-medium text-white">
            Esgotado
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs text-zinc-500 uppercase">{product.brand}</p>
        <h3 className="text-sm leading-snug text-zinc-700 group-hover:underline dark:text-zinc-300">
          {product.name}
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2">
          {discount > 0 && (
            <span className="text-xs text-zinc-500 line-through">
              {toBRL(product.listPriceFrom)}
            </span>
          )}
          <span className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            {multiSku && <span className="text-xs font-normal text-zinc-500">a partir de </span>}
            {toBRL(product.priceFrom)}
          </span>
        </p>
      </div>
    </Link>
  );
}
