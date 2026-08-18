# Blog-0008 — Header, footer e tokens duplicados na zona, em vez de `packages/ui`

- **Status:** superado para HEADER/FOOTER; ainda vigente para os TOKENS.

  O gatilho que esta ADR listou aconteceu — "o repositório adotar npm workspaces
  por outra razão" —, e a casca migrou. Header e footer vivem hoje em
  `packages/ui` + `packages/ui-patterns` e são Server Components (ver
  `docs/adr/0004-casca-como-componentes-react-em-workspace.md`); a previsão de
  que "o mega menu é CSS puro e Server Component, então atravessaria para o
  pacote sem arrastar JS" se confirmou palavra por palavra.

  O que NÃO migrou: os tokens de página (`--background`/`--foreground`) e as
  utilities `page-*` do `globals.css`, que continuam duplicados entre as zonas. O
  `packages/config` previsto aqui continua sendo o caminho, e continua pendente.
- **Data:** 2026-08-13
- **Contexto:** `apps/blog` — `components/header`, `components/footer`, `app/globals.css`

## Contexto

O usuário não pode sentir a fronteira de deploy. Header, footer e tokens visuais
precisam ser os mesmos nas duas zonas. O planejamento previa duas rotas:

1. Um pacote compartilhado (`packages/ui` + `packages/config`), recomendado
   **porque já é um monorepo** (`apps/*`).
2. Duplicar no blog, aceitando divergência com o tempo — o mesmo risco que o ADR
   0017 aceitou conscientemente para desktop/mobile.

## Decisão

**Duplicar**, contrariando a recomendação inicial do plano — e por um motivo
factual descoberto ao implementar.

**Este repositório não é um workspace.** Não existe `package.json` na raiz;
`apps/storefront` e `apps/blog` têm `package.json` e `package-lock.json`
próprios e instalam de forma completamente independente. "É um monorepo" é
verdade no sentido de "dois projetos no mesmo repo", não no sentido de npm
workspaces.

Sem workspaces, um `packages/ui` não é um pacote de configuração — é uma
migração: criar `package.json` na raiz, declarar workspaces, apagar e regerar os
dois lockfiles, reinstalar os dois apps e revalidar o build do storefront, que
está em produção. Isso é uma mudança estrutural no app existente, muito além do
que "criar a zona blog" pede, e com risco real para a loja.

Então o que foi feito:

- `app/globals.css` copia os tokens e utilitários do storefront **valor por
  valor** (mesmas cores, mesmo trilho de 80rem, mesma calha, mesmo
  `scroll-padding-top`).
- Header e footer são reescritos na zona, Server Components e zero JS, seguindo a
  convenção `<a>` cruza zona / `<Link>` fica dentro
  ([[0001-multi-zones-assetprefix-rewrites-e-navegacao]]).
- O footer do blog é uma versão **enxuta**: sem a árvore de categorias, que vem
  de `lib/categories.ts` e lê o catálogo. Arrastar o catálogo para cá só para
  desenhar um rodapé acoplaria a zona estática justamente ao dado que ela existe
  para não ter.

## Consequências

**Positivas**

- As duas zonas seguem 100% independentes: mudar o header do blog não exige
  rebuild do storefront, nem vice-versa.
- Nenhuma migração de estrutura de dependências num repo com app em produção.
- A zona blog não herda nenhuma dependência de dados do storefront.

**Negativas / limitações aceitas**

- **Header e footer vão divergir com o tempo.** É o risco que o ADR 0017 aceitou
  para desktop/mobile, agora aceito entre zonas — e aqui é mais grave, porque a
  tese do projeto é justamente que a fronteira seja invisível. Uma mudança de
  identidade visual no storefront precisa ser replicada aqui **à mão**, e nada
  avisa se não for.
- Os tokens de `globals.css` estão duplicados, com o mesmo risco.
- O mega menu (ADR 0017) não existe na zona blog: a navegação do header é
  reduzida a links diretos. A travessia é visualmente contínua, mas não idêntica.

## Quando reverter

Esta decisão deve ser revista assim que qualquer uma acontecer:

- o repositório adotar npm workspaces por outra razão;
- uma terceira zona entrar (aí a duplicação vira tripla e o custo inverte);
- a primeira divergência visual real for notada em produção.

O caminho continua sendo o do plano: `packages/ui` para header/footer e
`packages/config` para os tokens do Tailwind, aceitando o acoplamento de versão
como preço da continuidade visual. O mega menu é CSS puro e Server Component
(ADR 0017), então atravessaria para o pacote sem arrastar JS.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| `packages/ui` + workspaces agora | Exige migrar a estrutura de dependências de um repo com app em produção — muito além do escopo de criar a zona, e com risco para a loja. |
| Publicar o header como pacote npm privado | Toda a complexidade de versionar e publicar, para dois consumidores no mesmo repo. |
| Importar direto de `../storefront/components` | Fura o isolamento dos deploys: o build do blog passaria a depender do código da loja, e o "blast radius" separado deixaria de existir. |
| Copiar o footer inteiro, com a árvore de categorias | Acoplaria a zona estática ao catálogo — o dado que ela existe para não ter. |
