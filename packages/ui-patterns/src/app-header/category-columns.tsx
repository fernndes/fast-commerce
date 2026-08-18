import { focusRing, fgTextHover, mutedText } from '@repo/ui/tokens';

import type { NavDepartment } from '../types';

/**
 * Colunas de departamento com suas subcategorias — o CONTEÚDO da navegação
 * por categorias, compartilhado pelas duas cascas (mega menu de desktop e
 * disclosure de mobile). As cascas mudam só onde e quando ele aparece.
 */
export function CategoryColumns({
  departments,
  variant,
}: {
  departments: NavDepartment[];
  variant: 'mega' | 'mobile';
}) {
  return (
    <ul
      className={`grid gap-x-8 gap-y-6 ${
        variant === 'mega' ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'
      }`}
    >
      {departments.map((dept) => (
        <li key={dept.slug}>
          <a
            href={dept.href}
            className={`mb-2 block text-sm font-semibold hover:underline ${focusRing}`}
          >
            {dept.name}
          </a>

          <ul className="flex flex-col gap-1.5">
            {dept.children.map((child) => (
              <li key={child.slug}>
                <a
                  href={child.href}
                  className={`text-sm hover:underline ${mutedText} ${fgTextHover} ${focusRing}`}
                >
                  {child.name}
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
