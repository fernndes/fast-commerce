# ADR 0004 — Sanitização (não validação) do termo de busca

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

O termo de busca (`q`) chega como texto livre digitado por pessoas, em três
pontos: `app/api/produtos/route.ts` (via `parseProductQuery`), `app/api/
busca/sugestoes/route.ts` (autocomplete) e `app/busca/page.tsx` (a página
server-rendered). O resto de `lib/query.ts` segue uma política estrita —
parâmetro presente e inválido é erro 400 — mas aplicar essa política a `q`
rejeitaria buscas legítimas só por terem espaço duplo ou serem longas
demais. Era necessário decidir: rejeitar `q` "estranho" ou normalizá-lo.

## Decisão

### 1. `sanitizeSearchTerm` normaliza, não valida

`lib/query.ts:33-55`:

```ts
const MAX_QUERY_LENGTH = 100;

export function sanitizeSearchTerm(raw: string): string | undefined {
  const cleaned = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  return cleaned ? cleaned : undefined;
}
```

Três operações, nesta ordem: remove caracteres Unicode das categorias
"Control" e "Format" (`\p{Cc}\p{Cf}` — inclui bytes de controle, espaços de
largura zero e caracteres de override de direção de texto como U+202E);
colapsa sequências de espaço em um único espaço; corta em 100 caracteres.
Vazio após a limpeza vira `undefined`, tratado como ausência do parâmetro —
não como erro.

Contraste deliberado com o resto do arquivo: em vez de recusar um valor
estranho com 400, ele é higienizado silenciosamente.

### 2. Fiação nas duas rotas — separada, não compartilhada por acidente

`app/api/produtos/route.ts` recebe `q` indiretamente, via
`parseProductQuery` → `searchTermParam` → `sanitizeSearchTerm`.

`app/api/busca/sugestoes/route.ts` chama a função diretamente, porque esse
endpoint nunca retorna 400 — `q` ausente, vazio ou de uma letra é um estado
normal de autocomplete, que deve devolver lista vazia:

```ts
const raw = request.nextUrl.searchParams.get('q');
const q = raw ? (sanitizeSearchTerm(raw) ?? '') : '';
const suggestions = await getSuggestions(q, LIMIT);
```

Os dois commits que implementaram isso (`53325c3` e `c4cb24b`, dois minutos
de diferença, ambos 2026-08-12) mostram que essa fiação separada não foi
óbvia de primeira: o primeiro commit exportou a função como privada do
módulo e só a conectou em `parseProductQuery` — cobrindo `/api/produtos` e,
por tabela, `/busca` (que usa o mesmo parser). O endpoint de sugestões ficou
sem sanitização por essa janela, até o segundo commit exportar a função e
conectá-la diretamente na rota de sugestões.

### 3. Modelo de ameaça real (não é o que parece à primeira vista)

Rastreando `q` até `lib/catalog.ts`, ele nunca vira `new RegExp(...)` — só
alimenta `.includes()` e `.startsWith()` em `score()` e `getSuggestions()`.
Então:

- **Não é regex injection.** Não há como `q` alterar o comportamento de um
  matcher regex, porque nenhum é construído a partir dele.
- **Não é XSS clássico.** Não existe `dangerouslySetInnerHTML` reflentindo
  `q` em nenhum lugar (`app/busca/page.tsx`,
  `components/header/search-suggestions.tsx`); React escapa texto/atributos
  JSX por padrão, e `URLSearchParams` faz percent-encoding — um payload
  `<script>` já seria neutralizado mesmo sem esta sanitização.
- **O risco real é duplo:**
  1. **Custo algorítmico.** `score()` roda uma vez por token sobre até os
     10 mil produtos que sobrarem do filtro base (o mesmo scan caro
     descrito no ADR de rate limit da raiz). Sem teto de tamanho, um `q`
     arbitrariamente longo geraria dezenas/centenas de tokens, multiplicando
     o custo por request. O cap de 100 caracteres limita esse multiplicador
     a no máximo ~50 tokens (pior caso, um caractere cada) — complementa o
     rate limit por IP, que limita frequência de request mas não o custo de
     uma request individual.
  2. **Higiene de caracteres de controle/invisíveis** que sobrevivem além da
     resposta HTTP: o cabeçalho "Resultados para "…"" (`app/busca/page.tsx`),
     os links de paginação (`components/pagination/pagination.tsx`, que
     reconstrói `URLSearchParams` incluindo `q`), o `<input hidden>` do
     `SortSelect`, e potencialmente breadcrumbs/spans do Sentry — que roda
     com `tracesSampleRate: 1` (ver
     [[0003-observabilidade-com-sentry]]). Bidi-override e caracteres de
     controle nesses lugares corrompem logs e URLs copiadas por usuários,
     mesmo sem constituir um exploit.

## Consequências

**Positivas**

- Buscas legítimas com espaçamento estranho ou colado de outro lugar (com
  espaços não-quebráveis, por exemplo) continuam funcionando — a política é
  tolerante com o usuário final.
- Teto de 100 caracteres limita o custo por request de forma previsível,
  sem exigir nenhuma mudança no algoritmo de busca em `lib/catalog.ts`.
- Reduz a chance de caracteres de controle/invisíveis vazarem para UI, URLs
  compartilháveis e telemetria.

**Negativas / limitações aceitas**

- Normalizar em vez de rejeitar significa que um `q` malformado nunca vira
  sinal de abuso visível (nenhum 400, nenhum log de erro) — um scanner
  automatizado mandando lixo não aparece como tal nas métricas de erro,
  só teria efeito (se algum) no custo de CPU já mitigado pelo cap.
- O cap de 100 caracteres é arbitrário (não medido contra o comprimento
  real de nomes de produto no catálogo) — pode cortar uma busca legítima
  incomumente longa sem aviso ao usuário.
- A separação de fiação entre as duas rotas (parser compartilhado vs.
  chamada direta) significa que um terceiro consumidor futuro de `q` teria
  que lembrar de chamar `sanitizeSearchTerm` manualmente — não há um único
  ponto de entrada que garanta isso.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Rejeitar com 400 (mesma política do resto de `lib/query.ts`) | Buscas reais têm formatação inconsistente (espaço duplo, colado com espaço não-quebrável); rejeitar penalizaria usuários legítimos por um problema cosmético, documentado explicitamente no docblock da função. |
| Escapar caracteres especiais de regex | Não se aplica — `q` nunca é usado para construir um `RegExp`; a filtragem em `lib/catalog.ts` usa só `.includes()`/`.startsWith()`. |
| Sanitização única compartilhada num middleware/proxy central | Mesma razão já registrada no ADR de rate limit da raiz: o Next 16 desaconselha módulos/globals compartilhados em `proxy.ts`, e o projeto não tem esse arquivo — a sanitização fica nos route handlers, como o resto da validação de query. |
