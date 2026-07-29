'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useHydrated } from '@/components/carousel/use-hydrated';

type CarouselAutoplayProps = {
  /** Id do scroller renderizado pelo `<Carousel>`. */
  targetId: string;
  count: number;
  intervalMs?: number;
  /**
   * Rótulo acessível de cada dot, um por slide. Array (e não callback) porque
   * funções não atravessam a fronteira server → client.
   */
  slideLabels?: string[];
};

/**
 * Ilha client mínima: rotação automática + dots. Não envolve nada — os slides
 * ficam inteiros na árvore server e são achados por id. O HTML servido já tem
 * a primeira imagem; o JS só passa a mexer no `scrollLeft` depois da hidratação.
 */
export function CarouselAutoplay({
  targetId,
  count,
  intervalMs = 6000,
  slideLabels,
}: CarouselAutoplayProps) {
  const hydrated = useHydrated();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const hovered = useRef(false);

  // Índice ativo derivado do scroll nativo — o scroll é a fonte da verdade,
  // não um state paralelo que pode divergir dele.
  useEffect(() => {
    const scroller = document.getElementById(targetId);
    if (!scroller) return;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = scroller.clientWidth || 1;
        setIndex(Math.min(count - 1, Math.round(scroller.scrollLeft / width)));
      });
    };

    sync();
    scroller.addEventListener('scroll', sync, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', sync);
    };
  }, [targetId, count]);

  // Pausa ao passar o mouse ou focar. Ouve no root (não no scroller) para os
  // dots sobrepostos não contarem como "saiu do carrossel".
  useEffect(() => {
    const scroller = document.getElementById(targetId);
    const root = scroller?.closest('[data-carousel-root]') ?? scroller;
    if (!root) return;

    const enter = () => {
      hovered.current = true;
    };
    const leave = () => {
      hovered.current = false;
    };

    root.addEventListener('pointerenter', enter);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('focusin', enter);
    root.addEventListener('focusout', leave);
    return () => {
      root.removeEventListener('pointerenter', enter);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('focusin', enter);
      root.removeEventListener('focusout', leave);
    };
  }, [targetId]);

  useEffect(() => {
    if (count < 2 || !playing) return;
    // Quem pediu menos movimento não recebe rotação automática nenhuma.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scroller = document.getElementById(targetId);
    if (!scroller) return;

    const timer = window.setInterval(() => {
      if (document.hidden || hovered.current) return;
      const width = scroller.clientWidth || 1;
      const next = (Math.round(scroller.scrollLeft / width) + 1) % count;
      scroller.scrollTo({ left: next * width, behavior: 'smooth' });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [targetId, count, intervalMs, playing]);

  const goTo = useCallback(
    (i: number) => {
      const scroller = document.getElementById(targetId);
      scroller?.scrollTo({ left: i * scroller.clientWidth, behavior: 'smooth' });
    },
    [targetId],
  );

  if (!hydrated || count < 2) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4 sm:justify-start sm:px-6">
      {/* WCAG 2.2.2: conteúdo que se move sozinho precisa de um pause explícito. */}
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pausar rotação dos banners' : 'Retomar rotação dos banners'}
        className="pointer-events-auto mr-1 grid size-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3 fill-current">
          {playing ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
        </svg>
      </button>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          aria-label={slideLabels?.[i] ?? `Ir para o slide ${i + 1}`}
          aria-current={i === index}
          className={`pointer-events-auto h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
          }`}
        />
      ))}
    </div>
  );
}
