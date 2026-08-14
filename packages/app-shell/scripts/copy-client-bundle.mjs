import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Publica o bundle CLIENT da casca em `apps/app-components/public/shell/`.
 *
 * Copia o DIRETÓRIO INTEIRO, não só o arquivo de entrada. O `app-shell.esm.js`
 * é um loader lazy: ele importa `./p-<hash>.js` por caminho relativo para
 * carregar o chunk de cada componente sob demanda. Publicar apenas o arquivo de
 * entrada — como a versão anterior deste script fazia — produz um script que
 * carrega e imediatamente falha ao buscar chunks que nunca foram para o CDN, e
 * a hidratação nunca acontece (o DSD do SSR continua visível, então a falha é
 * silenciosa em produção).
 *
 * Duas rotas, de propósito:
 * - `latest/` — o que as zonas consomem no dia a dia.
 * - `v/{versão}/` — snapshot imutável, para rollback e para testar uma versão
 *   nova numa zona só antes de promovê-la.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'dist', 'app-shell');
const publicDir = resolve(root, '..', '..', 'apps', 'app-components', 'public', 'shell');

const version = process.env.npm_package_version ?? '0.0.0';
const targets = [resolve(publicDir, 'latest'), resolve(publicDir, 'v', version)];

for (const target of targets) {
  // Limpa antes de copiar: os chunks têm hash no nome, então uma cópia
  // incremental acumularia lixo de versões antigas indefinidamente.
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}
