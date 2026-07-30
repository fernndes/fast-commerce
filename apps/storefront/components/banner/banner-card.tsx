import Image from 'next/image';

import { LinkBox } from '@/components/link-box/link-box';
import type { PromoBanner } from '@/lib/banners';

type BannerCardProps = {
  banner: PromoBanner;
  /**
   * Precisa casar com a largura em que o banner é RENDERIZADO na grade de quem
   * o chama. Sem isso o browser baixa a arte em tamanho cheio para um card de
   * um terço de tela — o desperdício de banda mais caro de uma home.
   */
  sizes: string;
  className?: string;
  prefetch?: boolean;
};

/**
 * Banner clicável: arte + copy sobreposta. É só um `LinkBox` com um filho —
 * toda a mecânica de link (âncora certa, foco, `group`) mora lá.
 *
 * Nenhum banner leva `preload`: o hero já é o candidato a LCP da página, e um
 * segundo preload competindo pela banda inicial só atrasa o primeiro.
 */
export function BannerCard({ banner, sizes, className = '', prefetch = false }: BannerCardProps) {
  // Quando a copy aparece sobre a arte, ela é que nomeia o link — a imagem vira
  // decorativa (`alt=""`). Repetir a descrição da foto faria o leitor de tela
  // anunciar a mesma promoção duas vezes. Banner sem copy (arte com texto já
  // embutido) cai no caso oposto: o `alt` é o único nome que o link tem.
  const temCopy = Boolean(banner.title || banner.subtitle || banner.cta);

  return (
    <LinkBox
      href={banner.href}
      prefetch={prefetch}
      className={`relative isolate overflow-hidden rounded-xl ${className}`}
    >
      <Image
        src={banner.image}
        alt={temCopy ? '' : banner.alt}
        width={banner.width}
        height={banner.height}
        sizes={sizes}
        loading="lazy"
        className="h-auto w-full bg-zinc-200 object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] dark:bg-zinc-800"
      />

      {temCopy && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white sm:p-5">
            {banner.title && (
              <h3 className="text-base font-semibold tracking-tight text-balance sm:text-lg">
                {banner.title}
              </h3>
            )}
            {banner.subtitle && (
              <p className="text-xs text-white/85 text-pretty sm:text-sm">{banner.subtitle}</p>
            )}
            {banner.cta && (
              <span className="mt-2 w-fit rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition-colors group-hover:bg-white/85 sm:text-sm">
                {banner.cta}
              </span>
            )}
          </div>
        </>
      )}
    </LinkBox>
  );
}
