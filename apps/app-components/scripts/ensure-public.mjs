import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// A Vercel recusa um projeto estático sem `public/`. Este é o "build" do
// projeto: garantir que o diretório exista mesmo antes da primeira publicação
// da casca.
await mkdir(resolve('public/shell/latest'), { recursive: true });
