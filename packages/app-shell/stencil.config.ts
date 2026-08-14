import { reactOutputTarget } from '@stencil/react-output-target';
import type { Config } from '@stencil/core';

/*
 * UM projeto Stencil para toda a casca (header + footer), não um por componente.
 *
 * Por quê: `dist-hydrate-script` gera um "hydrate app" — um runtime Stencil
 * completo com seu próprio registro de componentes. Dois hydrate apps vivendo no
 * MESMO processo Node disputam estado: dentro do servidor do Next, o primeiro
 * request renderizava os dois corretamente e, a partir do segundo, o
 * `renderToString` do header devolvia a tag crua (sem `class="hydrated"`, sem
 * `<template shadowrootmode>`), derrubando a página em 500. Com só um dos dois
 * componentes no layout, o mesmo código roda indefinidamente sem erro.
 *
 * Um projeto = um hydrate app = o conflito deixa de existir por construção.
 *
 * O que isso custa: header e footer passam a ter um ciclo de release comum no
 * lado do SSR (um pacote, uma versão). O desacoplamento que importa — publicar
 * a casca sem redeploy das zonas — continua intacto, porque ele vem do bundle
 * client servido em runtime por `apps/app-components`, não do pacote NPM.
 * Ver ADR 0003.
 */
export const config: Config = {
  namespace: 'app-shell',
  srcDir: 'src',
  outputTargets: [
    // Loader lazy: um único `app-shell.esm.js` que carrega o chunk de cada
    // componente sob demanda. É ESTE diretório inteiro que vai para o CDN — os
    // chunks `p-*.js` são importados por caminho relativo, então publicar só o
    // arquivo de entrada quebra a hidratação (era exatamente o bug anterior).
    {
      type: 'dist',
    },
    {
      type: 'dist-custom-elements',
      externalRuntime: false,
    },
    // Um único hydrate app para os dois componentes — ver o bloco acima.
    {
      type: 'dist-hydrate-script',
      dir: './dist/hydrate',
    },
    reactOutputTarget({
      componentCorePackage: '@repo/app-shell',
      hydrateModule: '@repo/app-shell/hydrate',
      clientModule: '@repo/app-shell/react/client',
      outDir: './react',
      serializeShadowRoot: 'declarative-shadow-dom',
      includeDefineCustomElements: false,
    }),
  ],
};
