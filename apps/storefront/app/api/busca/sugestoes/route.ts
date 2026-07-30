import type { NextRequest } from 'next/server';

import { getSuggestions } from '@/lib/catalog';

/**
 * Autocomplete do campo de busca do header. O consumidor é a ilha client
 * `<SearchSuggestions>` — é o único jeito de o browser alcançar o catálogo,
 * que só existe no servidor.
 *
 * `force-dynamic` pelo mesmo motivo de `/api/produtos`: a resposta é função da
 * query string. Sem `revalidate` no arquivo — os dois não convivem.
 */
export const dynamic = 'force-dynamic';

const LIMIT = 8;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  // `q` ausente, vazio ou de 1 letra devolve lista vazia, não 400: digitar a
  // primeira letra é estado NORMAL de um autocomplete, não erro do cliente. O
  // corte por tamanho mínimo vive em `getSuggestions`, junto com a busca.
  const suggestions = await getSuggestions(q, LIMIT);

  return Response.json({ suggestions });
}
