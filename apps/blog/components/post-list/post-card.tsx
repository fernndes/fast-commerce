import Link from 'next/link';

import { formatDate, type PostSummary } from '@/lib/post-types';

/**
 * Card de um post na listagem.
 *
 * Sem `'use client'` e sem hook nenhum: é o MESMO componente usado pelo shell
 * servidor (primeira janela, no HTML) e pela ilha de virtualização (resto da
 * lista, no browser). Isso não é economia de código — é o que garante que a
 * costura entre as duas metades seja invisível. Se fossem dois componentes,
 * divergiriam, e o momento em que o virtualizador assume o controle apareceria
 * na tela. Ver Blog-0002.
 *
 * Altura estável de propósito: `line-clamp` trava título em 2 linhas e resumo em
 * 2. Card de altura variável faz o virtualizador remedir a cada scroll e a barra
 * de rolagem "pular" — além de CLS. Com altura previsível, `ESTIMATED_ROW_HEIGHT`
 * quase acerta de primeira.
 */
export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="border-b border-black/10 py-5 dark:border-white/15">
      <div className="flex gap-4">
        {/*
          `<img>` puro, não `next/image`. Numa lista virtualizada as imagens
          montam e desmontam a cada scroll; o `next/image` acrescenta wrapper,
          observer e state a cada uma delas, e o custo aparece justamente no INP
          que este experimento quer medir. Aqui a imagem é decorativa, tem
          tamanho fixo conhecido e origem já autorizada na CSP — o componente não
          compraria nada. Na PÁGINA do post, onde a capa é o LCP, usamos
          `next/image`. Ver Blog-0002.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decisão medida, ver acima e Blog-0002 */}
        <img
          src={post.coverImage}
          alt=""
          width={120}
          height={63}
          loading="lazy"
          decoding="async"
          className="hidden h-[63px] w-[120px] shrink-0 rounded-md bg-zinc-100 object-cover sm:block dark:bg-zinc-900"
        />

        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="text-base font-semibold tracking-tight">
            {/*
              Dentro da zona: `<Link>` (soft nav). O `basePath` transforma
              `/algum-slug` em `/blog/algum-slug` sozinho — ver Blog-0001.

              `<a href>` REAL no HTML da primeira janela é o que torna a listagem
              crawlável sem JS, apesar de não haver paginação. Ver Blog-0005.
            */}
            <Link
              href={`/${post.slug}`}
              className="line-clamp-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {post.title}
            </Link>
          </h2>

          <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{post.excerpt}</p>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {post.author}
            <span aria-hidden="true"> · </span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </p>
        </div>
      </div>
    </article>
  );
}
