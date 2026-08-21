import Image from 'next/image';

import { Carousel, CarouselItem } from '@/components/carousel/carousel';
import { LinkBox } from '@/components/link-box/link-box';
import type { PromoBanner } from '@/lib/banners';

const TILES_ID = 'atalhos-categorias';

/**
 * Atalhos visuais logo abaixo do hero. Mesmo primitivo do carrossel do hero e
 * das prateleiras, prefetch ligado — ver ADR 0001 (raiz) e ADR 0011
 * (adr/0011-convencao-prefetch-false-em-links-de-baixa-intencao.md).
 */
export function CategoryTiles({ banners, title }: { banners: PromoBanner[]; title: string }) {
  if (banners.length === 0) return null;

  return (
    <section aria-labelledby={`${TILES_ID}-title`} className="flex flex-col gap-4">
      <h2
        id={`${TILES_ID}-title`}
        className="page-px text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
      >
        {title}
      </h2>

      <Carousel
        id={TILES_ID}
        label={title}
        scrollerClassName="page-px gap-4 scroll-px-4 sm:gap-6 sm:scroll-px-6"
      >
        {banners.map((banner) => (
          <CarouselItem key={banner.id} className="w-24 sm:w-28">
            <LinkBox href={banner.href} className="flex flex-col items-center gap-2 text-center">
              <Image
                src={banner.image}
                alt=""
                width={banner.width}
                height={banner.height}
                sizes="112px"
                loading="lazy"
                className="size-24 rounded-full bg-zinc-200 object-cover transition-transform duration-200 motion-safe:group-hover:scale-105 sm:size-28 dark:bg-zinc-800"
              />
              <span className="text-xs leading-snug text-zinc-700 group-hover:underline sm:text-sm dark:text-zinc-300">
                {banner.title ?? banner.alt}
              </span>
            </LinkBox>
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  );
}
