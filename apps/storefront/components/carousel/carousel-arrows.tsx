'use client';

import { useCallback, useEffect, useState } from 'react';

import { useHydrated } from '@/components/carousel/use-hydrated';

type CarouselArrowsProps = {
  /** Id do scroller renderizado pelo `<Carousel>`. */
  targetId: string;
  /** Nome dos itens, para os rótulos: "Ver mais produtos". */
  label: string;
};

/**
 * Ilha client opcional para prateleiras. O scroll já funciona sem ela (é o
 * scroll nativo do browser); as setas são só um atalho de mouse, por isso só
 * aparecem depois da hidratação e somem quando não há transbordo.
 */
export function CarouselArrows({ targetId, label }: CarouselArrowsProps) {
  const hydrated = useHydrated();
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  useEffect(() => {
    const scroller = document.getElementById(targetId);
    if (!scroller) return;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setEdges({
          atStart: scroller.scrollLeft <= 1,
          atEnd: scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1,
        });
      });
    };

    sync();
    scroller.addEventListener('scroll', sync, { passive: true });
    // Resize muda o transbordo: as setas precisam sumir/voltar junto.
    const observer = new ResizeObserver(sync);
    observer.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [targetId]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const scroller = document.getElementById(targetId);
      scroller?.scrollBy({ left: direction * scroller.clientWidth * 0.9, behavior: 'smooth' });
    },
    [targetId],
  );

  // Sem JS, ou sem transbordo: nada a mostrar.
  if (!hydrated || (edges.atStart && edges.atEnd)) return null;

  return (
    <div className="flex gap-2">
      <ArrowButton
        onClick={() => step(-1)}
        disabled={edges.atStart}
        label={`Ver ${label} anteriores`}
        path="M10 3L5 8l5 5"
      />
      <ArrowButton
        onClick={() => step(1)}
        disabled={edges.atEnd}
        label={`Ver mais ${label}`}
        path="M6 3l5 5-5 5"
      />
    </div>
  );
}

function ArrowButton({
  onClick,
  disabled,
  label,
  path,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  path: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full border border-black/10 transition-opacity hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/10"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-4 fill-none stroke-current stroke-[1.5]"
      >
        <path d={path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
