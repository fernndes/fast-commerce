import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google';
import { AppFooter, AppHeader } from '@repo/app-shell/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import './globals.css';

import { ShellBoundary } from '@/components/shell/shell-boundary';
import { FallbackFooter, FallbackHeader } from '@/components/shell/shell-fallback';
import { appComponentScriptSrc } from '@/lib/app-components';
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
          Bundle client da casca (header + footer), servido por `apps/app-components`
          em runtime — é o que permite a plataforma publicar uma versão nova sem
          redeploy desta zona. Ver ADR 0003.

          `crossOrigin="anonymous"`: `type="module"` é SEMPRE buscado em modo
          CORS, então a origem precisa responder `Access-Control-Allow-Origin`
          (configurado em `apps/app-components/vercel.json`). Declarar explícito
          evita falha silenciosa e dá erro legível no console.

          A regra `no-sync-scripts` não se aplica aqui: `type="module"` é adiado
          por especificação (equivale a `defer`), então não bloqueia o parser.
          Carregar via `next/script` traria o script para dentro do bundle da
          zona — exatamente o acoplamento que este desenho existe para evitar.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          type="module"
          crossOrigin="anonymous"
          src={appComponentScriptSrc('/shell/latest/app-shell.esm.js')}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-[var(--background)] focus:px-4 focus:py-2 focus:outline-2"
        >
          Pular para o conteúdo
        </a>
        <ShellBoundary label="header" fallback={<FallbackHeader />}>
          <AppHeader activeZone="blog" />
        </ShellBoundary>
        {/* Alvo do skip link — ver ADR 0009 do storefront. */}
        <div id="conteudo" className="flex flex-1 flex-col">
          {children}
        </div>
        <ShellBoundary label="footer" fallback={<FallbackFooter />}>
          <AppFooter />
        </ShellBoundary>
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
