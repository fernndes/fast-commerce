import { focusRing } from '../tokens';

// `<ul>` de links, reaproveitado por header e footer — ver ui-0001
// (adr/0001-primitivas-sem-shadow-dom-tokens-como-classes.md), §3.

export type NavLink = {
  href: string;
  label: string;
  /** Chave estável. Sem ela, o `href` serve — é único dentro de uma lista. */
  key?: string;
  /** `true` marca a página atual; `undefined`/`false` omite o atributo — ver ui-0001, §3. */
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
