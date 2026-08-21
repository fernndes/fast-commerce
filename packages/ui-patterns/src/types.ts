// Formato dos dados de navegação que o header recebe por prop — o pacote não
// depende de uma zona. Ver ADR 0004, raiz
// (docs/adr/0004-casca-como-componentes-react-em-workspace.md).

export type NavCategory = {
  slug: string;
  name: string;
  href: string;
  count?: number;
};

export type NavDepartment = NavCategory & {
  children: NavCategory[];
};

export type NavZone = 'storefront' | 'blog';
