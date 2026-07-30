import Image from 'next/image';

import { Carousel, CarouselItem } from '@/components/carousel/carousel';
import { LinkBox } from '@/components/link-box/link-box';
import type { PromoBanner } from '@/lib/banners';

const TILES_ID = 'atalhos-categorias';

/**
 * Atalhos visuais logo abaixo do hero — a primeira decisão de navegação que a
 * home oferece, e por isso a que mais recebe clique.
 *
 * Mesmo primitivo do hero e das prateleiras (`Carousel`): no mobile vira régua
 * rolável, no desktop cabe inteiro na linha. Sem setas — dez alvos de 100px não
 * justificam uma ilha client só para empurrá-los.
 *
 * Aqui o prefetch fica LIGADO (padrão do Next): são poucos links, sempre
 * visíveis, e apontam para rotas de categoria já pré-renderizadas. É o inverso
 * dos banners mais abaixo, onde `prefetch={false}` evita dezenas de requests.
 */
export function CategoryTiles({ banners, title }: { banners: PromoBanner[]; title: string }) {
  if (banners.length === 0) return null;

  return (
    <section aria-labelledby={`${TILES_ID}-title`} className="flex flex-col gap-4">
      <h2
        id={`${TILES_ID}-title`}
        className="px-4 text-lg font-semibold tracking-tight text-zinc-950 sm:px-6 dark:text-zinc-50"
      >
        {title}
      </h2>

      <Carousel
        id={TILES_ID}
        label={title}
        scrollerClassName="gap-4 px-4 scroll-px-4 sm:gap-6 sm:px-6 sm:scroll-px-6"
      >
        {banners.map((banner) => (
          <CarouselItem key={banner.id} className="w-24 sm:w-28">
            <LinkBox href={banner.href} className="flex flex-col items-center gap-2 text-center">
              <Image
                src={banner.image}
                alt=""
                width={banner.width}
                height={banner.height}
                // O tile é minúsculo e de tamanho fixo: sem `sizes`, o browser
                // assumiria 100vw e baixaria a arte inteira para 96px de tela.
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
