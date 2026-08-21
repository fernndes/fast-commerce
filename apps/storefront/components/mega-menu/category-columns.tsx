import Link from 'next/link';

import type { Department } from '@/lib/categories';

type CategoryColumnsProps = {
  departments: Department[];
  className?: string;
};

// Conteúdo da navegação por categorias, reaproveitado por desktop e mobile —
// ver ADR 0017 (adr/0017-mega-menu-css-puro-group-hover-focus-within.md).
export function CategoryColumns({ departments, className = '' }: CategoryColumnsProps) {
  return (
    <ul className={`grid gap-x-8 gap-y-6 ${className}`}>
      {departments.map((dept) => (
        <li key={dept.slug} className="flex flex-col gap-2">
          <Link
            href={dept.href}
            // `prefetch={false}` no painel — ver ADR 0011 e ADR 0017, §3.
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
