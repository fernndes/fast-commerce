import Link from 'next/link';

import type { Department } from '@/lib/categories';

type CategoryColumnsProps = {
  departments: Department[];
  className?: string;
};

/**
 * Conteúdo da navegação por categorias: colunas de departamento com suas
 * subcategorias. Server Component puro — sai como `<a href>` no HTML servido,
 * que é o que o Google segue para chegar nas páginas de categoria.
 *
 * Reaproveitado pelo mega menu (desktop) e pelo menu mobile. As duas cascas
 * mudam só o layout; o conteúdo — e o custo dele — é o mesmo e é server.
 */
export function CategoryColumns({ departments, className = '' }: CategoryColumnsProps) {
  return (
    <ul className={`grid gap-x-8 gap-y-6 ${className}`}>
      {departments.map((dept) => (
        <li key={dept.slug} className="flex flex-col gap-2">
          <Link
            href={dept.href}
            // `prefetch={false}` em todo o painel: são ~30 links dentro de um
            // elemento que existe no DOM de toda página. Com prefetch ligado,
            // cada carregamento disparava 30 requests de rotas que o usuário
            // provavelmente não vai visitar. Na barra em destaque (6 links) o
            // prefetch continua ligado — ali ele paga.
            prefetch={false}
            className="text-sm font-semibold text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-50"
          >
            {dept.name}
          </Link>

          <ul className="flex flex-col gap-1.5">
            {dept.children.map((child) => (
              <li key={child.slug}>
                <Link
                  href={child.href}
                  prefetch={false}
                  className="text-sm text-zinc-600 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
