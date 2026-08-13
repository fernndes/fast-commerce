# Blog-0003 — Conteúdo via faker em build time, seed fixa, `posts.json` lido por `fs`

- **Status:** aceito
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `scripts/generate-posts.ts`, `lib/posts.ts`

## Contexto

O blog precisa de 10.000 posts de mentira. A ferramenta óbvia é
`@faker-js/faker` — e ela é, ela própria, a lição de supply-chain que o plano de
segurança do storefront cita como motivo de `npm audit`, Dependabot e lockfile
pinado.

Usar justamente essa lib fecha o círculo, e obriga a fazer certo.

## Decisão

### 1. Faker é `devDependency` e roda **uma vez**, no build

Ele é importado em um único arquivo (`scripts/generate-posts.ts`), que gera
`data/posts.json`. Em produção o blog lê esse JSON por `fs` — exatamente o padrão
do ADR 0005 do storefront, onde `data/big.json` é o irmão mais velho deste
arquivo. **Faker nunca entra no bundle nem no servidor.**

### 2. Seed fixa, e a reprodutibilidade é verificada

`faker.seed(42)` antes de qualquer chamada. Confirmado na prática: duas execuções
seguidas produzem `posts.json` e `posts-index.json` com **hash SHA-256
idêntico**.

A janela de datas é ancorada em literais (`2019-01-01` a `2026-06-30`), não em
`faker.date.past()`. Medir a partir de "agora" faria o dataset mudar a cada
build e destruiria a reprodutibilidade — o ponto inteiro da seed.

Como o conteúdo é reproduzível byte a byte, os ~22 MB gerados **não são
versionados**: `npm run build` encadeia `generate:posts` antes do `next build`, e
qualquer máquina regenera o mesmo conteúdo. A seed é o que dispensa o commit.

### 3. Versão pinada + Dependabot

`@faker-js/faker` entra com versão **exata** (sem `^`), travada no lockfile. O
`.github/dependabot.yml` ganhou uma entrada para `/apps/blog` — os dois apps têm
lockfiles próprios (não há workspace na raiz), então a entrada do storefront não
alcançava o blog. Sem isso, o app que de fato usa faker seria o único não
vigiado. `npm audit`: 0 vulnerabilidades.

### 4. Slug é a identidade, e faker repete valores

Faker repete títulos. Dois títulos iguais gerariam duas URLs iguais e um post
ficaria inalcançável — por isso o gerador mantém um `Set` e desambigua com
sufixo numérico. `slug` é a chave do `bySlug`, a `key` do React e a URL da
página. Mesma decisão de identidade-por-slug do ADR 0005.

`verify-posts.ts` falha o build se houver colisão.

### 5. Camada de leitura: `fs` + memoização na promise

Cópia fiel do ADR 0005, pelas mesmas razões:

- **Nunca `import` de JSON grande.** Um `import` de 19 MB entra no grafo de
  módulos, é serializado no bundle do servidor e paga parse a cada cold start.
- **Memoizar a promise, não o resultado.** Duas rotas renderizando em paralelo
  chamariam `load()` duas vezes se o cache guardasse o valor resolvido.

`outputFileTracingIncludes` inclui `./data/posts.json`: sem isso o arquivo não é
empacotado no deploy e todo post vira 404 — a mesma pegadinha silenciosa que o
ADR 0005 registrou.

### 6. Fronteira de módulo: `lib/post-types.ts` vs `lib/posts.ts`

A ilha de virtualização é Client Component e precisa do tipo `PostSummary` e da
URL do índice. Se essas duas coisas morassem em `lib/posts.ts` — que abre
`node:fs` — importá-las do cliente arrastaria a camada de leitura de arquivo
para o bundle do browser. `lib/post-types.ts` é deliberadamente puro.

## Consequências

**Positivas**

- Faker fora do runtime e da árvore de dependências de produção.
- Conteúdo reproduzível byte a byte: diffs estáveis, e o slug fixo usado no
  `lighthouserc.js` existe em qualquer máquina.
- ~22 MB de artefato fora do git.
- A lição do episódio do faker aplicada à própria lib que a causou.

**Negativas / limitações aceitas**

- Todo build paga a geração dos 10.000 posts (~20 s) antes do `next build`.
- `data/posts.json` (19 MB) é parseado inteiro em memória no primeiro acesso de
  cada processo — mesma característica (e mesmo custo) do `big.json`.
- Mudar `SEED` reescreve o blog inteiro: todos os slugs mudam, e com eles as URLs
  já indexadas e o slug fixado no `lighthouserc.js`. A seed é, na prática, parte
  do contrato público do site.
- O conteúdo é lorem ipsum: serve para medir DOM, INP e payload, não para
  avaliar legibilidade real.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Faker em runtime | Colocaria a lib do episódio de supply-chain no servidor de produção — o oposto exato da lição. |
| `import posts from './posts.json'` | 19 MB no grafo de módulos e parse a cada cold start. Ver ADR 0005. |
| Versionar `posts.json` no git | ~22 MB de artefato derivado num repo, sem ganho: a seed fixa já garante a reprodução. |
| Sem seed | Conteúdo diferente a cada build: diff instável, e nenhuma URL de teste confiável no CI. |
| Um CMS ou banco | O projeto é read-only e estático por construção — é o que o torna a zona mais barata de escalar. |
