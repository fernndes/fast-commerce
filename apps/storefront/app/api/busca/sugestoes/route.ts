import type { NextRequest } from 'next/server';

import { getSuggestions } from '@/lib/catalog';
import { sanitizeSearchTerm } from '@/lib/query';
import { checkRateLimit } from '@/lib/rate-limit';

// Autocomplete do header. `force-dynamic` pelo mesmo motivo de `/api/produtos` — ver ADR 0006.
export const dynamic = 'force-dynamic';

const LIMIT = 8;

export async function GET(request: NextRequest) {
  const { rateLimited, headers } = await checkRateLimit(request);
  if (rateLimited) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429, headers });
  }

  const raw = request.nextUrl.searchParams.get('q');
  const q = raw ? (sanitizeSearchTerm(raw) ?? '') : '';

  // `q` curto/ausente devolve lista vazia, não 400 — ver ADR 0004.
  const suggestions = await getSuggestions(q, LIMIT);

  return Response.json({ suggestions }, { headers });
}
