import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@next/third-parties/google'
import { AppFooter, AppHeader } from '@repo/app-shell/react';

import "./globals.css";

import { ShellBoundary } from "@/components/shell/shell-boundary";
import { FallbackFooter, FallbackHeader } from "@/components/shell/shell-fallback";
import { appComponentScriptSrc } from "@/lib/app-components";
import { type Category, getCategoryTree, getFeaturedCategories } from "@/lib/categories";

/*
 * O header recebe os dados por prop, e prop de Client Component atravessa no
 * payload RSC — ou seja, tudo que for passado é serializado em TODA página,
 * além de já estar no HTML do menu. `count` é o único campo que o header não
 * lê (ele serve para a curadoria, em `lib/categories.ts`), então cortá-lo aqui
 * tira ~34 campos do payload de cada página sem mudar nada na tela.
 */
const semContagem = ({ slug, name, href }: Category) => ({ slug, name, href });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fast Commerce",
  description: "Loja de e-commerce otimizada para performance",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
   * A navegação por categorias é dado do catálogo DESTA zona, e o `<AppHeader>`
   * é compartilhado com o blog — ele não pode buscá-la. Então quem busca é o
   * layout, e o header recebe pronto. Ver ADR 0003.
   *
   * `Promise.all` porque as duas leituras são independentes; as duas caem no
   * mesmo cache de módulo de `lib/categories.ts`, então isto não dobra trabalho.
   *
   * Sem `try/catch` de propósito: sem categorias não existe storefront
   * navegável, e mascarar a falha aqui esconderia um catálogo quebrado atrás de
   * um header pela metade. Fail loud — ver ADR 0010. (O `ShellBoundary` cobre
   * outra coisa: falha ao RENDERIZAR a casca compartilhada.)
   */
  const [arvore, destaques] = await Promise.all([
    getCategoryTree(),
    getFeaturedCategories(),
  ]);

  const departamentos = arvore.map((dept) => ({
    ...semContagem(dept),
    children: dept.children.map(semContagem),
  }));

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
          <AppHeader
            activeZone="storefront"
            departments={departamentos}
            featuredCategories={destaques.map(semContagem)}
          />
        </ShellBoundary>
        {/* Alvo do skip link — ver ADR 0009 (adr/0009-fronteira-server-client-e-acessibilidade.md). */}
        <div id="conteudo" className="flex flex-1 flex-col">
          {children}
        </div>
        <ShellBoundary label="footer" fallback={<FallbackFooter />}>
          <AppFooter />
        </ShellBoundary>
        <SpeedInsights />
      </body>
    </html>
  );
}
