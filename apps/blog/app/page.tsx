import type { Metadata } from 'next';

import { VirtualPostList } from '@/components/post-list/virtual-post-list';
import { getFirstWindow } from '@/lib/posts';
import { FIRST_WINDOW_SIZE } from '@/lib/post-types';

/*
 * Listagem do blog — `/blog` (o `basePath` põe o prefixo). Ver Blog-0002.
 *
 * Shell é Server Component e a primeira janela vai no HTML SERVIDO. Isso não é
 * otimização opcional: sem ela a listagem seria uma tela em branco para quem
 * chega sem JS e para crawler que não executa script — exatamente o anti-padrão
 * que o ADR 0009 do storefront existe para prevenir.
 *
 * A rota é estática (SSG): não lê nada de request, então o Next a prerenderiza
 * no build. Nenhuma invocação serverless por visita. Ver Blog-0006.
 */

export const metadata: Metadata = {
  title: 'Blog — Fast Commerce',
  description:
    'Conteúdo editorial sobre nutrição, comportamento e saúde animal. 10.000 posts.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndex() {
  const { window: firstWindow, total } = await getFirstWindow();

  return (
    <main className="page-shell flex flex-1 flex-col gap-8 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Blog</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {total.toLocaleString('pt-BR')} posts sobre nutrição, comportamento e saúde animal.
        </p>
      </header>

      {/*
        A ilha recebe a primeira janela JÁ RENDERIZADA como estado inicial e
        repinta markup idêntico na hidratação — é assim que o virtualizador
        "adota" o que o servidor pintou, sem piscar. Ver a nota "A COSTURA" em
        `virtual-post-list.tsx`.
      */}
      <VirtualPostList initial={firstWindow} total={total} />

      {/*
        Sem JS não há virtualização, e sem paginação não há "próxima página" —
        então o caminho para os outros posts precisa estar escrito, não
        implícito. O sitemap é esse caminho. Ver Blog-0005.
      */}
      <noscript>
        <p className="border-t border-black/10 py-6 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          Estes são os {FIRST_WINDOW_SIZE} posts mais recentes. A lista completa depende de
          JavaScript; os {total.toLocaleString('pt-BR')} posts estão no{' '}
          <a href="/blog/sitemap.xml" className="underline">
            índice completo
          </a>
          .
        </p>
      </noscript>
    </main>
  );
}
