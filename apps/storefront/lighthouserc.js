module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/produtos',
        'http://localhost:3000/produtos/racao-golden-adulto',
      ],
      numberOfRuns: 3, // média de 3 execuções — reduz ruído
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift':  ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time':      ['error', { maxNumericValue: 200 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};