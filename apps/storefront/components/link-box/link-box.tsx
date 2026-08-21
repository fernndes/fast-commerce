import Link from 'next/link';
import type { ReactNode } from 'react';

// Um link que embrulha qualquer coisa (imagem, texto, card inteiro) — ver ADR
// 0019 (adr/0019-linkbox-primitivo-de-link-generico.md).
//
//   <LinkBox href="/categorias/alimentacao">
//     <Image ... />
//   </LinkBox>

/** `https:`, `mailto:`, `tel:` — qualquer esquema, mais o protocol-relative. */
const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');

type LinkBoxProps = {
  href: string;
  children: ReactNode;
  /** Nome acessível. Só para filho sem texto — ver ADR 0019. */
  label?: string;
  className?: string;
  /** Repassado ao `<Link>`; ignorado em link externo — ver ADR 0011 e ADR 0019. */
  prefetch?: boolean;
};

export function LinkBox({ href, children, label, className = '', prefetch }: LinkBoxProps) {
  const classes = `group block focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`;

  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={prefetch} aria-label={label} className={classes}>
      {children}
    </Link>
  );
}
