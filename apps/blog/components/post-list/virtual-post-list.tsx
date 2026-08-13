'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { PostCard } from '@/components/post-list/post-card';
import {
  ESTIMATED_ROW_HEIGHT,
  POSTS_INDEX_URL,
  type PostSummary,
} from '@/lib/post-types';

/*
 * A ilha de WINDOWING PURO. Ver Blog-0002.
 *
 * O que ela é: o índice completo dos 10.000 resumos é buscado UMA vez, fica
 * inteiro em memória, e o virtualizador decide quais ~30 itens existem no DOM
 * conforme o scroll.
 *
 * O que ela NÃO é, de propósito:
 *   - não há chunk N+1, nem IntersectionObserver disparando fetch (isso seria
 *     scroll infinito — ataca payload inicial, não peso de DOM);
 *   - não há `?page=` nem estado de paginação (isso seria paginação — resolve
 *     deep-link e SEO, que aqui quem resolve é o `sitemap.xml`).
 *
 * Só um fetch e paginação de RENDERIZAÇÃO. Misturar com fetch incremental
 * turvaria exatamente a variável que este projeto existe para medir.
 *
 * ---------------------------------------------------------------------------
 * A COSTURA (limitação aceita, não escondida)
 *
 * O servidor já pintou a primeira janela no HTML — é o LCP e é o que crawler e
 * usuário sem JS enxergam. Esta ilha precisa "adotar" essa janela sem piscar.
 * A sequência:
 *
 *   1. Primeiro render no cliente: renderiza `initial` como lista simples,
 *      markup IDÊNTICO ao do servidor. Sem isso a hidratação acusa mismatch.
 *   2. Efeito: busca o índice completo.
 *   3. Índice na mão: liga o virtualizador, que assume o scroll dali em diante.
 *
 * O custo visível: entre (1) e (3) a lista mostra só a primeira janela, e a
 * altura da página salta quando os 10.000 entram (a barra de rolagem encolhe de
 * repente). É o comportamento que este teste quer observar de perto — quanto
 * tempo até o scroll ficar "responsivo" além da primeira janela.
 */

type Props = {
  /** A primeira janela, exatamente como o servidor a renderizou. */
  initial: PostSummary[];
  /** Total de posts no índice — usado para dizer o que ainda vai chegar. */
  total: number;
};

type Status = 'primeira-janela' | 'virtualizando' | 'erro';

export function VirtualPostList({ initial, total }: Props) {
  const [items, setItems] = useState<PostSummary[]>(initial);
  const [status, setStatus] = useState<Status>('primeira-janela');

  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Onde a lista começa na página. O virtualizador posiciona em coordenada de
  // documento, então sem isto as linhas nascem deslocadas pela altura do header
  // e do cabeçalho da listagem.
  useLayoutEffect(() => {
    const measure = () => {
      if (listRef.current) setScrollMargin(listRef.current.offsetTop);
    };

    measure();
    // O offset muda quando o cabeçalho reflui (ex.: rotação, resize).
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    // `AbortController` porque em StrictMode o efeito roda duas vezes em dev; sem
    // ele, dois fetches de 3 MB concorrem e o segundo sobrescreve o primeiro.
    const controller = new AbortController();

    async function loadIndex() {
      try {
        const response = await fetch(POSTS_INDEX_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`índice respondeu ${response.status}`);

        const full: PostSummary[] = await response.json();

        setItems(full);
        setStatus('virtualizando');
      } catch (error) {
        if (controller.signal.aborted) return;

        // Falha ALTA, não silenciosa: a lista continua na primeira janela e o
        // usuário recebe o caminho alternativo (sitemap) em vez de uma tela que
        // parece ter só 24 posts. Espírito do ADR 0010 do storefront.
        console.error('[blog] não foi possível carregar o índice de posts', error);
        setStatus('erro');
      }
    }

    void loadIndex();
    return () => controller.abort();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    // Algumas linhas além da viewport nos dois sentidos: o suficiente para o
    // scroll rápido não mostrar buraco branco, longe o bastante de "render tudo".
    overscan: 8,
    scrollMargin,
  });

  // Antes do índice chegar, o markup é o mesmo do servidor — ver "A COSTURA".
  if (status !== 'virtualizando') {
    return (
      <div ref={listRef} aria-busy={status === 'primeira-janela'}>
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}

        {status === 'erro' ? (
          <p className="py-6 text-sm text-zinc-600 dark:text-zinc-400">
            Não foi possível carregar a lista completa. Os {total.toLocaleString('pt-BR')} posts
            continuam acessíveis pelo{' '}
            <a href="/blog/sitemap.xml" className="underline">
              índice completo
            </a>
            .
          </p>
        ) : (
          <p className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Carregando os {total.toLocaleString('pt-BR')} posts…
          </p>
        )}
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();

  return (
    // Altura total reservada para os 10.000 itens: é o que dá à barra de rolagem
    // o tamanho certo mesmo com ~30 nós no DOM. Esse número é a virtualização.
    <div
      ref={listRef}
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.map((row) => {
        const post = items[row.index]!;

        return (
          <div
            // `key` pelo slug, não pelo índice: é a identidade do post — ver Blog-0003.
            key={post.slug}
            // `data-index` + `measureElement`: o virtualizador mede a linha real
            // e corrige `ESTIMATED_ROW_HEIGHT` sozinho.
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}
          >
            <PostCard post={post} />
          </div>
        );
      })}
    </div>
  );
}
