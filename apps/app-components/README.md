# App Components

Projeto estatico para servir o bundle client dos Web Components de plataforma
(`@repo/app-shell`: `app-header` + `app-footer`).

Rotas publicadas:

- `/shell/latest/` — o que as zonas consomem no dia a dia
- `/shell/v/{version}/` — snapshot imutavel, para rollback e para testar uma
  versao nova numa zona so antes de promove-la

Cada rota contem o **diretorio inteiro** do loader lazy, nao so o arquivo de
entrada: `app-shell.esm.js` importa `./p-<hash>.js` por caminho relativo para
carregar o chunk de cada componente sob demanda. Publicar so a entrada gera um
script que carrega e falha ao buscar chunks inexistentes — e a falha e
silenciosa, porque o DSD vindo do SSR continua visivel e so a interatividade
some.

`vercel.json` responde `Access-Control-Allow-Origin: *` nos `.js`:
`<script type="module">` e SEMPRE buscado em modo CORS, entao sem esse header o
bundle nao carrega em producao.

## Desenvolvimento local

Depois de compilar o pacote Stencil, copie o bundle para `public/` e suba o
servidor estatico local:

```bash
npm run build:shell
npm run copy:app-components
npm run dev:app-components
```

Nas zonas, use `NEXT_PUBLIC_APP_COMPONENTS_ORIGIN=http://localhost:4300` para
carregar os scripts locais em vez da URL da Vercel. Os apps tem um atalho que
faz build + copia + `next dev`:

```bash
npm run dev:local-components
```
