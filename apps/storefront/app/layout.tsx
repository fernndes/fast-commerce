import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@next/third-parties/google'
import { AppFooter, AppHeader } from '@repo/app-shell/react';

import "./globals.css";

import { ShellBoundary } from "@/components/shell/shell-boundary";
import { FallbackFooter, FallbackHeader } from "@/components/shell/shell-fallback";
import { appComponentScriptSrc } from "@/lib/app-components";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <AppHeader activeZone="storefront" />
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
