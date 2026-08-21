import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@next/third-parties/google'
import { AppFooter } from '@repo/ui-patterns/app-footer';
import { AppHeader } from '@repo/ui-patterns/app-header';

import "./globals.css";

import { getCategoryTree, getFeaturedCategories } from "@/lib/categories";

// Casca como Server Components — ver ADR 0004, raiz
// (docs/adr/0004-casca-como-componentes-react-em-workspace.md).

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
  // Busca no layout (não no pacote da casca), sem try/catch (fail loud) — ver
  // ADR 0004 (raiz) e ADR 0010 (adr/0010-navegacao-e-curadoria-editorial-fail-loud.md).
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
        {/* A casca não carrega script nenhum — ver ADR 0004 (raiz). */}
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
