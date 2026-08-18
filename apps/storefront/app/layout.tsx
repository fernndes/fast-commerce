import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@next/third-parties/google'
import { AppFooter } from '@repo/ui-patterns/app-footer';
import { AppHeader } from '@repo/ui-patterns/app-header';

import "./globals.css";

import { getCategoryTree, getFeaturedCategories } from "@/lib/categories";

/*
 * Aqui existia um `semContagem()` que removia o campo `count` de ~34 categorias
 * antes de passá-las ao header. Ele foi REMOVIDO junto com o Stencil (ADR 0004),
 * e o motivo é a diferença central do novo desenho.
 *
 * O `<AppHeader>` era Client Component, e prop de Client Component atravessa
 * SERIALIZADA no payload RSC — tudo que fosse passado ia no payload de toda
 * página, além de já estar no HTML do menu. Cortar `count` (que o header não lê)
 * era como se pagava menos por isso.
 *
 * Como Server Component, os dados são consumidos NO SERVIDOR e nunca são
 * serializados. Não há payload a economizar, e a árvore vai inteira — inclusive
 * o `count`, que o header continua ignorando.
 *
 * A condição para isso continuar verdadeiro: as colunas de categoria chegam ao
 * único Client Component da casca (`MobileMenuAutoClose`) como `children`, não
 * como prop de dados. Passá-las como prop traria a árvore de volta ao payload,
 * silenciosamente.
 */

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
   * layout, e o header recebe pronto. Ver ADR 0004.
   *
   * `Promise.all` porque as duas leituras são independentes; as duas caem no
   * mesmo cache de módulo de `lib/categories.ts`, então isto não dobra trabalho.
   *
   * Sem `try/catch` de propósito: sem categorias não existe storefront
   * navegável, e mascarar a falha aqui esconderia um catálogo quebrado atrás de
   * um header pela metade. Fail loud — ver ADR 0010.
   *
   * Aqui existia um `ShellBoundary` em volta do header e do footer. Ele foi
   * REMOVIDO porque não fazia o que prometia: error boundary é mecanismo de
   * cliente, e `<AppHeader>` é Server Component — o throw acontece no passe RSC,
   * que termina antes de o boundary existir. Medido: rota estática quebrava o
   * build, rota dinâmica devolvia 500 com `<body>` vazio, COM o boundary no
   * lugar. Pior, os fallbacks eram props de Client Component e iam serializados
   * no payload de toda página. Quem cobre este caso hoje é o
   * `app/global-error.tsx`. Ver ADR 0004.
   */
  const [departamentos, destaques] = await Promise.all([
    getCategoryTree(),
    getFeaturedCategories(),
  ]);

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
        <AppHeader
          activeZone="storefront"
          departments={departamentos}
          featuredCategories={destaques}
        />
        {/* Alvo do skip link — ver ADR 0009 (adr/0009-fronteira-server-client-e-acessibilidade.md). */}
        <div id="conteudo" className="flex flex-1 flex-col">
          {children}
        </div>
        <AppFooter />
        <SpeedInsights />
      </body>
    </html>
  );
}
