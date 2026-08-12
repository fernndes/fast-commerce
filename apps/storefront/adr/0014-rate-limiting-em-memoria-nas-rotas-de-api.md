# ADR 0014 — Rate limiting em memória nas rotas de API

- **Status:** aceito
- **Data:** 2026-08-12
- **Contexto:** `apps/storefront`

## Contexto

As duas rotas de API do storefront aceitavam requisições sem qualquer limite:
`app/api/produtos/route.ts` e `app/api/busca/sugestoes/route.ts`, ambas
`force-dynamic`. As duas são caras por request: `listProducts`
(`lib/catalog.ts`) faz `applyFilters + applySort + paginate` numa varredura
linear sobre os 10k produtos em memória; `getSuggestions` varre o catálogo
até o `limit`. A única contenção existente era o debounce de 200ms no cliente
(`components/header/search-suggestions.tsx`) — que roda no browser e é
trivialmente contornável com `curl`. Um flood satura CPU de função serverless
e infla o billing, inclusive do Sentry (ver
[[0003-observabilidade-com-sentry]]), que estava com `tracesSampleRate: 1`.

Este ADR é a contraparte de `apps/storefront` do ADR de raiz do repo
(`docs/adr/0002-rate-limit-em-memoria-nas-rotas-de-api.md`). O ADR de raiz
documenta o design da `lib/rate-limit.ts`; este documenta as restrições do
Next 16.2.12 que moldaram o design e onde a checagem foi colocada.

## Decisão

### 1. Restrições do Next 16.2.12 que moldam o desenho

Verificado nos docs de `node_modules/next/dist/docs/`:

- `middleware.ts` não existe mais — foi renomeado para `proxy.ts`
  (`proxy.md:11`). Os docs avisam que `proxy` "should not attempt relying on
  shared modules or globals" (`proxy.md:19`) — exatamente o oposto do que um
  contador em memória precisa.
- `NextRequest.ip` e `.geo` foram removidos no v15
  (`next-request.md:123`). O IP tem que sair dos headers do request
  (`x-forwarded-for` ou `x-real-ip`).
- Route Handlers rodam como lambdas e "cannot share data between requests"
  entre instâncias (`backend-for-frontend.md:922-927`).

Essas três restrições em conjunto determinam que a checagem fica nos **route
handlers**, não em `proxy.ts`, e que o contador vive em memória de processo —
não em `proxy.ts` e não em store compartilhado externo.

### 2. Contador em memória — decisão consciente com limitação declarada

`lib/rate-limit.ts` implementa um store em memória de processo, sem
dependência nova. Em serverless, cada instância tem seu próprio contador:
sob escala horizontal o teto efetivo é `N × 100/min`, não 100/min global.

Isso **atenua** abuso concentrado (um atacante em poucas instâncias é barrado)
mas **não é um limite global preciso**. O trade-off é deliberado: zero
dependências, zero env vars, zero round-trip de rede por request.

A assinatura de `checkRateLimit` é desenhada para que trocar por Upstash ou
Vercel KV depois seja um drop-in sem tocar nos route handlers:

```ts
export async function checkRateLimit(request: Request): Promise<RateLimitResult>;
```

`async` mesmo sendo síncrona por dentro — é a forma que permite substituir
por um store de rede (Redis, KV) sem mudar os callers.

### 3. Algoritmo — janela deslizante, não janela fixa

`Map<string, number[]>`: chave = IP, valor = timestamps dos hits dentro da
janela. Com janela fixa por minuto de relógio, 100 requests em `:59` e mais
100 em `:00` passariam — 200 em dois segundos. A janela deslizante fecha
esse edge case.

Dois mecanismos de contenção de memória evitam que o `Map` cresça sem
limite:

- **Sweep preguiçoso**: quando `now - lastSweep > WINDOW_MS`, varrer o Map
  e deletar as chaves cujo hit mais recente já saiu da janela. Custo
  amortizado, sem `setInterval` (que manteria o processo vivo e não
  sobreviveria a um lambda com ciclo de vida curto).
- **Backstop**: se após o sweep `map.size > MAX_KEYS` (10.000), limpar o
  Map inteiro. Prefere-se resetar (fail-open, perde-se um minuto de
  contagem) a crescer sem teto sob um flood distribuído de IPs distintos.

### 4. Extração de IP — premissa de segurança explícita

`x-forwarded-for` (primeira entrada, antes da primeira vírgula) →
`x-real-ip` → `'unknown'`. O leftmost do `x-forwarded-for` é o cliente
real quando existe um proxy confiável na frente — que é o caso na Vercel,
onde a plataforma reescreve o header. Sem esse proxy o header é forjável.
O docblock de `lib/rate-limit.ts` documenta essa premissa explicitamente
porque toda a eficácia do mecanismo depende dela.

O fallback `'unknown'` agrupa todos os requests sem header de IP num único
bucket — na prática, `next dev` local. O limite de 100/min ainda é folgado
para desenvolvimento.

### 5. Checagem antes de qualquer parse ou I/O

A checagem de `checkRateLimit` é a primeira linha de `GET` nos dois handlers,
antes do parse da query string. Um flood de requests inválidos ainda pagaria
CPU de parsing se o 400 de validação viesse primeiro.

### 6. Headers IETF `RateLimit-*` em todas as respostas

`checkRateLimit` devolve `{ rateLimited, headers }` com os campos do draft
IETF: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (segundos
até liberar) e `Retry-After` quando `rateLimited` é `true`. Os headers são
propagados tanto nas respostas 429 quanto nas 200/400 — um cliente
bem-comportado pode ver quanto orçamento resta antes de bater no teto. A
montagem é centralizada no helper para as duas rotas não divergirem.

### 7. Limite de 100/min — valor provisório, não medido

O `LIMIT = 100` é o ponto de partida generoso que não bloqueia nenhum usuário
legítimo (o debounce de 200ms mantém o volume real muito abaixo disso) e
barra abuso óbvio. O valor correto depende do ponto de ruptura real das
rotas, que só o teste de carga (k6) revelará. O número deve ser revisado
após o baseline de carga estar estabelecido.

### 8. Proteção DDoS já existente, independente deste rate limit

A Vercel oferece mitigação DDoS automática em todos os planos, incluindo o
Hobby — este rate limit e a mitigação da Vercel são camadas complementares:
a Vercel trata o ataque volumétrico de rede; o rate limit em código trata o
abuso de aplicação (flood nas rotas caras de catálogo). Rate limiting
configurável no edge (WAF da Vercel) é um recurso de plano pago, não
disponível no Hobby.

## Consequências

**Positivas**

- Flood de requests nas rotas caras é barrado antes de consumir CPU de
  parsing ou I/O de catálogo.
- Zero dependência nova — nenhuma variável de ambiente, nenhum serviço externo.
- A assinatura `async` do helper permite migrar para store externo (Upstash,
  Vercel KV) sem tocar nos route handlers.
- Headers `RateLimit-*` permitem ao cliente adaptar o comportamento antes do
  429.

**Negativas / limitações aceitas**

- O teto efetivo sob múltiplas instâncias serverless é `N × 100/min`, não
  100/min global — não é um rate limit preciso, é uma atenuação de abuso
  concentrado.
- O backstop de `MAX_KEYS` é fail-open: sob flood distribuído com muitos IPs
  distintos, o Map enche e é limpo, perdendo um minuto de contagem — exatamente
  o cenário de ataque mais sofisticado. Este mecanismo não é defesa contra
  DDoS distribuído.
- O limite de 100/min é arbitrário (não medido). Deve ser revisado após o
  baseline de teste de carga.
- O fallback `'unknown'` agrupa todo request sem IP no mesmo bucket — em
  desenvolvimento local, um único desenvolvedor esgota o limite ao testar o
  endpoint 100 vezes.

## Alternativas descartadas

| Alternativa | Por quê não |
| --- | --- |
| Rate limiting em `proxy.ts` | Os docs do Next 16 avisam explicitamente que `proxy.ts` não deve tentar usar módulos ou globals compartilhados — exatamente o que um contador em memória precisa. |
| Vercel KV / Upstash para contador global | Zero dependências, zero env vars e zero round-trip por request foi o critério de corte para a implementação inicial; a assinatura `async` deixa a porta aberta para migrar sem tocar nos handlers. |
| WAF da Vercel (rate limiting de edge) | Recurso de plano pago, indisponível no Hobby — confirmado na documentação de pricing da Vercel. |
| Janela fixa por minuto de relógio | Permite 200 requests em 2 segundos no edge da janela (100 em `:59` + 100 em `:00`) — a janela deslizante fecha esse edge case sem custo significativo. |
