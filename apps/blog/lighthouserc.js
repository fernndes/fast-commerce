/*
 * Budget de performance da zona blog. Ver Blog-0007.
 *
 * Mesmo rigor e MESMOS NÚMEROS do storefront (`apps/storefront/lighthouserc.js`)
 * — é essa igualdade que dá sentido ao teste. A tese do projeto é que atravessar
 * a fronteira de deploy não degrada Web Vitals; afrouxar o budget aqui provaria
 * a tese por definição, não por medição.
 *
 * `next start` serve a zona isolada em `:3001`, sob o próprio `basePath`. Não há
 * storefront nem rewrite no meio: o que se mede é a zona, não o proxy.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start -- -p 3001',
      url: [
        // A listagem virtualizada: onde o índice de 10.000 e o windowing pesam.
        'http://localhost:3001/blog',
        // Um post pré-gerado no build (`generateStaticParams`) — ver Blog-0006.
        // Slug fixo porque a seed é fixa: com `faker.seed(42)` este post existe
        // em qualquer máquina. Se a seed mudar, este slug muda junto e o CI
        // acusa — o que é o comportamento certo, não um incômodo.
        'http://localhost:3001/blog/repellat-suscipit-expedita-laboriosam-consequuntur-occaecati',
      ],
      numberOfRuns: 3, // média de 3 execuções — reduz ruído
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        // O teto de TBT é o que segura a promessa do windowing: 10.000 itens em
        // memória não podem virar trabalho de main thread. Se a virtualização
        // regredir para "renderiza tudo", é aqui que aparece primeiro.
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
