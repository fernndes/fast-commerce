import { focusRing } from '../tokens';

/*
 * `<ul>` de links — a forma que se repete no header (categorias em destaque,
 * colunas do mega menu) e no footer (colunas institucionais).
 *
 * O que a primitiva garante e o consumidor não precisa lembrar: a lista é uma
 * lista de verdade (`<ul>`/`<li>`, não `<div>`s), cada item tem `key`, e todo
 * link recebe o anel de foco.
 *
 * O que ela NÃO decide: layout. Direção, gaps e tipografia entram por
 * `className`/`linkClassName` — a mesma lista vira linha horizontal no trilho de
 * destaques e coluna vertical no footer.
 */

export type NavLink = {
  href: string;
  label: string;
  /** Chave estável. Sem ela, o `href` serve — é único dentro de uma lista. */
  key?: string;
  /**
   * `true` marca a página atual. `undefined`/`false` OMITE o atributo: o React
   * não serializa `aria-current={undefined}`, que é o comportamento correto —
   * `aria-current="false"` seria uma afirmação, não uma ausência.
   */
  current?: boolean;
};

type Props = {
  items: NavLink[];
  className?: string;
  linkClassName?: string;
  /** Itens extras renderizados depois dos links (ex.: o link de Blog, que cruza zona). */
  children?: React.ReactNode;
};

export function NavList({ items, className, linkClassName, children }: Props) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.key ?? item.href}>
          <a
            href={item.href}
            aria-current={item.current ? 'page' : undefined}
            className={`${linkClassName ?? ''} ${focusRing}`}
          >
            {item.label}
          </a>
        </li>
      ))}
      {children}
    </ul>
  );
}
