/**
 * Resolve o alias `@/` fora do Next.
 *
 * O checker importa `lib/query.ts` e `lib/categories.ts` para validar os links
 * com as MESMAS regras que a aplicação usa — mas esses módulos se importam
 * entre si por `@/lib/...`, que é invenção do `tsconfig.json` e o Node não
 * conhece. Sem este hook a alternativa seria reescrever o parser de query e a
 * lista de slugs dentro do script, e aí o checker poderia passar enquanto a
 * aplicação recusa a mesma URL — exatamente o tipo de divergência que ele
 * existe para pegar.
 *
 * Tipos em si o Node 22.18+ já remove sozinho; aqui só falta o alias.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let alvo = path.join(root, specifier.slice(2));
    // TypeScript importa sem extensão (`@/lib/catalog`); o Node exige uma.
    if (!path.extname(alvo)) alvo += '.ts';
    return nextResolve(pathToFileURL(alvo).href, context);
  }
  return nextResolve(specifier, context);
}
