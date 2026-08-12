// Rate limit por IP, em memória de processo. Ver ADR 0002 da raiz,
// docs/adr/0002-rate-limit-em-memoria-nas-rotas-de-api.md.

const WINDOW_MS = 60_000;
const LIMIT = 100;

// Teto de chaves retidas no Map — fail-open sob flood distribuído. Ver ADR 0002 (raiz).
const MAX_KEYS = 10_000;

/** Timestamps (ms) dos hits de cada IP dentro da janela corrente. */
const hits = new Map<string, number[]>();

// Sweep preguiçoso, sem `setInterval` (não sobrevive a lambda) — ver ADR 0002 (raiz).
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

// IP via `x-forwarded-for` (primeiro item) com `x-real-ip`/`'unknown'` como
// fallback — ver ADR 0002 (raiz).
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

// `async` de propósito (drop-in para store em rede depois) — ver ADR 0002 (raiz).
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
