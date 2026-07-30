'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Ilha client mínima, no mesmo padrão do ADR 0001: ela é **irmã** do elemento
 * que controla e o acha por `getElementById` — não envolve nada, então nenhum
 * conteúdo atravessa a fronteira server/client.
 *
 * Existe por um motivo só: numa transição client-side o header persiste, então
 * um `<details open>` continuaria aberto por cima da página nova. Não há como
 * fechar isso em CSS — é a única coisa no menu que realmente precisa de JS.
 *
 * Não renderiza nada (`null`): zero markup no HTML, zero espaço no primeiro
 * paint, e nada quebra se a hidratação nunca acontecer — o `<details>` continua
 * abrindo e fechando pelo comportamento nativo do browser.
 */
export function CloseOnNavigate({ targetId }: { targetId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (target instanceof HTMLDetailsElement) target.open = false;
  }, [targetId, pathname]);

  return null;
}
