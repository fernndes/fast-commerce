import type { ReactNode } from 'react';

type CarouselProps = {
  /** Id do scroller — as ilhas client acham o elemento por `getElementById`. Ver ADR 0001 (raiz). */
  id: string;
  /** Rótulo acessível do scroller (ele é focável para navegação por teclado). */
  label: string;
  children: ReactNode;
  /** Ilhas client opcionais, posicionadas sobre o scroller. */
  controls?: ReactNode;
  className?: string;
  scrollerClassName?: string;
};

// Carrossel horizontal de CSS puro — ver ADR 0001 (raiz,
// docs/adr/0001-carrossel-css-scroll-snap-e-ilhas-client.md).
export function Carousel({
  id,
  label,
  children,
  controls,
  className = '',
  scrollerClassName = '',
}: CarouselProps) {
  return (
    <div data-carousel-root className={`relative ${className}`}>
      <ul
        id={id}
        tabIndex={0}
        aria-label={label}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-safe:scroll-smooth ${scrollerClassName}`}
      >
        {children}
      </ul>
      {controls}
    </div>
  );
}

type CarouselItemProps = {
  children: ReactNode;
  /** A largura do slide é decisão de quem usa: `w-full` no hero, frações na prateleira. */
  className?: string;
};

export function CarouselItem({ children, className = '' }: CarouselItemProps) {
  return <li className={`shrink-0 snap-start ${className}`}>{children}</li>;
}
