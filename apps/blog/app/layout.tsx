import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google';
import { AppFooter } from '@repo/ui-patterns/app-footer';
import { AppHeader } from '@repo/ui-patterns/app-header';
import { getCategoryTree, getFeaturedCategories } from '@repo/nav';
import { SpeedInsights } from '@vercel/speed-insights/next';

import './globals.css';

import { SITE_URL } from '@/lib/site';

/*
 * Layout da zona blog. Espelha o do storefront de propósito — mesma fonte, mesmo
 * skip link, mesmo header/footer, mesmo container de GTM.
 *
 * A não-obviedade da Etapa 7: "projeto separado" NÃO significa "consent separado"
 * nem "container separado".
 *
 * Atravessar do storefront para o blog é hard navigation — documento novo — então
 * o `<GoogleTagManager>` precisa ser MONTADO nas duas zonas; não há SPA que
 * carregue o script uma vez só. Mas o container é o MESMO (`GTM-W48GGZQP`), e
 * como as zonas compartilham a origem (o storefront reproxeia `/blog` sob o
 * mesmo domínio), o cookie de consent gravado pelo Silktide vale nas duas. O
 * usuário não vê o banner duas vezes.
 *
 * Montar um container diferente aqui, ou não compartilhar a origem, seria o bug.
 * Ver Blog-0004 e os ADRs 0001/0015/0016 do storefront.
 */

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Base das URLs relativas de `alternates.canonical` e OpenGraph. Aponta para o
  // DOMÍNIO PÚBLICO (o host), nunca para a URL de deploy do blog — ver
  // `lib/site.ts` e Blog-0005. Sem isto o Next resolveria canônicas contra
  // `localhost` e avisaria no build.
  metadataBase: new URL(SITE_URL),

  // `%s` é preenchido pelo `title` de cada post; a listagem usa o `default`.
  title: {
    default: 'Blog — Fast Commerce',
    template: '%s — Blog Fast Commerce',
  },
  description: 'Conteúdo editorial sobre nutrição, comportamento e saúde animal.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Mesmo container do storefront — um container, duas zonas. */}
      <GoogleTagManager gtmId="GTM-W48GGZQP" />
      <head>
        <link rel="preconnect" href="https://dummyimage.com" crossOrigin="" />
        {/*
          A casca NÃO carrega mais script nenhum. Header e footer são Server
          Components de `@repo/ui-patterns`: chegam como HTML, sem runtime, sem
          bundle em CDN e sem a exceção de `script-src` que isso exigia na CSP.
          Ver ADR 0004.
        */}
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-[var(--background)] focus:px-4 focus:py-2 focus:outline-2"
        >
          Pular para o conteúdo
        </a>
        {/*
          O header é o MESMO do storefront, com mega menu e barra de destaques —
          não existe mais uma versão reduzida para o blog. Ele exige a navegação
          por categorias, e o blog não tem catálogo: quem serve os dois é
          `@repo/nav`, a fonte única de navegação (ver ADR 0004).

          Isto NÃO faz o blog carregar o catálogo. `@repo/nav` é uma projeção
          pequena, materializada em build time a partir do dump de produtos —
          import estático, sem `fs` e sem os 13 MB de `big.json`.
        */}
        <AppHeader
          activeZone="blog"
          departments={getCategoryTree()}
          featuredCategories={getFeaturedCategories()}
        />
        {/* Alvo do skip link — ver ADR 0009 do storefront. */}
        <div id="conteudo" className="flex flex-1 flex-col">
          {children}
        </div>
        <AppFooter />
        {/*
          RUM da zona. Sob Multi-Zones o script e o endpoint de vitals
          (`/_vercel/insights/*`) são resolvidos contra o DOMÍNIO, e o domínio
          pertence ao projeto host (o storefront) — o host só reproxeia `/blog*`
          e `/blog-static*`. Ou seja: os Web Vitals do blog chegam no dashboard
          do storefront, identificados pela rota (`/blog`, `/blog/[slug]`).

          Isso não é um defeito a contornar, é o que a Etapa 10 pede: os dois
          conjuntos no MESMO painel, separados por rota, é exatamente o que
          permite contrastar LCP de storefront vs. blog lado a lado e provar que
          a travessia de zona não degrada Web Vitals.

          Redirecionar as métricas para o projeto do blog exigiria um rewrite de
          `/blog-static/_vercel/*` para o `/_vercel/*` interno — combinação que o
          Next proíbe, porque `basePath: false` não vale para destino interno.
          Registrado em Blog-0007.

          Ressalva: um preview do blog aberto direto na URL da Vercel (fora do
          host) reporta para o projeto do blog. Números de preview e de produção
          não são comparáveis entre si.
        */}
        <SpeedInsights />
      </body>
    </html>
  );
}
