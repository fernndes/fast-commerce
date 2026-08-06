import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleTagManager } from '@next/third-parties/google'

import "./globals.css";

import { Footer } from "@/components/footer/footer";
import { Header } from "@/components/header/header";

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
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-[var(--background)] focus:px-4 focus:py-2 focus:outline-2"
        >
          Pular para o conteúdo
        </a>
        <Header />
        {/* Alvo do skip link: o header tem ~40 links antes do conteúdo. */}
        <div id="conteudo" className="flex flex-1 flex-col">
          {children}
        </div>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}
