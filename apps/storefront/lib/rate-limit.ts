/**
 * Rate limit por IP nas rotas de API. Teto de REQUESTS/minuto por IP: acima
 * dele o handler responde 429 (ver os route handlers em `app/api`).
 *
 * DECISÃO: contador em MEMÓRIA de processo, sem dependência externa. Em
 * serverless cada instância tem seu próprio Map, então sob escala horizontal
 * o teto efetivo é `N × LIMIT/min`, não `LIMIT/min` global. Isto ATENUA abuso
 * (um flood concentrado cai em poucas instâncias e é barrado) mas não é um
 * limite preciso nem auditável. O trade-off é deliberado: zero deps, zero env
 * vars, zero round-trip de rede por request. A assinatura é `async` e recebe
 * um `Request` justamente para que trocar o miolo por um store em rede
 * (Upstash/Vercel KV) depois seja um drop-in — nenhum route handler muda.
 *
 * PREMISSA DE SEGURANÇA: o IP vem de `x-forwarded-for`, que é forjável a menos
 * que haja um proxy confiável reescrevendo o header na frente. Na Vercel a
 * plataforma faz isso; fora dela (um servidor exposto direto), o header é
 * spoofável e este limite deixa de valer. Não use este módulo atrás de um
 * proxy que não sanitiza `x-forwarded-for`.
 */

const WINDOW_MS = 60_000;
const LIMIT = 100;

/**
 * Teto de chaves (IPs) retidas no Map. Sob flood distribuído com IPs forjados
 * o Map cresceria sem limite e vazaria memória no processo de vida longa; ao
 * cruzar este teto preferimos resetar tudo (fail-open, perde-se um minuto de
 * contagem) a crescer sem fim.
 */
const MAX_KEYS = 10_000;

/** Timestamps (ms) dos hits de cada IP dentro da janela corrente. */
const hits = new Map<string, number[]>();

/**
 * Sweep preguiçoso: sem `setInterval` (que manteria o processo vivo e não
 * sobrevive a uma lambda). Guardamos o último sweep e, no máximo uma vez por
 * janela, varremos o Map deletando IPs cujo hit mais recente já saiu da
 * janela. Custo amortizado.
 */
let lastSweep = Date.now();

function sweep(now: number): void {
  if (now - lastSweep <= WINDOW_MS) return;
  lastSweep = now;

  for (const [ip, timestamps] of hits) {
    const last = timestamps[timestamps.length - 1];
    if (last === undefined || now - last > WINDOW_MS) {
      hits.delete(ip);
    }
  }

  // Backstop: se ainda estourou o teto (flood distribuído dentro da janela),
  // zera. Melhor perder a contagem do que crescer sem limite.
  if (hits.size > MAX_KEYS) hits.clear();
}

/**
 * IP do cliente. `x-forwarded-for` pode ser uma lista `client, proxy1,
 * proxy2` — o cliente real é o PRIMEIRO item (leftmost), assumindo o proxy
 * confiável descrito no docblock do módulo. `x-real-ip` como alternativa.
 *
 * `'unknown'` agrupa num único bucket todo request sem header de IP — na
 * prática o `next dev` local. `LIMIT/min` continua folgado para
 * desenvolvimento.
 */
function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export type RateLimitResult = {
  rateLimited: boolean;
  /**
   * Headers `RateLimit-*` (draft IETF) prontos para anexar à resposta —
   * tanto no 429 quanto nas 2xx/4xx, para o cliente ver o orçamento restante.
   * Inclui `Retry-After` quando `rateLimited`.
   */
  headers: Record<string, string>;
};

/**
 * `async` de propósito: é a forma do exemplo do guia oficial
 * (`await checkRateLimit(request)`) e o que torna a troca por um store em rede
 * um drop-in. Recebe `Request` (não `NextRequest`) porque só lê headers.
 */
export async function checkRateLimit(request: Request): Promise<RateLimitResult> {
  const now = Date.now();
  sweep(now);

  const ip = clientIp(request);
  const windowStart = now - WINDOW_MS;

  const previous = hits.get(ip) ?? [];
  // Descarta hits que já saíram da janela deslizante.
  const recent = previous.filter((t) => t > windowStart);

  const rateLimited = recent.length >= LIMIT;
  if (!rateLimited) recent.push(now);
  hits.set(ip, recent);

  const remaining = Math.max(0, LIMIT - recent.length);
  // Segundos até o hit mais antigo sair da janela e liberar uma vaga.
  const oldest = recent[0];
  const resetSeconds =
    oldest === undefined ? 0 : Math.max(0, Math.ceil((oldest + WINDOW_MS - now) / 1000));

  const headers: Record<string, string> = {
    'RateLimit-Limit': String(LIMIT),
    'RateLimit-Remaining': String(remaining),
    'RateLimit-Reset': String(resetSeconds),
  };
  if (rateLimited) headers['Retry-After'] = String(resetSeconds);

  return { rateLimited, headers };
}
