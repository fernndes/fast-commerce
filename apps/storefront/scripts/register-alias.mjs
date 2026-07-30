/** Registra o `alias-hook` no loader do Node. Ver `scripts/alias-hook.mjs`. */
import { register } from 'node:module';

register('./alias-hook.mjs', import.meta.url);
