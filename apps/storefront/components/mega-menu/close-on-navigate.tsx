'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Ilha client mínima, ilha irmã (ver ADR 0001, raiz) — ver ADR 0017
// (adr/0017-mega-menu-css-puro-group-hover-focus-within.md), §4.
export function CloseOnNavigate({ targetId }: { targetId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (target instanceof HTMLDetailsElement) target.open = false;
  }, [targetId, pathname]);

  return null;
}
