'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * `false` no HTML servido, `true` depois da hidratação.
 *
 * Os controles dos carrosséis (setas, dots, pause) só funcionam com JS, então
 * não devem existir no HTML antes do JS existir — sem botões mortos, e sem
 * ocupar espaço no primeiro paint.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
