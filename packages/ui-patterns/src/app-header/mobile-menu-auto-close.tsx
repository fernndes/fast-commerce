'use client';

// O ÚNICO Client Component da casca inteira — categorias entram como
// `children`, nunca como prop de dados. Ver ADR 0004, raiz
// (docs/adr/0004-casca-como-componentes-react-em-workspace.md), seção
// "`closeMobileMenu` foi ISOLADO, não dropado".

export function MobileMenuAutoClose({
  children,
  ...rest
}: React.ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav
      {...rest}
      onClick={(event) => {
        const details = (event.target as HTMLElement | null)?.closest('a')?.closest('details');
        if (details) details.open = false;
      }}
    >
      {children}
    </nav>
  );
}
