import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Conteúdo gerado pelo faker no build — não é código-fonte.
    "data/**",
    "public/blog-data/**",
  ]),

  {
    /*
     * `no-html-link-for-pages` DESLIGADA nesta zona — e a razão é a arquitetura,
     * não conveniência. Ver Blog-0001.
     *
     * A regra assume um app só: se um `<a href>` aponta para um caminho que
     * parece uma rota, ela manda trocar por `<Link>`. Sob Multi-Zones essa
     * suposição se inverte. `/produtos`, `/carrinho` e `/` (a home do storefront)
     * NÃO são rotas deste projeto — são de outra zona, outro deploy. Atravessar
     * exige hard navigation, ou seja, exige `<a>`. Obedecer à regra aqui
     * produziria exatamente o bug que a convenção existe para evitar: `<Link>`
     * tentando prefetch e soft-nav de uma rota que este app não conhece,
     * falhando sem erro visível.
     *
     * Note que a regra chegou a apontar `<a href="/">` no header — o caso mais
     * traiçoeiro de todos, porque com `basePath: '/blog'` esse `/` é a home do
     * storefront, enquanto `<Link href="/">` seria `/blog`. Dois destinos
     * diferentes com o mesmo `href` escrito.
     *
     * O que substitui a regra: a convenção, documentada nos próprios componentes
     * — `<a>` cruza zona, `<Link>` fica dentro dela. Com duas rotas próprias
     * (`/` e `/[slug]`), o custo de não ter a checagem automática é pequeno; o
     * custo de segui-la seria navegação quebrada.
     */
    files: ["components/**/*.tsx", "app/**/*.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
