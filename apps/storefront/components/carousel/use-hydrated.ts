'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

// `false` no HTML servido, `true` depois da hidratação — ver ADR 0001 (raiz).
export function useHydrated() {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
